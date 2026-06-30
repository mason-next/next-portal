"use server";

import { db } from "@/lib/db";
import type {
  SalesCompany, SalesOpportunity, SalesActivity,
  ActivityType, OppStage, SalesContact,
} from "@/types/sales";
import { ACTIVITY_TYPES } from "@/types/sales";

const VALID_ACTIVITY_TYPES = new Set<string>(ACTIVITY_TYPES);
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
  notes: string; closeDate: Date | null; createdAt: Date; updatedAt: Date;
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

export async function getSalesCompanies(): Promise<SalesCompany[]> {
  const rows = await db.salesCompany.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      opportunities: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
  return rows.map((r) => toCompany({
    ...r,
    opportunities: r.opportunities.map(toOpp),
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

// ─── Opportunities ────────────────────────────────────────────────────────────

export async function upsertSalesOpportunity(
  data: Omit<SalesOpportunity, "id" | "createdAt" | "updatedAt" | "company"> & { id?: string }
): Promise<SalesOpportunity> {
  const payload = {
    companyId: data.companyId,
    name: data.name,
    stage: (STAGE_TO_DB[data.stage] ?? data.stage) as "Prospecting" | "Qualifying" | "Proposal" | "Negotiation" | "ClosedWon" | "ClosedLost",
    ownerId: data.ownerId,
    ownerName: data.ownerName,
    value: data.value,
    notes: data.notes,
    closeDate: data.closeDate ? new Date(data.closeDate) : null,
  };
  const row = data.id
    ? await db.salesOpportunity.update({ where: { id: data.id }, data: payload })
    : await db.salesOpportunity.create({ data: payload });
  return toOpp(row);
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
  weekStart?: string;
  opportunityId?: string;
}): Promise<SalesActivity[]> {
  const rows = await db.salesActivity.findMany({
    where: {
      ...(filters?.userId ? { userId: filters.userId } : {}),
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

export async function getActivitySummary(weekStart: string): Promise<ActivitySummary> {
  const rows = await db.salesActivity.findMany({
    where: { weekStart: new Date(weekStart) },
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
