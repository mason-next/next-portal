"use server";

import { db } from "@/lib/db";
import type { DealDeskQuote, DealCategory, TeamMember, ApprovalEvent, AuditEntry, PayoutMilestone, PayoutEvent } from "@/types/deal-desk";
import type { DealDeskQuote as PrismaQuote } from "@prisma/client";
import { DEFAULT_PAYOUT_MILESTONES } from "@/types/deal-desk";

// ─── Type mapping ─────────────────────────────────────────────────────────────

// Prisma CommissionStatus enum uses PendingApproval; our app type uses "Pending Approval"
function mapCommissionStatus(s: string): DealDeskQuote["commissionStatus"] {
  if (s === "PendingApproval") return "Pending Approval";
  return s as DealDeskQuote["commissionStatus"];
}

function unmapCommissionStatus(s: string): string {
  if (s === "Pending Approval") return "PendingApproval";
  return s;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toQuote(p: PrismaQuote): DealDeskQuote {
  const milestones = Array.isArray(p.milestones) && p.milestones.length
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ? (p.milestones as any[]) as PayoutMilestone[]
    : DEFAULT_PAYOUT_MILESTONES;

  return {
    id: p.id,
    customer: p.customer,
    projectName: p.projectName,
    quoteNumber: p.quoteNumber,
    opportunityNumber: p.opportunityNumber,
    revision: p.revision,
    version: p.version,
    projectType: p.projectType as DealDeskQuote["projectType"],
    salesperson: p.salesperson,
    importedAt: p.importedAt.toISOString(),
    importedBy: p.importedBy,
    quarter: p.quarter,
    status: p.status as DealDeskQuote["status"],
    commissionStatus: mapCommissionStatus(p.commissionStatus),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categories: (p.categories as any[]) as DealCategory[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    team: (p.team as any[]) as TeamMember[],
    executiveNotes: p.executiveNotes,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    approvalHistory: (p.approvalHistory as any[]) as ApprovalEvent[],
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    auditLog: (p.auditLog as any[]) as AuditEntry[],
    sourceFiles: p.sourceFiles,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    billingCompletionPct: p.billingCompletionPct,
    milestones,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payoutEvents: ((p.payoutEvents as any[]) ?? []) as PayoutEvent[],
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getDealDeskQuotes(): Promise<DealDeskQuote[]> {
  const rows = await db.dealDeskQuote.findMany({
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toQuote);
}

export async function getDealDeskQuote(id: string): Promise<DealDeskQuote | null> {
  const row = await db.dealDeskQuote.findUnique({ where: { id } });
  return row ? toQuote(row) : null;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function saveDealDeskQuote(quote: DealDeskQuote): Promise<void> {
  const data = {
    customer: quote.customer,
    projectName: quote.projectName,
    quoteNumber: quote.quoteNumber,
    opportunityNumber: quote.opportunityNumber,
    revision: quote.revision,
    version: quote.version,
    projectType: quote.projectType,
    salesperson: quote.salesperson,
    importedAt: new Date(quote.importedAt),
    importedBy: quote.importedBy,
    quarter: quote.quarter,
    status: quote.status as "Pending" | "Approved" | "Rejected",
    commissionStatus: unmapCommissionStatus(quote.commissionStatus) as
      | "Estimated"
      | "PendingApproval"
      | "Approved"
      | "Paid",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    categories: quote.categories as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    team: quote.team as any,
    executiveNotes: quote.executiveNotes,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    approvalHistory: quote.approvalHistory as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    auditLog: quote.auditLog as any,
    sourceFiles: quote.sourceFiles,
    billingCompletionPct: quote.billingCompletionPct,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    milestones: quote.milestones as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    payoutEvents: quote.payoutEvents as any,
  };

  await db.dealDeskQuote.upsert({
    where: { id: quote.id },
    update: data,
    create: { id: quote.id, ...data },
  });
}

export async function deleteDealDeskQuote(id: string): Promise<void> {
  await db.dealDeskQuote.delete({ where: { id } });
}
