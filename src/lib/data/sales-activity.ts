"use server";

import { db } from "@/lib/db";
import type { SalesActivity, SalesLogo, ActivityType, LogoStage } from "@/types/sales";
import type {
  SalesActivity as PrismaActivity,
  SalesLogo as PrismaLogo,
} from "@prisma/client";

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toActivity(r: PrismaActivity & { logo?: PrismaLogo | null }): SalesActivity {
  return {
    id: r.id,
    userId: r.userId,
    userName: r.userName,
    logoId: r.logoId,
    type: r.type as ActivityType,
    description: r.description,
    weekStart: r.weekStart.toISOString(),
    durationMins: r.durationMins,
    createdAt: r.createdAt.toISOString(),
    logo: r.logo
      ? { id: r.logo.id, company: r.logo.company, domain: r.logo.domain }
      : null,
  };
}

function toLogo(r: PrismaLogo): SalesLogo {
  return {
    id: r.id,
    company: r.company,
    domain: r.domain,
    stage: r.stage as LogoStage,
    ownerId: r.ownerId,
    ownerName: r.ownerName,
    notes: r.notes,
    dealDeskId: r.dealDeskId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

// ─── Logos ────────────────────────────────────────────────────────────────────

export async function getSalesLogos(): Promise<SalesLogo[]> {
  const rows = await db.salesLogo.findMany({ orderBy: { createdAt: "desc" } });
  return rows.map(toLogo);
}

export async function getSalesLogo(id: string): Promise<SalesLogo | null> {
  const row = await db.salesLogo.findUnique({ where: { id } });
  return row ? toLogo(row) : null;
}

export async function upsertSalesLogo(
  data: Omit<SalesLogo, "id" | "createdAt" | "updatedAt"> & { id?: string }
): Promise<SalesLogo> {
  const payload = {
    company: data.company,
    domain: data.domain,
    stage: data.stage as "Prospecting" | "Qualifying" | "Proposal" | "Negotiation" | "ClosedWon" | "ClosedLost",
    ownerId: data.ownerId,
    ownerName: data.ownerName,
    notes: data.notes,
    dealDeskId: data.dealDeskId,
  };

  // Map display stage → Prisma enum name
  const stageMap: Record<string, string> = {
    "Closed Won": "ClosedWon",
    "Closed Lost": "ClosedLost",
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (payload as any).stage = stageMap[data.stage] ?? data.stage;

  const row = data.id
    ? await db.salesLogo.update({ where: { id: data.id }, data: payload })
    : await db.salesLogo.create({ data: payload });
  return toLogo(row);
}

export async function deleteSalesLogo(id: string): Promise<void> {
  await db.salesLogo.delete({ where: { id } });
}

// ─── Activities ───────────────────────────────────────────────────────────────

export async function getSalesActivities(filters?: {
  userId?: string;
  weekStart?: string;
  logoId?: string;
}): Promise<SalesActivity[]> {
  const rows = await db.salesActivity.findMany({
    where: {
      ...(filters?.userId ? { userId: filters.userId } : {}),
      ...(filters?.weekStart ? { weekStart: new Date(filters.weekStart) } : {}),
      ...(filters?.logoId ? { logoId: filters.logoId } : {}),
    },
    include: { logo: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toActivity);
}

export async function createSalesActivity(
  data: Omit<SalesActivity, "id" | "createdAt" | "logo">
): Promise<SalesActivity> {
  const row = await db.salesActivity.create({
    data: {
      userId: data.userId,
      userName: data.userName,
      logoId: data.logoId,
      type: data.type as "Call" | "Email" | "Meeting" | "Research" | "Demo" | "Proposal" | "Other",
      description: data.description,
      weekStart: new Date(data.weekStart),
      durationMins: data.durationMins,
    },
    include: { logo: true },
  });
  return toActivity(row);
}

export async function deleteSalesActivity(id: string): Promise<void> {
  await db.salesActivity.delete({ where: { id } });
}

// ─── Aggregates ───────────────────────────────────────────────────────────────

export async function getActivitySummary(weekStart: string): Promise<{
  totalActivities: number;
  totalMins: number;
  byType: Record<string, number>;
  byPerson: Record<string, number>;
}> {
  const rows = await db.salesActivity.findMany({
    where: { weekStart: new Date(weekStart) },
  });
  const byType: Record<string, number> = {};
  const byPerson: Record<string, number> = {};
  let totalMins = 0;
  for (const r of rows) {
    byType[r.type] = (byType[r.type] ?? 0) + 1;
    byPerson[r.userName] = (byPerson[r.userName] ?? 0) + 1;
    totalMins += r.durationMins;
  }
  return { totalActivities: rows.length, totalMins, byType, byPerson };
}
