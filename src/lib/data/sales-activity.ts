"use server";

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { syncCwOpportunity } from "@/lib/data/cw-sync";
import type {
  SalesCompany, SalesOpportunity, SalesActivity, SalesOppComment, SalesOppInvoice,
  CommissionTeamMember, OppInvoiceStatus, CompanyContact,
  ActivityType, OppStage,
} from "@/types/sales";
import { ACTIVITY_TYPES } from "@/types/sales";
import {
  toCompany, toOpp, toInvoice, toActivity, toCompanyContact, toStage, stageToDb,
  sanitizeAccountStatus, sanitizeForecast, clampProbability,
} from "@/lib/data/sales-mappers";
import {
  visibleCompanyWhere, mineOppWhere, recordAudit, diffAudit, runStageAutomation, refreshOppNextStep,
} from "@/lib/data/crm-internal";
import {
  resolveSalesScope,
  resolveSalesWriteScope,
  ForbiddenError,
  type SalesScope,
} from "@/lib/access-control";

// ─── Row-level ownership guards ──────────────────────────────────────────────
// Sales data is served via Server Actions (RPC endpoints), so "self-only" access
// must be enforced here on the server — non-admins may only read/modify records
// they own. Callers with canSeeAll (Administrator + Management) bypass these.

async function assertOwnsOpp(id: string, scope: SalesScope): Promise<void> {
  if (scope.canSeeAll) return;
  const opp = await db.salesOpportunity.findUnique({
    where: { id },
    select: { ownerName: true, ownerId: true },
  });
  if (!opp) throw new ForbiddenError("Opportunity not found");
  if (opp.ownerName !== scope.userName && opp.ownerId !== scope.userId) {
    throw new ForbiddenError("You can only access your own opportunities");
  }
}

async function assertOwnsActivity(id: string, scope: SalesScope): Promise<void> {
  if (scope.canSeeAll) return;
  const a = await db.salesActivity.findUnique({
    where: { id },
    select: { userName: true, userId: true },
  });
  if (!a) throw new ForbiddenError("Activity not found");
  if (a.userName !== scope.userName && a.userId !== scope.userId) {
    throw new ForbiddenError("You can only modify your own activities");
  }
}

async function assertOwnsComment(id: string, scope: SalesScope): Promise<void> {
  if (scope.canSeeAll) return;
  const c = await db.salesOppComment.findUnique({
    where: { id },
    select: { userName: true, userId: true },
  });
  if (!c) throw new ForbiddenError("Comment not found");
  if (c.userName !== scope.userName && c.userId !== scope.userId) {
    throw new ForbiddenError("You can only modify your own comments");
  }
}

async function assertCanSeeCompany(companyId: string, scope: SalesScope): Promise<void> {
  if (scope.canSeeAll) return;
  // Visible when the caller owns the account or has an opportunity on it.
  const hit = await db.salesCompany.findFirst({
    where: { id: companyId, ...visibleCompanyWhere(scope) },
    select: { id: true },
  });
  if (!hit) throw new ForbiddenError("You don't have access to this company");
}

// Financials (invoices/commission) are visible to the opp owner or a commission-team member.
async function assertCanAccessOppFinancials(opportunityId: string, scope: SalesScope): Promise<void> {
  if (scope.canSeeAll) return;
  const opp = await db.salesOpportunity.findUnique({
    where: { id: opportunityId },
    select: { ownerName: true, ownerId: true, commissionTeam: true },
  });
  if (!opp) throw new ForbiddenError("Opportunity not found");
  if (opp.ownerName === scope.userName || opp.ownerId === scope.userId) return;
  const team = Array.isArray(opp.commissionTeam) ? (opp.commissionTeam as Array<{ name?: string }>) : [];
  if (team.some((m) => m?.name === scope.userName)) return;
  throw new ForbiddenError("You don't have access to this opportunity's financials");
}

const VALID_ACTIVITY_TYPES = new Set<string>(ACTIVITY_TYPES);
function sanitizeType(t: string | undefined | null): ActivityType {
  if (t && VALID_ACTIVITY_TYPES.has(t)) return t as ActivityType;
  return "Other";
}

const COMPANY_AUDIT_FIELDS = ["name", "domain", "ownerName", "accountStatus", "territory", "vertical", "phone", "address"];
const OPP_AUDIT_FIELDS = [
  "name", "stage", "ownerName", "value", "closeDate", "probability", "forecastCategory",
  "leadSource", "rating", "companyId", "cwNumber",
];

// ─── Companies ────────────────────────────────────────────────────────────────

export async function getSalesCompanies(ownerName?: string): Promise<SalesCompany[]> {
  const scope = await resolveSalesScope("salesActivity");
  // Non-admins are pinned to their own records regardless of the client-supplied filter:
  // accounts they own or have an opp on, and only their own opps within them.
  const companyWhere = scope.canSeeAll
    ? (ownerName
        ? { OR: [{ ownerName }, { opportunities: { some: { ownerName } } }] }
        : undefined)
    : visibleCompanyWhere(scope);
  const oppWhere = scope.canSeeAll
    ? (ownerName ? { ownerName } : undefined)
    : mineOppWhere(scope);
  const rows = await db.salesCompany.findMany({
    orderBy: { createdAt: "desc" },
    where: companyWhere,
    include: {
      opportunities: {
        orderBy: { createdAt: "asc" },
        where: oppWhere,
      },
    },
  });
  return rows.map((r) => toCompany({
    ...r,
    opportunities: r.opportunities.map((o) => toOpp(o)),
  }));
}

export async function upsertSalesCompany(
  data: Omit<SalesCompany, "id" | "createdAt" | "updatedAt" | "opportunities"> & { id?: string }
): Promise<SalesCompany> {
  // Companies are shared across reps, so any sales member may add/edit them.
  const scope = await resolveSalesWriteScope("salesActivity");
  const existing = data.id ? await db.salesCompany.findUnique({ where: { id: data.id } }) : null;
  if (data.id && !existing) throw new ForbiddenError("Company not found");

  if (!existing && !scope.canSeeAll) {
    // Reps only see their own accounts, so an import or "Add company" can name a company
    // that already exists under another rep. Reuse it instead of creating a duplicate;
    // the rep gains visibility of the account only once they have a deal on it.
    const sameName = await db.salesCompany.findFirst({
      where: { name: { equals: data.name.trim(), mode: "insensitive" } },
    });
    if (sameName) return toCompany(sameName);
  }

  // Account ownership: management may assign anyone. A rep may claim an unowned
  // account (or create one, defaulting to themselves) but can't reassign someone else's.
  let ownerId = existing?.ownerId ?? null;
  let ownerName = existing?.ownerName ?? "";
  if (data.ownerName !== undefined) {
    const requested = { id: data.ownerId ?? null, name: data.ownerName ?? "" };
    const changing = requested.name !== ownerName || requested.id !== ownerId;
    if (changing) {
      if (scope.canSeeAll) {
        ownerId = requested.id;
        ownerName = requested.name;
      } else {
        const currentlyUnowned = !ownerName && !ownerId;
        const currentlyMine = ownerName === scope.userName || ownerId === scope.userId;
        const toSelfOrNobody = !requested.name || requested.name === scope.userName;
        if (!(currentlyUnowned || currentlyMine) || !toSelfOrNobody) {
          throw new ForbiddenError("Only management can reassign an account owned by someone else");
        }
        ownerId = requested.name ? scope.userId : null;
        ownerName = requested.name ? scope.userName : "";
      }
    }
  } else if (!existing && !scope.canSeeAll) {
    // Legacy callers (Activity Log, CW import) don't send an owner. A rep's new account
    // is theirs; a manager's bulk-created accounts stay unassigned until someone owns them.
    ownerId = scope.userId;
    ownerName = scope.userName;
  }

  const payload = {
    name: data.name,
    domain: data.domain.trim().toLowerCase(),
    notes: data.notes,
    dealDeskId: data.dealDeskId,
    ownerId,
    ownerName,
    ...(data.accountStatus !== undefined ? { accountStatus: sanitizeAccountStatus(data.accountStatus) } : {}),
    ...(data.territory !== undefined ? { territory: data.territory.trim() } : {}),
    ...(data.vertical !== undefined ? { vertical: data.vertical.trim() } : {}),
    ...(data.phone !== undefined ? { phone: data.phone.trim() } : {}),
    ...(data.address !== undefined ? { address: data.address.trim() } : {}),
  };
  const row = existing
    ? await db.salesCompany.update({ where: { id: existing.id }, data: payload })
    : await db.salesCompany.create({ data: payload });

  await recordAudit(scope, existing
    ? diffAudit({ entityType: "company", entityId: row.id, companyId: row.id }, existing, row, COMPANY_AUDIT_FIELDS)
    : [{ entityType: "company", entityId: row.id, companyId: row.id, action: "created", newValue: row.name }]);
  return toCompany(row);
}

export async function deleteSalesCompany(id: string): Promise<void> {
  const scope = await resolveSalesWriteScope("salesActivity");
  // Deleting a company cascades to every rep's opportunities/activities under it,
  // so it's restricted to admins/management.
  if (!scope.canSeeAll) throw new ForbiddenError("Only management can delete a company");
  const row = await db.salesCompany.delete({ where: { id } });
  await recordAudit(scope, [{ entityType: "company", entityId: id, companyId: id, action: "deleted", oldValue: row.name }]);
}

// ─── Owner name normalization ─────────────────────────────────────────────────
// Converts CW slug-style ownerNames (e.g. "jlazo") to full names ("Juan Lazo").
// Safe to call repeatedly — only updates rows where a slug match is found and
// the stored name differs from the resolved full name.
export async function normalizeOppOwnerNames(): Promise<number> {
  // Authenticated sales users only; the operation itself is a safe, idempotent slug fixup.
  await resolveSalesScope("salesActivity");
  const [users, opps] = await Promise.all([
    db.user.findMany({ select: { id: true, name: true } }),
    db.salesOpportunity.findMany({ select: { id: true, ownerName: true, ownerId: true } }),
  ]);

  function cwSlug(name: string) {
    const parts = name.trim().split(/\s+/);
    return parts.length < 2 ? name.toLowerCase() : (parts[0][0] + parts[parts.length - 1]).toLowerCase();
  }
  const bySlug = new Map(users.map((u) => [cwSlug(u.name), u]));

  let updated = 0;
  for (const opp of opps) {
    if (!opp.ownerName) continue;
    const looksLikeSlug = /^[a-z][a-z0-9]{1,15}$/.test(opp.ownerName);
    if (!looksLikeSlug) continue;
    const user = bySlug.get(opp.ownerName.toLowerCase());
    if (user && (user.name !== opp.ownerName || user.id !== opp.ownerId)) {
      await db.salesOpportunity.update({
        where: { id: opp.id },
        data: { ownerName: user.name, ownerId: user.id },
      });
      updated++;
    }
  }
  return updated;
}

// ─── Opportunities ────────────────────────────────────────────────────────────

export async function upsertSalesOpportunity(
  data: Omit<SalesOpportunity, "id" | "createdAt" | "updatedAt" | "company"> & { id?: string }
): Promise<SalesOpportunity> {
  const scope = await resolveSalesWriteScope("salesActivity");
  if (data.id) await assertOwnsOpp(data.id, scope);
  const stage = stageToDb(data.stage);
  // Non-admins can only ever own the opps they create/edit — they can't assign to other reps.
  const ownerId = scope.canSeeAll ? data.ownerId : scope.userId;
  const ownerName = scope.canSeeAll ? data.ownerName : scope.userName;
  const payload = {
    companyId: data.companyId,
    name: data.name,
    stage,
    ownerId,
    ownerName,
    value: data.value,
    notes: data.notes,
    closeDate: data.closeDate ? new Date(data.closeDate) : null,
    cwNumber: data.cwNumber ?? null,
    cwLink: data.cwLink ?? null,
    proposalCreatedAt: data.proposalCreatedAt ? new Date(data.proposalCreatedAt) : null,
    rating: data.rating ?? null,
    // CRM fields are optional on the wire; only touch them when the caller sent them.
    ...(data.probability !== undefined ? { probability: clampProbability(data.probability) } : {}),
    ...(data.forecastCategory !== undefined ? { forecastCategory: sanitizeForecast(data.forecastCategory) } : {}),
    ...(data.leadSource !== undefined ? { leadSource: data.leadSource.trim() } : {}),
  };

  // A new deal carrying a CW # is an import: route it through the ConnectWise sync so
  // re-imports update the existing deal instead of duplicating it. Edits to an existing
  // deal (data.id set) always save every field the user changed.
  if (!data.id && data.cwNumber) {
    const res = await syncCwOpportunity({
      cwNumber: data.cwNumber,
      companyId: data.companyId,
      name: data.name,
      stage: data.stage,
      ownerName: ownerName ?? "",
      ownerId: ownerId ?? null,
      value: data.value,
      closeDate: data.closeDate,
      proposalCreatedAt: data.proposalCreatedAt,
      rating: data.rating,
    });
    const row = res.id ? await db.salesOpportunity.findUnique({ where: { id: res.id } }) : null;
    if (!row) throw new ForbiddenError(res.reason ?? "Import skipped");
    return toOpp(row);
  }

  const before = data.id ? await db.salesOpportunity.findUnique({ where: { id: data.id } }) : null;
  const newCw = (data.cwNumber ?? "").trim() || null;
  const cwChanged = (before?.cwNumber ?? null) !== newCw;
  if (newCw && cwChanged) {
    const taken = await db.salesOpportunity.findFirst({
      where: { cwNumber: newCw, ...(before ? { id: { not: before.id } } : {}) },
      select: { id: true },
    });
    if (taken) throw new ForbiddenError(`ConnectWise #${newCw} is already linked to another deal`);
  }
  const row = before
    ? await db.salesOpportunity.update({
        where: { id: before.id },
        data: {
          ...payload,
          cwNumber: newCw,
          ...(before.stage !== stage ? { stageChangedAt: new Date() } : {}),
          // Re-pointing a deal at a different CW record starts its sync history over.
          ...(cwChanged ? { cwSnapshot: Prisma.DbNull, cwSyncedAt: null } : {}),
        },
      })
    : await db.salesOpportunity.create({ data: { ...payload, stageChangedAt: new Date() } });

  await recordAudit(scope, before
    ? diffAudit({ entityType: "opportunity", entityId: row.id, companyId: row.companyId, opportunityId: row.id }, before, row, OPP_AUDIT_FIELDS)
    : [{ entityType: "opportunity", entityId: row.id, companyId: row.companyId, opportunityId: row.id, action: "created", newValue: `${row.name} (${toStage(row.stage)})` }]);

  const fromStage = before ? toStage(before.stage) : null;
  const toStageVal = toStage(row.stage);
  if (fromStage !== toStageVal) {
    await runStageAutomation(scope, row, fromStage ?? "Prospecting", toStageVal);
  }
  if (data.nextStep !== undefined) await saveNextStepAsTask(scope, row, data);
  const fresh = await db.salesOpportunity.findUnique({ where: { id: row.id } });
  return toOpp(fresh ?? row);
}

// The deal editor's "Next action" is a task: editing the current next task (same title)
// updates it; a new title adds a task. The deal's cached next step is then refreshed.
async function saveNextStepAsTask(
  scope: SalesScope,
  opp: { id: string; companyId: string; ownerId: string | null; ownerName: string },
  data: { nextStep?: string; nextStepDate?: string | null; nextStepOwnerName?: string; nextStepOwnerId?: string | null },
): Promise<void> {
  const title = (data.nextStep ?? "").trim();
  if (title) {
    const due = data.nextStepDate ? new Date(`${data.nextStepDate.slice(0, 10)}T12:00:00.000Z`) : null;
    const assigneeName = data.nextStepOwnerName?.trim() || opp.ownerName;
    const assigneeId = data.nextStepOwnerName?.trim() ? (data.nextStepOwnerId ?? null) : opp.ownerId;
    const current = await db.salesTask.findFirst({
      where: { opportunityId: opp.id, status: "Open" },
      orderBy: [{ dueDate: { sort: "asc", nulls: "last" } }, { createdAt: "asc" }],
    });
    if (current && current.title === title) {
      if (current.dueDate?.getTime() !== due?.getTime() || current.assigneeName !== assigneeName) {
        await db.salesTask.update({ where: { id: current.id }, data: { dueDate: due, assigneeName, assigneeId } });
      }
    } else {
      const t = await db.salesTask.create({
        data: {
          companyId: opp.companyId, opportunityId: opp.id, title, dueDate: due,
          assigneeId, assigneeName, createdById: scope.userId, createdByName: scope.userName,
        },
      });
      await recordAudit(scope, [{
        entityType: "task", entityId: t.id, companyId: opp.companyId, opportunityId: opp.id, action: "created", newValue: title,
      }]);
    }
  }
  await refreshOppNextStep(opp.id);
}

export async function deleteSalesOpportunity(id: string): Promise<void> {
  const scope = await resolveSalesWriteScope("salesActivity");
  await assertOwnsOpp(id, scope);
  const row = await db.salesOpportunity.delete({ where: { id } });
  await recordAudit(scope, [{
    entityType: "opportunity", entityId: id, companyId: row.companyId, opportunityId: id,
    action: "deleted", oldValue: row.name,
  }]);
}

export async function updateOpportunityStage(id: string, stage: OppStage): Promise<void> {
  const scope = await resolveSalesWriteScope("salesActivity");
  await assertOwnsOpp(id, scope);
  const before = await db.salesOpportunity.findUnique({ where: { id } });
  if (!before) throw new ForbiddenError("Opportunity not found");
  const dbStage = stageToDb(stage);
  if (before.stage === dbStage) return;
  const row = await db.salesOpportunity.update({
    where: { id },
    data: { stage: dbStage, stageChangedAt: new Date() },
  });
  await recordAudit(scope, [{
    entityType: "opportunity", entityId: id, companyId: row.companyId, opportunityId: id,
    action: "stage_changed", field: "stage", oldValue: toStage(before.stage), newValue: stage,
  }]);
  await runStageAutomation(scope, row, toStage(before.stage), stage);
}

// ─── Activities ───────────────────────────────────────────────────────────────

export async function getSalesActivities(filters?: {
  userId?: string;
  userName?: string;
  weekStart?: string;
  opportunityId?: string;
}): Promise<SalesActivity[]> {
  const scope = await resolveSalesScope("salesActivity");
  const rows = await db.salesActivity.findMany({
    where: {
      ...(filters?.weekStart ? { weekStart: new Date(filters.weekStart) } : {}),
      ...(filters?.opportunityId ? { opportunityId: filters.opportunityId } : {}),
      // Admins may filter by any rep; everyone else is pinned to their own activities.
      ...(scope.canSeeAll
        ? {
            ...(filters?.userId ? { userId: filters.userId } : {}),
            ...(filters?.userName ? { userName: filters.userName } : {}),
          }
        : { userName: scope.userName }),
    },
    include: {
      company: true,
      opportunity: {
        include: { company: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toActivity);
}

export async function createSalesActivity(
  data: Omit<SalesActivity, "id" | "createdAt" | "company" | "opportunity">
): Promise<SalesActivity> {
  const scope = await resolveSalesWriteScope("salesActivity");
  const row = await db.salesActivity.create({
    data: {
      // Non-admins always log activities under their own identity.
      userId: scope.canSeeAll ? data.userId : scope.userId,
      userName: scope.canSeeAll ? data.userName : scope.userName,
      companyId: data.companyId,
      opportunityId: data.opportunityId,
      type: sanitizeType(data.type),
      description: data.description,
      contacts: data.contacts as object[],
      aiGenerated: data.aiGenerated,
      weekStart: new Date(data.weekStart),
    },
    include: {
      company: true,
      opportunity: { include: { company: true } },
    },
  });
  return toActivity(row);
}

export async function updateSalesActivity(
  id: string,
  data: Partial<Omit<SalesActivity, "id" | "createdAt" | "company" | "opportunity">>
): Promise<SalesActivity> {
  const scope = await resolveSalesWriteScope("salesActivity");
  await assertOwnsActivity(id, scope);
  const row = await db.salesActivity.update({
    where: { id },
    data: {
      ...(data.companyId !== undefined ? { companyId: data.companyId } : {}),
      ...(data.opportunityId !== undefined ? { opportunityId: data.opportunityId } : {}),
      ...(data.type ? { type: sanitizeType(data.type) } : {}),
      ...(data.description !== undefined ? { description: data.description } : {}),
      ...(data.contacts !== undefined ? { contacts: data.contacts as object[] } : {}),
      ...(data.aiGenerated !== undefined ? { aiGenerated: data.aiGenerated } : {}),
    },
    include: { company: true, opportunity: { include: { company: true } } },
  });
  return toActivity(row);
}

export async function deleteSalesActivity(id: string): Promise<void> {
  const scope = await resolveSalesWriteScope("salesActivity");
  await assertOwnsActivity(id, scope);
  await db.salesActivity.delete({ where: { id } });
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export async function getActivitySummary(weekStart: string, userName?: string): Promise<ActivitySummary> {
  const scope = await resolveSalesScope("salesActivity");
  const effectiveUser = scope.canSeeAll ? userName : scope.userName;
  const rows = await db.salesActivity.findMany({
    where: {
      weekStart: new Date(weekStart),
      ...(effectiveUser ? { userName: effectiveUser } : {}),
    },
  });
  const byType: Record<string, number> = {};
  const byPerson: Record<string, number> = {};
  for (const r of rows) {
    byType[r.type] = (byType[r.type] ?? 0) + 1;
    byPerson[r.userName] = (byPerson[r.userName] ?? 0) + 1;
  }
  return { totalActivities: rows.length, byType, byPerson };
}

interface ActivitySummary {
  totalActivities: number;
  byType: Record<string, number>;
  byPerson: Record<string, number>;
}

// ─── Opportunity Comments ─────────────────────────────────────────────────────

function toOppComment(r: {
  id: string; opportunityId: string; userId: string | null; userName: string;
  message: string; richContent: unknown; createdAt: Date; updatedAt: Date;
}): SalesOppComment {
  return {
    id: r.id,
    opportunityId: r.opportunityId,
    userId: r.userId,
    userName: r.userName,
    message: r.message,
    richContent: r.richContent ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export async function getOppComments(opportunityId: string): Promise<SalesOppComment[]> {
  const scope = await resolveSalesScope("salesActivity");
  await assertOwnsOpp(opportunityId, scope);
  const rows = await db.salesOppComment.findMany({
    where: { opportunityId },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toOppComment);
}

export async function addOppComment(
  opportunityId: string,
  userId: string | null,
  userName: string,
  message: string,
  richContentJson?: string,
): Promise<SalesOppComment> {
  const scope = await resolveSalesWriteScope("salesActivity");
  await assertOwnsOpp(opportunityId, scope);
  const row = await db.salesOppComment.create({
    data: {
      opportunityId,
      userId: scope.canSeeAll ? userId : scope.userId,
      userName: scope.canSeeAll ? userName : scope.userName,
      message,
      richContent: richContentJson ? JSON.parse(richContentJson) : undefined,
    },
  });
  return toOppComment(row);
}

export async function updateOppComment(
  id: string,
  message: string,
  richContentJson?: string,
): Promise<void> {
  const scope = await resolveSalesWriteScope("salesActivity");
  await assertOwnsComment(id, scope);
  await db.salesOppComment.update({
    where: { id },
    data: {
      message,
      richContent: richContentJson ? JSON.parse(richContentJson) : undefined,
    },
  });
}

export async function deleteOppComment(id: string): Promise<void> {
  const scope = await resolveSalesWriteScope("salesActivity");
  await assertOwnsComment(id, scope);
  await db.salesOppComment.delete({ where: { id } });
}

// ─── Opp Invoices ─────────────────────────────────────────────────────────────

export async function getOppInvoices(opportunityId: string): Promise<SalesOppInvoice[]> {
  const scope = await resolveSalesScope("salesDealDesk");
  await assertCanAccessOppFinancials(opportunityId, scope);
  const rows = await db.salesOppInvoice.findMany({
    where: { opportunityId },
    orderBy: { invoiceDate: "asc" },
  });
  return rows.map(toInvoice);
}

export async function upsertOppInvoice(data: {
  id?: string;
  opportunityId: string;
  invoiceNumber: string;
  invoiceDate: string;
  subtotalCents: number;
  salesTaxCents: number;
  openBalanceCents: number;
  paymentStatus: OppInvoiceStatus;
  paymentDate: string | null;
  appliesToOppId: string | null;
  notes: string;
}): Promise<SalesOppInvoice> {
  const scope = await resolveSalesWriteScope("salesDealDesk");
  await assertCanAccessOppFinancials(data.opportunityId, scope);
  const payload = {
    opportunityId: data.opportunityId,
    invoiceNumber: data.invoiceNumber,
    invoiceDate: new Date(data.invoiceDate),
    subtotalCents: data.subtotalCents,
    salesTaxCents: data.salesTaxCents,
    openBalanceCents: data.openBalanceCents,
    paymentStatus: data.paymentStatus,
    paymentDate: data.paymentDate ? new Date(data.paymentDate) : null,
    appliesToOppId: data.appliesToOppId,
    notes: data.notes,
  };
  const row = data.id
    ? await db.salesOppInvoice.update({ where: { id: data.id }, data: payload })
    : await db.salesOppInvoice.create({ data: payload });
  return toInvoice(row);
}

export async function deleteOppInvoice(id: string): Promise<void> {
  const scope = await resolveSalesWriteScope("salesDealDesk");
  if (!scope.canSeeAll) {
    const inv = await db.salesOppInvoice.findUnique({ where: { id }, select: { opportunityId: true } });
    if (!inv) throw new ForbiddenError("Invoice not found");
    await assertCanAccessOppFinancials(inv.opportunityId, scope);
  }
  await db.salesOppInvoice.delete({ where: { id } });
}

// ─── Commission Team ──────────────────────────────────────────────────────────

export async function updateOppCommissionTeam(
  opportunityId: string,
  team: CommissionTeamMember[],
): Promise<void> {
  const scope = await resolveSalesWriteScope("salesDealDesk");
  // Commission splits drive payouts — reserved for admins/management.
  if (!scope.canSeeAll) throw new ForbiddenError("Only management can change commission splits");
  await db.salesOpportunity.update({
    where: { id: opportunityId },
    data: { commissionTeam: team as object[] },
  });
}

// ─── Company Contacts ─────────────────────────────────────────────────────────

export async function getCompanyContacts(companyId: string): Promise<CompanyContact[]> {
  const scope = await resolveSalesScope("salesActivity");
  await assertCanSeeCompany(companyId, scope);
  const rows = await db.salesContact.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
  return rows.map(toCompanyContact);
}

export async function upsertCompanyContact(
  data: Omit<CompanyContact, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<CompanyContact> {
  const scope = await resolveSalesWriteScope("salesActivity");
  await assertCanSeeCompany(data.companyId, scope);
  const payload = {
    companyId: data.companyId,
    name: data.name.trim(),
    title: data.title.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
    notes: data.notes.trim(),
  };
  const before = data.id ? await db.salesContact.findUnique({ where: { id: data.id } }) : null;
  if (before && before.companyId !== data.companyId) {
    // Don't let a contact be re-parented onto (or off of) an account via its id.
    await assertCanSeeCompany(before.companyId, scope);
  }
  const result = before
    ? await db.salesContact.update({ where: { id: before.id }, data: payload })
    : await db.salesContact.create({ data: payload });
  await recordAudit(scope, before
    ? diffAudit({ entityType: "contact", entityId: result.id, companyId: result.companyId }, before, result, ["name", "title", "email", "phone"])
    : [{ entityType: "contact", entityId: result.id, companyId: result.companyId, action: "created", newValue: result.name }]);
  return toCompanyContact(result);
}

export async function deleteCompanyContact(id: string): Promise<void> {
  const scope = await resolveSalesWriteScope("salesActivity");
  if (!scope.canSeeAll) {
    const contact = await db.salesContact.findUnique({ where: { id }, select: { companyId: true } });
    if (!contact) throw new ForbiddenError("Contact not found");
    await assertCanSeeCompany(contact.companyId, scope);
  }
  const row = await db.salesContact.delete({ where: { id } });
  await recordAudit(scope, [{ entityType: "contact", entityId: id, companyId: row.companyId, action: "deleted", oldValue: row.name }]);
}

// ─── Commission Statement Data ────────────────────────────────────────────────

export async function getWonOppsWithInvoices(): Promise<
  (SalesOpportunity & { invoices: SalesOppInvoice[]; children: SalesOpportunity[] })[]
> {
  const scope = await resolveSalesScope("salesDealDesk");
  const rows = await db.salesOpportunity.findMany({
    where: { stage: "ClosedWon", parentOppId: null },
    orderBy: { updatedAt: "desc" },
    include: {
      invoices: { orderBy: { invoiceDate: "asc" } },
      children: {
        include: { invoices: { orderBy: { invoiceDate: "asc" } } },
      },
      company: { select: { id: true, name: true, domain: true } },
    },
  });

  // Non-admins see only deals they own or are on the commission team for.
  const visible = scope.canSeeAll
    ? rows
    : rows.filter((r) => {
        if (r.ownerName === scope.userName) return true;
        const team = Array.isArray(r.commissionTeam) ? (r.commissionTeam as Array<{ name?: string }>) : [];
        return team.some((m) => m?.name === scope.userName);
      });

  return visible.map((r) => ({
    ...toOpp({
      ...r,
      invoices: r.invoices.map(toInvoice),
      children: r.children.map((c) => toOpp({
        ...c,
        invoices: c.invoices.map(toInvoice),
      })),
    }),
    invoices: r.invoices.map(toInvoice),
    children: r.children.map((c) => toOpp({
      ...c,
      invoices: c.invoices.map(toInvoice),
    })) as SalesOpportunity[],
  })) as (SalesOpportunity & { invoices: SalesOppInvoice[]; children: SalesOpportunity[] })[];
}
