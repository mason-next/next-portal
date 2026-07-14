"use server";

import { db } from "@/lib/db";
import type {
  SalesCompany, SalesOpportunity, SalesActivity,
  ActivityType, OppStage, ProposalRating, SalesContact,
} from "@/types/sales";
import { ACTIVITY_TYPES, PROPOSAL_RATINGS } from "@/types/sales";

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
  notes: string; closeDate: Date | null; cwNumber: string | null;
  proposalCreatedAt: Date | null; rating: string | null;
  createdAt: Date; updatedAt: Date;
  company?: { id: string; name: string; domain: string };
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
    proposalCreatedAt: r.proposalCreatedAt?.toISOString() ?? null,
    rating: sanitizeRating(r.rating),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    company: r.company,
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
  const rows = await db.salesCompany.findMany({
    orderBy: { createdAt: "desc" },
    where: ownerName ? { opportunities: { some: { ownerName } } } : undefined,
    include: {
      opportunities: {
        orderBy: { createdAt: "asc" },
        where: ownerName ? { ownerName } : undefined,
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
  await db.salesCompany.delete({ where: { id } });
}

// ─── Owner name normalization ─────────────────────────────────────────────────
// Converts CW slug-style ownerNames (e.g. "jlazo") to full names ("Juan Lazo").
// Safe to call repeatedly — only updates rows where a slug match is found and
// the stored name differs from the resolved full name.
export async function normalizeOppOwnerNames(): Promise<number> {
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
  const stage = (STAGE_TO_DB[data.stage] ?? data.stage) as "Prospecting" | "Qualifying" | "Proposal" | "Negotiation" | "ClosedWon" | "ClosedLost";
  const payload = {
    companyId: data.companyId,
    name: data.name,
    stage,
    ownerId: data.ownerId,
    ownerName: data.ownerName,
    value: data.value,
    notes: data.notes,
    closeDate: data.closeDate ? new Date(data.closeDate) : null,
    cwNumber: data.cwNumber ?? null,
    proposalCreatedAt: data.proposalCreatedAt ? new Date(data.proposalCreatedAt) : null,
    rating: data.rating ?? null,
  };

  // CW-imported opps: upsert by cwNumber to avoid duplicates on reimport
  if (data.cwNumber) {
    const existing = await db.salesOpportunity.findFirst({
      where: { cwNumber: data.cwNumber },
    });
    if (existing) {
      const row = await db.salesOpportunity.update({
        where: { id: existing.id },
        // On reimport: refresh CW-owned fields only; preserve user-managed fields
        data: {
          name: payload.name,
          value: payload.value,
          closeDate: payload.closeDate,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(payload.proposalCreatedAt !== undefined ? { proposalCreatedAt: payload.proposalCreatedAt } as any : {}),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          ...(payload.rating !== undefined ? { rating: payload.rating } as any : {}),
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
  await db.salesOpportunity.delete({ where: { id } });
}

export async function updateOpportunityStage(id: string, stage: OppStage): Promise<void> {
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
  const rows = await db.salesActivity.findMany({
    where: {
      ...(filters?.userId ? { userId: filters.userId } : {}),
      ...(filters?.userName ? { userName: filters.userName } : {}),
      ...(filters?.weekStart ? { weekStart: new Date(filters.weekStart) } : {}),
      ...(filters?.opportunityId ? { opportunityId: filters.opportunityId } : {}),
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
  const row = await db.salesActivity.create({
    data: {
      userId: data.userId,
      userName: data.userName,
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
  await db.salesActivity.delete({ where: { id } });
}

// ─── Summary ──────────────────────────────────────────────────────────────────

export async function getActivitySummary(weekStart: string, userName?: string): Promise<ActivitySummary> {
  const rows = await db.salesActivity.findMany({
    where: {
      weekStart: new Date(weekStart),
      ...(userName ? { userName } : {}),
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
