"use server";

import { db } from "@/lib/db";
import type {
  SalesCompany, SalesOpportunity, SalesActivity, SalesOppComment, SalesOppInvoice,
  CommissionTeamMember, OppInvoiceStatus, CompanyContact,
  ActivityType, OppStage, ProposalRating, SalesContact,
} from "@/types/sales";
import { ACTIVITY_TYPES, PROPOSAL_RATINGS } from "@/types/sales";
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
  const own = await db.salesOpportunity.findFirst({
    where: { companyId, ownerName: scope.userName },
    select: { id: true },
  });
  if (!own) throw new ForbiddenError("You don't have access to this company");
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
const VALID_RATINGS = new Set<string>(PROPOSAL_RATINGS);
function sanitizeRating(r: string | undefined | null): ProposalRating | null {
  if (r && VALID_RATINGS.has(r)) return r as ProposalRating;
  return null;
}
function sanitizeType(t: string | undefined | null): ActivityType {
  if (t && VALID_ACTIVITY_TYPES.has(t)) return t as ActivityType;
  return "Other";
}

// ─── Mappers ──────────────────────────────────────────────────────────────────

const STAGE_MAP: Record<string, OppStage> = {
  ClosedWon: "Closed Won",
  ClosedLost: "Closed Lost",
};
const STAGE_TO_DB: Record<string, string> = {
  "Closed Won": "ClosedWon",
  "Closed Lost": "ClosedLost",
};

function toStage(s: string): OppStage {
  return (STAGE_MAP[s] ?? s) as OppStage;
}

function toCompany(r: {
  id: string; name: string; domain: string; notes: string;
  dealDeskId: string | null; createdAt: Date; updatedAt: Date;
  opportunities?: ReturnType<typeof toOpp>[];
}): SalesCompany {
  return {
    id: r.id,
    name: r.name,
    domain: r.domain,
    notes: r.notes,
    dealDeskId: r.dealDeskId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    opportunities: r.opportunities,
  };
}

function toOpp(r: {
  id: string; companyId: string; name: string; stage: string;
  ownerId: string | null; ownerName: string; value: number;
  notes: string; closeDate: Date | null; cwNumber: string | null; cwLink: string | null;
  proposalCreatedAt: Date | null; rating: string | null;
  commissionTeam?: unknown; parentOppId?: string | null;
  createdAt: Date; updatedAt: Date;
  company?: { id: string; name: string; domain: string };
  invoices?: ReturnType<typeof toInvoice>[];
  children?: SalesOpportunity[];
}): SalesOpportunity {
  return {
    id: r.id,
    companyId: r.companyId,
    name: r.name,
    stage: toStage(r.stage),
    ownerId: r.ownerId,
    ownerName: r.ownerName,
    value: r.value,
    notes: r.notes,
    closeDate: r.closeDate?.toISOString() ?? null,
    cwNumber: r.cwNumber,
    cwLink: r.cwLink,
    proposalCreatedAt: r.proposalCreatedAt?.toISOString() ?? null,
    rating: sanitizeRating(r.rating),
    commissionTeam: Array.isArray(r.commissionTeam) ? (r.commissionTeam as CommissionTeamMember[]) : null,
    parentOppId: r.parentOppId ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    company: r.company,
    invoices: r.invoices,
    children: r.children,
  };
}

function toInvoice(r: {
  id: string; opportunityId: string; invoiceNumber: string;
  invoiceDate: Date; subtotalCents: number; salesTaxCents: number;
  openBalanceCents: number; paymentStatus: string; paymentDate: Date | null;
  appliesToOppId: string | null; notes: string; createdAt: Date; updatedAt: Date;
}): SalesOppInvoice {
  return {
    id: r.id,
    opportunityId: r.opportunityId,
    invoiceNumber: r.invoiceNumber,
    invoiceDate: r.invoiceDate.toISOString(),
    subtotalCents: r.subtotalCents,
    salesTaxCents: r.salesTaxCents,
    openBalanceCents: r.openBalanceCents,
    paymentStatus: r.paymentStatus as OppInvoiceStatus,
    paymentDate: r.paymentDate?.toISOString() ?? null,
    appliesToOppId: r.appliesToOppId,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

function toActivity(r: {
  id: string; userId: string | null; userName: string;
  companyId: string | null; opportunityId: string | null; type: string;
  description: string; contacts: unknown; aiGenerated: boolean;
  weekStart: Date; createdAt: Date;
  company?: { id: string; name: string; domain: string } | null;
  opportunity?: {
    id: string; name: string;
    company: { id: string; name: string; domain: string };
  } | null;
}): SalesActivity {
  return {
    id: r.id,
    userId: r.userId,
    userName: r.userName,
    companyId: r.companyId,
    opportunityId: r.opportunityId,
    type: r.type as ActivityType,
    description: r.description,
    contacts: (r.contacts as SalesContact[]) ?? [],
    aiGenerated: r.aiGenerated,
    weekStart: r.weekStart.toISOString(),
    createdAt: r.createdAt.toISOString(),
    company: r.company ?? null,
    opportunity: r.opportunity ?? null,
  };
}

// ─── Companies ────────────────────────────────────────────────────────────────

export async function getSalesCompanies(ownerName?: string): Promise<SalesCompany[]> {
  const scope = await resolveSalesScope("salesActivity");
  // Non-admins are pinned to their own records regardless of the client-supplied filter.
  const effectiveOwner = scope.canSeeAll ? ownerName : scope.userName;
  const rows = await db.salesCompany.findMany({
    orderBy: { createdAt: "desc" },
    where: effectiveOwner ? { opportunities: { some: { ownerName: effectiveOwner } } } : undefined,
    include: {
      opportunities: {
        orderBy: { createdAt: "asc" },
        where: effectiveOwner ? { ownerName: effectiveOwner } : undefined,
      },
    },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return rows.map((r) => toCompany({
    ...r,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    opportunities: r.opportunities.map((o) => toOpp(o as any)),
  }));
}

export async function upsertSalesCompany(
  data: Omit<SalesCompany, "id" | "createdAt" | "updatedAt" | "opportunities"> & { id?: string }
): Promise<SalesCompany> {
  // Companies are shared across reps, so any sales member may add/edit them.
  await resolveSalesWriteScope("salesActivity");
  const payload = {
    name: data.name,
    domain: data.domain.trim().toLowerCase(),
    notes: data.notes,
    dealDeskId: data.dealDeskId,
  };
  const row = data.id
    ? await db.salesCompany.update({ where: { id: data.id }, data: payload })
    : await db.salesCompany.create({ data: payload });
  return toCompany(row);
}

export async function deleteSalesCompany(id: string): Promise<void> {
  const scope = await resolveSalesWriteScope("salesActivity");
  // Deleting a company cascades to every rep's opportunities/activities under it,
  // so it's restricted to admins/management.
  if (!scope.canSeeAll) throw new ForbiddenError("Only management can delete a company");
  await db.salesCompany.delete({ where: { id } });
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
  const stage = (STAGE_TO_DB[data.stage] ?? data.stage) as "Prospecting" | "Qualifying" | "Proposal" | "Negotiation" | "ClosedWon" | "ClosedLost";
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
  };

  // CW-imported opps: upsert by cwNumber to avoid duplicates on reimport
  if (data.cwNumber) {
    const existing = await db.salesOpportunity.findFirst({
      where: { cwNumber: data.cwNumber },
    });
    if (existing) {
      if (!scope.canSeeAll && existing.ownerName !== scope.userName && existing.ownerId !== scope.userId) {
        throw new ForbiddenError("You can only modify your own opportunities");
      }
      const row = await db.salesOpportunity.update({
        where: { id: existing.id },
        // On reimport: refresh CW-owned fields only; preserve user-managed fields
        data: {
          name: payload.name,
          value: payload.value,
          closeDate: payload.closeDate,
          proposalCreatedAt: payload.proposalCreatedAt,
          rating: payload.rating,
        },
      });
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return toOpp(row as any);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const payloadAny = payload as any;
  const row = data.id
    ? await db.salesOpportunity.update({ where: { id: data.id }, data: payloadAny })
    : await db.salesOpportunity.create({ data: payloadAny });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return toOpp(row as any);
}

export async function deleteSalesOpportunity(id: string): Promise<void> {
  const scope = await resolveSalesWriteScope("salesActivity");
  await assertOwnsOpp(id, scope);
  await db.salesOpportunity.delete({ where: { id } });
}

export async function updateOpportunityStage(id: string, stage: OppStage): Promise<void> {
  const scope = await resolveSalesWriteScope("salesActivity");
  await assertOwnsOpp(id, scope);
  await db.salesOpportunity.update({
    where: { id },
    data: { stage: (STAGE_TO_DB[stage] ?? stage) as "Prospecting" | "Qualifying" | "Proposal" | "Negotiation" | "ClosedWon" | "ClosedLost" },
  });
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

function toCompanyContact(r: {
  id: string; companyId: string; name: string; title: string;
  email: string; phone: string; notes: string;
  createdAt: Date; updatedAt: Date;
}): CompanyContact {
  return {
    id: r.id,
    companyId: r.companyId,
    name: r.name,
    title: r.title,
    email: r.email,
    phone: r.phone,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

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
  const result = data.id
    ? await db.salesContact.update({ where: { id: data.id }, data: payload })
    : await db.salesContact.create({ data: payload });
  return toCompanyContact(result);
}

export async function deleteCompanyContact(id: string): Promise<void> {
  const scope = await resolveSalesWriteScope("salesActivity");
  if (!scope.canSeeAll) {
    const contact = await db.salesContact.findUnique({ where: { id }, select: { companyId: true } });
    if (!contact) throw new ForbiddenError("Contact not found");
    await assertCanSeeCompany(contact.companyId, scope);
  }
  await db.salesContact.delete({ where: { id } });
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
