// Server-side CRM internals: row visibility, the customer-history audit log, and
// workflow automation. NOT a "use server" module — nothing here may be callable
// directly from the client; only the guarded actions in sales-activity.ts / crm.ts use it.

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ForbiddenError, type SalesScope } from "@/lib/access-control";
import type { OppStage, TaskPriority } from "@/types/sales";

// ─── Ownership / visibility ──────────────────────────────────────────────────
// Same "self-only" model as the rest of the sales module: Administrator/Management
// (scope.canSeeAll) see everything; everyone else sees accounts they own or have an
// opportunity on, and only their own opportunities.

export function isMine(scope: SalesScope, ownerId: string | null | undefined, ownerName: string | null | undefined): boolean {
  if (scope.canSeeAll) return true;
  return (!!ownerId && ownerId === scope.userId) || (!!ownerName && ownerName === scope.userName);
}

export function mineOppWhere(scope: SalesScope): Prisma.SalesOpportunityWhereInput {
  return { OR: [{ ownerName: scope.userName }, { ownerId: scope.userId }] };
}

export function visibleCompanyWhere(scope: SalesScope): Prisma.SalesCompanyWhereInput {
  if (scope.canSeeAll) return {};
  return {
    OR: [
      { ownerName: scope.userName },
      { ownerId: scope.userId },
      { opportunities: { some: mineOppWhere(scope) } },
    ],
  };
}

export async function assertCompanyVisible(companyId: string, scope: SalesScope): Promise<void> {
  if (scope.canSeeAll) return;
  const hit = await db.salesCompany.findFirst({
    where: { id: companyId, ...visibleCompanyWhere(scope) },
    select: { id: true },
  });
  if (!hit) throw new ForbiddenError("You don't have access to this company");
}

export async function assertOppMine(opportunityId: string, scope: SalesScope): Promise<{ companyId: string }> {
  const opp = await db.salesOpportunity.findUnique({
    where: { id: opportunityId },
    select: { ownerName: true, ownerId: true, companyId: true },
  });
  if (!opp) throw new ForbiddenError("Opportunity not found");
  if (!isMine(scope, opp.ownerId, opp.ownerName)) {
    throw new ForbiddenError("You can only access your own opportunities");
  }
  return { companyId: opp.companyId };
}

// ─── Customer history (audit log) ────────────────────────────────────────────

export interface AuditInput {
  entityType: "company" | "opportunity" | "contact" | "note" | "task" | "lead";
  entityId: string;
  companyId?: string | null;
  opportunityId?: string | null;
  action: string;
  field?: string;
  oldValue?: unknown;
  newValue?: unknown;
}

function str(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

export async function recordAudit(scope: SalesScope, entries: AuditInput[]): Promise<void> {
  if (entries.length === 0) return;
  try {
    await db.salesAuditLog.createMany({
      data: entries.map((e) => ({
        entityType: e.entityType,
        entityId: e.entityId,
        companyId: e.companyId ?? null,
        opportunityId: e.opportunityId ?? null,
        action: e.action,
        field: e.field ?? "",
        oldValue: str(e.oldValue).slice(0, 2000),
        newValue: str(e.newValue).slice(0, 2000),
        userId: scope.userId,
        userName: scope.userName,
      })),
    });
  } catch (err) {
    // History is best-effort — never fail the user's save because the log write failed.
    console.error("[sales-audit] failed to record audit entries", err);
  }
}

/** One "updated" entry per tracked field whose value actually changed. */
export function diffAudit(
  base: Omit<AuditInput, "action" | "field" | "oldValue" | "newValue">,
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[],
): AuditInput[] {
  const out: AuditInput[] = [];
  for (const f of fields) {
    if (!(f in after)) continue;
    const a = str(before[f]);
    const b = str(after[f]);
    if (a !== b) out.push({ ...base, action: f === "stage" ? "stage_changed" : "updated", field: f, oldValue: a, newValue: b });
  }
  return out;
}

// ─── Workflow automation ─────────────────────────────────────────────────────
// Rules that run when an opportunity changes stage. Kept as data so the team can
// tune them without touching the stage-change code path.

interface StageRule {
  taskTitle: string;
  dueInDays: number;
  priority: TaskPriority;
}

export const STAGE_AUTOMATIONS: Partial<Record<OppStage, StageRule>> = {
  Qualifying:   { taskTitle: "Confirm budget, authority, need & timeline", dueInDays: 7, priority: "Normal" },
  Proposal:     { taskTitle: "Follow up on proposal",                        dueInDays: 7, priority: "Normal" },
  "Closed Won": { taskTitle: "Hand off to Operations and schedule kickoff",  dueInDays: 2, priority: "High" },
};

function addDays(days: number): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

/**
 * Called after an opportunity's stage has been persisted.
 *  - closes the previous stage's auto-generated follow-ups
 *  - creates the new stage's follow-up task for the opp owner
 *  - fills the opp's "next step" if the rep hasn't set one
 *  - promotes the account to Customer on Closed Won
 */
export async function runStageAutomation(
  scope: SalesScope,
  opp: { id: string; companyId: string; name: string; ownerId: string | null; ownerName: string; nextStep: string },
  fromStage: OppStage,
  toStage: OppStage,
): Promise<void> {
  if (fromStage === toStage) return;
  try {
    await db.salesTask.updateMany({
      where: { opportunityId: opp.id, autoGenerated: true, status: "Open" },
      data: { status: "Done", completedAt: new Date() },
    });

    const rule = STAGE_AUTOMATIONS[toStage];
    if (rule) {
      const due = addDays(rule.dueInDays);
      const task = await db.salesTask.create({
        data: {
          companyId: opp.companyId,
          opportunityId: opp.id,
          title: rule.taskTitle,
          dueDate: due,
          priority: rule.priority,
          assigneeId: opp.ownerId,
          assigneeName: opp.ownerName,
          createdById: null,
          createdByName: "Automation",
          autoGenerated: true,
        },
      });
      await recordAudit(scope, [{
        entityType: "task", entityId: task.id, companyId: opp.companyId, opportunityId: opp.id,
        action: "automation", field: "task", newValue: `${rule.taskTitle} (due ${due.toISOString().slice(0, 10)})`,
      }]);
      if (!opp.nextStep.trim() && toStage !== "Closed Won") {
        await db.salesOpportunity.update({
          where: { id: opp.id },
          data: {
            nextStep: rule.taskTitle,
            nextStepDate: due,
            nextStepOwnerId: opp.ownerId,
            nextStepOwnerName: opp.ownerName,
          },
        });
      }
    }

    if (toStage === "Closed Won" || toStage === "Closed Lost") {
      // A closed deal has no next step — clear it so it stops showing on agendas.
      await db.salesOpportunity.update({
        where: { id: opp.id },
        data: { nextStep: "", nextStepDate: null },
      });
    }

    if (toStage === "Closed Won") {
      const company = await db.salesCompany.findUnique({ where: { id: opp.companyId }, select: { accountStatus: true } });
      if (company && company.accountStatus !== "Customer") {
        await db.salesCompany.update({ where: { id: opp.companyId }, data: { accountStatus: "Customer" } });
        await recordAudit(scope, [{
          entityType: "company", entityId: opp.companyId, companyId: opp.companyId,
          action: "automation", field: "accountStatus", oldValue: company.accountStatus, newValue: "Customer",
        }]);
      }
    }
  } catch (err) {
    console.error("[sales-automation] stage automation failed", err);
  }
}
