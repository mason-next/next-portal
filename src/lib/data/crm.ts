"use server";

// CRM server actions: account snapshot, dated notes, follow-up tasks, leads, agenda,
// and note summaries. Every action resolves the caller's sales scope first and applies
// the same self-only rules as sales-activity.ts (see crm-internal.ts).

import type { Prisma } from "@prisma/client";
import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { getAnthropicClient } from "@/lib/anthropic";
import {
  resolveSalesScope,
  resolveSalesWriteScope,
  ForbiddenError,
  type SalesScope,
} from "@/lib/access-control";
import {
  toCompany, toOpp, toActivity, toCompanyContact, toNote, toTask, toLead, toAudit, toStage,
} from "@/lib/data/sales-mappers";
import {
  isMine, mineOppWhere, visibleCompanyWhere, assertCompanyVisible, assertOppMine,
  recordAudit, diffAudit, runStageAutomation,
} from "@/lib/data/crm-internal";
import type {
  AccountSnapshot, AgendaItem, SalesNote, SalesTask, SalesLead, NoteKind, NoteAttachment,
  TaskPriority, SalesCompany,
} from "@/types/sales";
import { NOTE_KINDS, TASK_PRIORITIES, LEAD_STATUSES, isOpenStage } from "@/types/sales";

const MODULE = "salesActivity" as const;

const VALID_KINDS = new Set<string>(NOTE_KINDS);
const VALID_PRIORITIES = new Set<string>(TASK_PRIORITIES);
const VALID_LEAD_STATUSES = new Set<string>(LEAD_STATUSES);

function parseDate(v: string | null | undefined): Date | null {
  if (!v) return null;
  // Bare yyyy-mm-dd from <input type="date"> → noon UTC so it renders on the same
  // calendar day in every US timezone.
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00.000Z`) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

// ─── Visibility filters ───────────────────────────────────────────────────────

function noteWhere(scope: SalesScope): Prisma.SalesNoteWhereInput {
  if (scope.canSeeAll) return {};
  return {
    company: visibleCompanyWhere(scope),
    OR: [{ opportunityId: null }, { opportunity: mineOppWhere(scope) }],
  };
}

function taskWhere(scope: SalesScope): Prisma.SalesTaskWhereInput {
  if (scope.canSeeAll) return {};
  return {
    OR: [
      { assigneeName: scope.userName },
      { assigneeId: scope.userId },
      { createdByName: scope.userName },
      { opportunity: mineOppWhere(scope) },
      { opportunityId: null, company: visibleCompanyWhere(scope) },
    ],
  };
}

function leadWhere(scope: SalesScope): Prisma.SalesLeadWhereInput {
  if (scope.canSeeAll) return {};
  // Reps see their own leads plus the unassigned pool so they can claim them.
  return { OR: [{ ownerName: scope.userName }, { ownerId: scope.userId }, { ownerName: "", ownerId: null }] };
}

const noteInclude = {
  company: { select: { id: true, name: true, domain: true } },
  opportunity: { select: { id: true, name: true } },
  contact: { select: { id: true, name: true } },
} as const;

const taskInclude = {
  company: { select: { id: true, name: true, domain: true } },
  opportunity: { select: { id: true, name: true } },
} as const;

// ─── Account index (list-page rollups) ────────────────────────────────────────

export interface AccountRollup {
  lastTouch: string | null;
  nextDate: string | null;
  openTasks: number;
  overdueTasks: number;
  noteCount: number;
}

/** Visible accounts (with visible opps) plus per-account touch/next-date rollups. */
export async function getCrmAccounts(): Promise<{ companies: SalesCompany[]; rollups: Record<string, AccountRollup> }> {
  const scope = await resolveSalesScope(MODULE);
  const [companies, notes, tasks] = await Promise.all([
    db.salesCompany.findMany({
      where: visibleCompanyWhere(scope),
      orderBy: { name: "asc" },
      include: {
        opportunities: {
          where: scope.canSeeAll ? undefined : mineOppWhere(scope),
          orderBy: { createdAt: "asc" },
        },
      },
    }),
    db.salesNote.groupBy({
      by: ["companyId"],
      where: noteWhere(scope),
      _max: { noteDate: true },
      _count: { _all: true },
    }),
    db.salesTask.findMany({
      where: { ...taskWhere(scope), status: "Open", companyId: { not: null } },
      select: { companyId: true, dueDate: true },
    }),
  ]);

  const rollups: Record<string, AccountRollup> = {};
  const now = Date.now();
  const get = (id: string) =>
    (rollups[id] ??= { lastTouch: null, nextDate: null, openTasks: 0, overdueTasks: 0, noteCount: 0 });
  const earliest = (a: string | null, b: string | null) => (!a ? b : !b ? a : a < b ? a : b);

  for (const n of notes) {
    const r = get(n.companyId);
    r.lastTouch = n._max.noteDate?.toISOString() ?? null;
    r.noteCount = n._count._all;
  }
  for (const t of tasks) {
    if (!t.companyId) continue;
    const r = get(t.companyId);
    r.openTasks++;
    if (t.dueDate) {
      if (t.dueDate.getTime() < now) r.overdueTasks++;
      r.nextDate = earliest(r.nextDate, t.dueDate.toISOString());
    }
  }
  for (const c of companies) {
    for (const o of c.opportunities) {
      if (!isOpenStage(toStage(o.stage))) continue;
      if (o.nextStepDate) get(c.id).nextDate = earliest(get(c.id).nextDate, o.nextStepDate.toISOString());
    }
  }

  return {
    companies: companies.map((c) => toCompany({ ...c, opportunities: c.opportunities.map((o) => toOpp(o)) })),
    rollups,
  };
}

// ─── Account snapshot ─────────────────────────────────────────────────────────

export async function getAccountSnapshot(companyId: string): Promise<AccountSnapshot> {
  const scope = await resolveSalesScope(MODULE);
  await assertCompanyVisible(companyId, scope);

  const company = await db.salesCompany.findUnique({ where: { id: companyId } });
  if (!company) throw new ForbiddenError("Company not found");

  const [opps, contacts, notes, tasks, activities] = await Promise.all([
    db.salesOpportunity.findMany({
      where: { companyId, ...(scope.canSeeAll ? {} : mineOppWhere(scope)) },
      orderBy: [{ closeDate: "asc" }, { createdAt: "asc" }],
    }),
    db.salesContact.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
    db.salesNote.findMany({
      where: { companyId, ...noteWhere(scope) },
      include: noteInclude,
      orderBy: [{ noteDate: "desc" }, { createdAt: "desc" }],
    }),
    db.salesTask.findMany({
      where: { companyId, ...taskWhere(scope) },
      include: taskInclude,
      orderBy: [{ status: "desc" }, { dueDate: "asc" }],
    }),
    db.salesActivity.findMany({
      where: {
        OR: [{ companyId }, { opportunity: { companyId } }],
        ...(scope.canSeeAll ? {} : { OR: [{ userName: scope.userName }, { userId: scope.userId }] }),
      },
      include: { company: true, opportunity: { include: { company: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
  ]);

  const oppIds = opps.map((o) => o.id);
  const history = await db.salesAuditLog.findMany({
    where: {
      companyId,
      ...(scope.canSeeAll ? {} : { OR: [{ opportunityId: null }, { opportunityId: { in: oppIds } }] }),
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  return {
    company: toCompany(company),
    opportunities: opps.map((o) => toOpp(o)),
    contacts: contacts.map(toCompanyContact),
    notes: notes.map(toNote),
    tasks: tasks.map(toTask),
    activities: activities.map(toActivity),
    history: history.map(toAudit),
  };
}

// ─── Notes ────────────────────────────────────────────────────────────────────

export async function getNotes(filters: {
  companyId?: string;
  opportunityId?: string;
  from?: string;
  to?: string;
  userName?: string;
  limit?: number;
} = {}): Promise<SalesNote[]> {
  const scope = await resolveSalesScope(MODULE);
  const from = parseDate(filters.from);
  const to = parseDate(filters.to);
  const rows = await db.salesNote.findMany({
    where: {
      AND: [
        noteWhere(scope),
        filters.companyId ? { companyId: filters.companyId } : {},
        filters.opportunityId ? { opportunityId: filters.opportunityId } : {},
        from || to ? { noteDate: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {},
        filters.userName ? { userName: filters.userName } : {},
      ],
    },
    include: noteInclude,
    orderBy: [{ noteDate: "desc" }, { createdAt: "desc" }],
    take: Math.min(filters.limit ?? 500, 1000),
  });
  return rows.map(toNote);
}

export async function upsertNote(data: {
  id?: string;
  companyId: string;
  opportunityId: string | null;
  contactId: string | null;
  noteDate: string;
  kind: NoteKind;
  body: string;
  attachments?: NoteAttachment[];
  pinned?: boolean;
}): Promise<SalesNote> {
  const scope = await resolveSalesWriteScope(MODULE);
  if (!data.body.trim() && !(data.attachments?.length)) throw new Error("A note needs some text or an attachment");

  const before = data.id ? await db.salesNote.findUnique({ where: { id: data.id } }) : null;
  if (data.id && !before) throw new ForbiddenError("Note not found");
  if (before && !isMine(scope, before.userId, before.userName)) {
    throw new ForbiddenError("You can only edit your own notes");
  }

  await assertCompanyVisible(data.companyId, scope);
  if (data.opportunityId) {
    const opp = await (scope.canSeeAll
      ? db.salesOpportunity.findUnique({ where: { id: data.opportunityId }, select: { companyId: true } })
      : assertOppMine(data.opportunityId, scope));
    if (!opp || opp.companyId !== data.companyId) throw new ForbiddenError("That opportunity isn't on this account");
  }
  if (data.contactId) {
    const contact = await db.salesContact.findUnique({ where: { id: data.contactId }, select: { companyId: true } });
    if (!contact || contact.companyId !== data.companyId) throw new ForbiddenError("That contact isn't on this account");
  }

  const payload = {
    companyId: data.companyId,
    opportunityId: data.opportunityId,
    contactId: data.contactId,
    noteDate: parseDate(data.noteDate) ?? new Date(),
    kind: VALID_KINDS.has(data.kind) ? data.kind : "Note",
    body: data.body.trim(),
    attachments: (data.attachments ?? []).map((a) => ({
      fileName: String(a.fileName).slice(0, 255),
      fileSize: Number(a.fileSize) || 0,
      mimeType: String(a.mimeType).slice(0, 255),
      // Only accept the flat file names /api/comments/upload hands out.
      storagePath: String(a.storagePath).replace(/[^a-zA-Z0-9._-]/g, "_"),
    })),
    ...(data.pinned !== undefined ? { pinned: data.pinned } : {}),
  };

  const row = before
    ? await db.salesNote.update({ where: { id: before.id }, data: payload, include: noteInclude })
    : await db.salesNote.create({
        data: { ...payload, userId: scope.userId, userName: scope.userName },
        include: noteInclude,
      });

  if (!before) {
    await recordAudit(scope, [{
      entityType: "note", entityId: row.id, companyId: row.companyId, opportunityId: row.opportunityId,
      action: "created", field: row.kind, newValue: row.body.slice(0, 140),
    }]);
  }
  return toNote(row);
}

export async function setNotePinned(id: string, pinned: boolean): Promise<void> {
  const scope = await resolveSalesWriteScope(MODULE);
  const note = await db.salesNote.findFirst({ where: { id, ...noteWhere(scope) }, select: { id: true } });
  if (!note) throw new ForbiddenError("Note not found");
  await db.salesNote.update({ where: { id }, data: { pinned } });
}

export async function deleteNote(id: string): Promise<void> {
  const scope = await resolveSalesWriteScope(MODULE);
  const note = await db.salesNote.findUnique({ where: { id } });
  if (!note) throw new ForbiddenError("Note not found");
  if (!isMine(scope, note.userId, note.userName)) throw new ForbiddenError("You can only delete your own notes");
  await db.salesNote.delete({ where: { id } });
  await recordAudit(scope, [{
    entityType: "note", entityId: id, companyId: note.companyId, opportunityId: note.opportunityId,
    action: "deleted", field: note.kind, oldValue: note.body.slice(0, 140),
  }]);
}

// ─── Tasks / follow-ups ───────────────────────────────────────────────────────

export async function getTasks(filters: {
  companyId?: string;
  opportunityId?: string;
  status?: "Open" | "Done" | "all";
  assigneeName?: string;
} = {}): Promise<SalesTask[]> {
  const scope = await resolveSalesScope(MODULE);
  const rows = await db.salesTask.findMany({
    where: {
      AND: [
        taskWhere(scope),
        filters.companyId ? { companyId: filters.companyId } : {},
        filters.opportunityId ? { opportunityId: filters.opportunityId } : {},
        filters.status && filters.status !== "all" ? { status: filters.status } : {},
        filters.assigneeName ? { assigneeName: filters.assigneeName } : {},
      ],
    },
    include: taskInclude,
    orderBy: [{ status: "desc" }, { dueDate: "asc" }, { createdAt: "asc" }],
    take: 1000,
  });
  return rows.map(toTask);
}

async function assertCanEditTask(id: string, scope: SalesScope) {
  const task = await db.salesTask.findUnique({
    where: { id },
    include: { opportunity: { select: { ownerId: true, ownerName: true } } },
  });
  if (!task) throw new ForbiddenError("Task not found");
  if (scope.canSeeAll) return task;
  const ok =
    isMine(scope, task.assigneeId, task.assigneeName) ||
    isMine(scope, task.createdById, task.createdByName) ||
    (task.opportunity && isMine(scope, task.opportunity.ownerId, task.opportunity.ownerName));
  if (!ok) throw new ForbiddenError("You can only change tasks you own, created, or that sit on your deals");
  return task;
}

export async function upsertTask(data: {
  id?: string;
  companyId: string | null;
  opportunityId: string | null;
  title: string;
  description?: string;
  dueDate: string | null;
  priority?: TaskPriority;
  assigneeId: string | null;
  assigneeName: string;
}): Promise<SalesTask> {
  const scope = await resolveSalesWriteScope(MODULE);
  if (!data.title.trim()) throw new Error("Task title is required");
  const before = data.id ? await assertCanEditTask(data.id, scope) : null;

  let companyId = data.companyId;
  if (data.opportunityId) {
    const opp = await (scope.canSeeAll
      ? db.salesOpportunity.findUnique({ where: { id: data.opportunityId }, select: { companyId: true } })
      : assertOppMine(data.opportunityId, scope));
    if (!opp) throw new ForbiddenError("Opportunity not found");
    companyId = opp.companyId;
  }
  if (companyId) await assertCompanyVisible(companyId, scope);

  const payload = {
    companyId,
    opportunityId: data.opportunityId,
    title: data.title.trim(),
    description: (data.description ?? "").trim(),
    dueDate: parseDate(data.dueDate),
    priority: data.priority && VALID_PRIORITIES.has(data.priority) ? data.priority : "Normal",
    // Default the owner of the follow-up to whoever is creating it.
    assigneeId: data.assigneeName ? data.assigneeId : scope.userId,
    assigneeName: data.assigneeName?.trim() || scope.userName,
  };
  const row = before
    ? await db.salesTask.update({ where: { id: before.id }, data: payload, include: taskInclude })
    : await db.salesTask.create({
        data: { ...payload, createdById: scope.userId, createdByName: scope.userName },
        include: taskInclude,
      });

  await recordAudit(scope, before
    ? diffAudit({ entityType: "task", entityId: row.id, companyId: row.companyId, opportunityId: row.opportunityId },
        before, row, ["title", "dueDate", "assigneeName", "priority"])
    : [{ entityType: "task", entityId: row.id, companyId: row.companyId, opportunityId: row.opportunityId,
        action: "created", newValue: row.title }]);
  return toTask(row);
}

export async function setTaskDone(id: string, done: boolean): Promise<void> {
  const scope = await resolveSalesWriteScope(MODULE);
  const task = await assertCanEditTask(id, scope);
  await db.salesTask.update({
    where: { id },
    data: { status: done ? "Done" : "Open", completedAt: done ? new Date() : null },
  });
  await recordAudit(scope, [{
    entityType: "task", entityId: id, companyId: task.companyId, opportunityId: task.opportunityId,
    action: done ? "completed" : "reopened", newValue: task.title,
  }]);
}

export async function deleteTask(id: string): Promise<void> {
  const scope = await resolveSalesWriteScope(MODULE);
  const task = await assertCanEditTask(id, scope);
  await db.salesTask.delete({ where: { id } });
  await recordAudit(scope, [{
    entityType: "task", entityId: id, companyId: task.companyId, opportunityId: task.opportunityId,
    action: "deleted", oldValue: task.title,
  }]);
}

// ─── Leads ────────────────────────────────────────────────────────────────────

export async function getLeads(): Promise<SalesLead[]> {
  const scope = await resolveSalesScope(MODULE);
  const rows = await db.salesLead.findMany({ where: leadWhere(scope), orderBy: { createdAt: "desc" } });
  return rows.map(toLead);
}

async function assertCanEditLead(id: string, scope: SalesScope) {
  const lead = await db.salesLead.findUnique({ where: { id } });
  if (!lead) throw new ForbiddenError("Lead not found");
  const unowned = !lead.ownerName && !lead.ownerId;
  if (!scope.canSeeAll && !unowned && !isMine(scope, lead.ownerId, lead.ownerName)) {
    throw new ForbiddenError("You can only change your own leads");
  }
  return lead;
}

export async function upsertLead(
  data: Omit<SalesLead, "id" | "createdAt" | "updatedAt" | "convertedCompanyId" | "convertedOpportunityId" | "convertedAt"> & { id?: string },
): Promise<SalesLead> {
  const scope = await resolveSalesWriteScope(MODULE);
  if (!data.name.trim() && !data.companyName.trim()) throw new Error("A lead needs a name or a company");
  const before = data.id ? await assertCanEditLead(data.id, scope) : null;
  if (before?.status === "Converted") throw new Error("Converted leads are read-only");

  // Reps can only take a lead themselves or leave it in the pool.
  const ownerName = scope.canSeeAll ? data.ownerName.trim() : (data.ownerName.trim() ? scope.userName : "");
  const ownerId = scope.canSeeAll ? data.ownerId : (ownerName ? scope.userId : null);
  const status = VALID_LEAD_STATUSES.has(data.status) && data.status !== "Converted" ? data.status : "New";

  const payload = {
    name: data.name.trim(),
    companyName: data.companyName.trim(),
    title: data.title.trim(),
    email: data.email.trim(),
    phone: data.phone.trim(),
    source: data.source.trim(),
    status,
    ownerId,
    ownerName,
    territory: data.territory.trim(),
    vertical: data.vertical.trim(),
    estimatedValue: Math.max(0, Math.round(data.estimatedValue || 0)),
    notes: data.notes,
  };
  const row = before
    ? await db.salesLead.update({ where: { id: before.id }, data: payload })
    : await db.salesLead.create({ data: payload });
  await recordAudit(scope, before
    ? diffAudit({ entityType: "lead", entityId: row.id }, before, row, ["status", "ownerName", "estimatedValue"])
    : [{ entityType: "lead", entityId: row.id, action: "created", newValue: row.companyName || row.name }]);
  return toLead(row);
}

export async function deleteLead(id: string): Promise<void> {
  const scope = await resolveSalesWriteScope(MODULE);
  const lead = await assertCanEditLead(id, scope);
  await db.salesLead.delete({ where: { id } });
  await recordAudit(scope, [{ entityType: "lead", entityId: id, action: "deleted", oldValue: lead.companyName || lead.name }]);
}

/**
 * Converts a lead into an account (matched by name, else created), a contact, and
 * optionally an opportunity. Returns the account id so the UI can open its snapshot.
 */
export async function convertLead(
  id: string,
  opts: { createOpportunity: boolean; opportunityName?: string },
): Promise<{ companyId: string; opportunityId: string | null }> {
  const scope = await resolveSalesWriteScope(MODULE);
  const lead = await assertCanEditLead(id, scope);
  if (lead.status === "Converted") throw new Error("This lead was already converted");

  const ownerName = lead.ownerName || scope.userName;
  const ownerId = lead.ownerName ? lead.ownerId : scope.userId;
  const companyName = lead.companyName.trim() || lead.name.trim();

  const result = await db.$transaction(async (tx) => {
    let company = await tx.salesCompany.findFirst({
      where: { name: { equals: companyName, mode: "insensitive" } },
    });
    if (!company) {
      company = await tx.salesCompany.create({
        data: {
          name: companyName,
          ownerId,
          ownerName,
          territory: lead.territory,
          vertical: lead.vertical,
          accountStatus: "Prospect",
        },
      });
    }

    if (lead.name.trim() && lead.companyName.trim()) {
      await tx.salesContact.create({
        data: {
          companyId: company.id,
          name: lead.name.trim(),
          title: lead.title,
          email: lead.email,
          phone: lead.phone,
        },
      });
    }

    let opportunityId: string | null = null;
    if (opts.createOpportunity) {
      const opp = await tx.salesOpportunity.create({
        data: {
          companyId: company.id,
          name: opts.opportunityName?.trim() || `${companyName} — New Opportunity`,
          stage: lead.status === "Qualified" ? "Qualifying" : "Prospecting",
          ownerId,
          ownerName,
          value: lead.estimatedValue,
          leadSource: lead.source,
          stageChangedAt: new Date(),
        },
      });
      opportunityId = opp.id;
    }

    if (lead.notes.trim()) {
      await tx.salesNote.create({
        data: {
          companyId: company.id,
          opportunityId,
          userId: scope.userId,
          userName: scope.userName,
          noteDate: lead.createdAt,
          kind: "Note",
          body: `Lead notes (${lead.source || "no source"}):\n${lead.notes.trim()}`,
        },
      });
    }

    await tx.salesLead.update({
      where: { id },
      data: {
        status: "Converted",
        convertedAt: new Date(),
        convertedCompanyId: company.id,
        convertedOpportunityId: opportunityId,
        ownerId,
        ownerName,
      },
    });
    return { companyId: company.id, opportunityId };
  });

  await recordAudit(scope, [
    { entityType: "lead", entityId: id, companyId: result.companyId, opportunityId: result.opportunityId,
      action: "converted", newValue: lead.companyName || lead.name },
    ...(result.opportunityId
      ? [{ entityType: "opportunity" as const, entityId: result.opportunityId, companyId: result.companyId,
          opportunityId: result.opportunityId, action: "created", newValue: `${opts.opportunityName?.trim() || companyName} (from lead)` }]
      : []),
  ]);
  if (result.opportunityId) {
    // Same follow-up automation as any other opp entering its first stage.
    const opp = await db.salesOpportunity.findUnique({ where: { id: result.opportunityId } });
    if (opp && opp.stage !== "Prospecting") await runStageAutomation(scope, opp, "Prospecting", toStage(opp.stage));
  }
  return result;
}

// ─── Agenda ───────────────────────────────────────────────────────────────────

/**
 * Everything with a date on it in the window [past overdue … today + days]: open tasks,
 * next steps on open opps, and expected close dates on open opps. Overdue items are
 * always included regardless of how old they are.
 */
export async function getAgenda(opts: { days?: number; ownerName?: string } = {}): Promise<AgendaItem[]> {
  const scope = await resolveSalesScope(MODULE);
  const horizon = new Date();
  horizon.setUTCDate(horizon.getUTCDate() + Math.max(1, Math.min(opts.days ?? 30, 365)));
  const ownerFilter = scope.canSeeAll ? opts.ownerName : undefined;

  const [tasks, opps] = await Promise.all([
    db.salesTask.findMany({
      where: {
        AND: [
          taskWhere(scope),
          { status: "Open", dueDate: { not: null, lte: horizon } },
          ownerFilter ? { assigneeName: ownerFilter } : {},
        ],
      },
      include: taskInclude,
    }),
    db.salesOpportunity.findMany({
      where: {
        AND: [
          scope.canSeeAll ? {} : mineOppWhere(scope),
          { stage: { in: ["Prospecting", "Qualifying", "Proposal", "Negotiation"] } },
          { OR: [{ nextStepDate: { lte: horizon } }, { closeDate: { lte: horizon } }] },
          ownerFilter ? { OR: [{ ownerName: ownerFilter }, { nextStepOwnerName: ownerFilter }] } : {},
        ],
      },
      include: { company: { select: { id: true, name: true } } },
    }),
  ]);

  const items: AgendaItem[] = [];
  for (const t of tasks) {
    items.push({
      kind: "task",
      id: t.id,
      date: t.dueDate!.toISOString(),
      title: t.title,
      ownerName: t.assigneeName,
      companyId: t.companyId,
      companyName: t.company?.name ?? "",
      opportunityId: t.opportunityId,
      opportunityName: t.opportunity?.name ?? "",
      value: 0,
      priority: t.priority as TaskPriority,
    });
  }
  for (const o of opps) {
    if (o.nextStepDate && o.nextStepDate <= horizon) {
      items.push({
        kind: "nextStep",
        id: `ns_${o.id}`,
        date: o.nextStepDate.toISOString(),
        title: o.nextStep || "Next step",
        ownerName: o.nextStepOwnerName || o.ownerName,
        companyId: o.companyId,
        companyName: o.company.name,
        opportunityId: o.id,
        opportunityName: o.name,
        value: o.value,
      });
    }
    if (o.closeDate && o.closeDate <= horizon) {
      items.push({
        kind: "closeDate",
        id: `cd_${o.id}`,
        date: o.closeDate.toISOString(),
        title: "Expected close",
        ownerName: o.ownerName,
        companyId: o.companyId,
        companyName: o.company.name,
        opportunityId: o.id,
        opportunityName: o.name,
        value: o.value,
      });
    }
  }
  items.sort((a, b) => a.date.localeCompare(b.date));
  // The query above widens by either owner field; narrow each item to whoever owns it.
  return ownerFilter ? items.filter((i) => i.ownerName === ownerFilter) : items;
}

// ─── Note summaries (AI) ──────────────────────────────────────────────────────

// Claude is used only to condense notes the caller is already allowed to read.
const SUMMARY_MODEL = "claude-opus-5";

const SUMMARY_SYSTEM = `You summarize a B2B sales team's CRM notes for a sales leader.
Write GitHub-flavored Markdown with these sections, omitting any that would be empty:
## Headlines — 3-6 bullets on what matters most right now.
## By account — one short bullet list per account: current state, customer sentiment, risks, commitments made.
## Upcoming — dated items (deadlines, meetings, close dates) in date order, from the notes and the agenda provided.
## Suggested follow-ups — concrete next actions with the owner when known.
Rules: be specific and cite dates as "Mon DD". Only use facts present in the input; do not invent names, numbers or dates. Keep it under 450 words.`;

// Returns { error } instead of throwing for expected failures: production builds replace
// thrown server-action messages with a generic one, and these need to reach the user.
export async function summarizeNotes(
  opts: { companyId?: string; days?: number },
): Promise<{ markdown: string; noteCount: number; error?: undefined } | { error: string }> {
  const scope = await resolveSalesScope(MODULE);
  if (opts.companyId) await assertCompanyVisible(opts.companyId, scope);
  const days = Math.max(1, Math.min(opts.days ?? 14, 365));
  const since = new Date();
  since.setUTCDate(since.getUTCDate() - days);

  const notes = await db.salesNote.findMany({
    where: {
      AND: [
        noteWhere(scope),
        opts.companyId ? { companyId: opts.companyId } : {},
        { noteDate: { gte: since } },
      ],
    },
    include: noteInclude,
    orderBy: { noteDate: "asc" },
    take: 300,
  });
  if (notes.length === 0) {
    return { markdown: `_No notes in the last ${days} days._`, noteCount: 0 };
  }

  const agenda = (await getAgenda({ days: 30 }))
    .filter((a) => !opts.companyId || a.companyId === opts.companyId)
    .slice(0, 60);

  const noteLines = notes.map((n) => {
    const d = n.noteDate.toISOString().slice(0, 10);
    const where = [n.company.name, n.opportunity?.name].filter(Boolean).join(" / ");
    return `- [${d}] ${n.kind} · ${where} · by ${n.userName}${n.contact ? ` · with ${n.contact.name}` : ""}\n  ${n.body.replace(/\s+/g, " ").slice(0, 1500)}`;
  });
  const agendaLines = agenda.map((a) =>
    `- [${a.date.slice(0, 10)}] ${a.kind === "task" ? "Task" : a.kind === "nextStep" ? "Next step" : "Expected close"}: ${a.title} · ${a.companyName}${a.opportunityName ? ` / ${a.opportunityName}` : ""} · owner ${a.ownerName || "unassigned"}`);

  const userContent = `Today is ${new Date().toISOString().slice(0, 10)}. Notes from the last ${days} days:\n\n${noteLines.join("\n")}\n\nUpcoming dated items:\n${agendaLines.join("\n") || "- none"}`;

  let client: Anthropic;
  try {
    client = getAnthropicClient();
  } catch {
    return { error: "AI summaries aren't configured on this server (ANTHROPIC_API_KEY is not set)." };
  }

  try {
    const response = await client.beta.messages.create({
      model: SUMMARY_MODEL,
      max_tokens: 4000,
      output_config: { effort: "low" },
      // Server-side fallback: if the primary model declines, the API retries on this one.
      betas: ["server-side-fallback-2026-06-01"],
      fallbacks: [{ model: "claude-opus-4-8" }],
      system: SUMMARY_SYSTEM,
      messages: [{ role: "user", content: userContent }],
    });
    if (response.stop_reason === "refusal") {
      return { error: "The summary request was declined. Try a narrower date range." };
    }
    const markdown = response.content
      .flatMap((b) => (b.type === "text" ? [b.text] : []))
      .join("")
      .trim();
    return { markdown: markdown || "_No summary returned._", noteCount: notes.length };
  } catch (err) {
    if (err instanceof Anthropic.RateLimitError) return { error: "AI summary is rate-limited right now — try again in a minute." };
    if (err instanceof Anthropic.APIConnectionError) return { error: "Couldn't reach the AI service. Please try again." };
    if (err instanceof Anthropic.APIError) {
      console.error("[crm-summary] Anthropic error", err.status, err.message);
      return { error: "AI summary failed. Please try again." };
    }
    throw err;
  }
}
