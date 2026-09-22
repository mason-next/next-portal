// DB row → client DTO mappers shared by the sales/CRM server-action modules.
// Deliberately NOT a "use server" file: every export of a "use server" module becomes a
// callable RPC endpoint, and these are internal helpers.

import type {
  SalesCompany as DbCompany,
  SalesOpportunity as DbOpp,
  SalesNote as DbNote,
  SalesTask as DbTask,
  SalesLead as DbLead,
  SalesAuditLog as DbAudit,
} from "@prisma/client";
import type {
  SalesCompany, SalesOpportunity, SalesActivity, SalesOppInvoice, CompanyContact,
  CommissionTeamMember, OppInvoiceStatus, ActivityType, OppStage, ProposalRating,
  SalesContact, SalesNote, SalesTask, SalesLead, SalesAuditEntry, AccountStatus,
  ForecastCategory, NoteKind, NoteAttachment, TaskStatus, TaskPriority, LeadStatus,
} from "@/types/sales";
import { PROPOSAL_RATINGS, ACCOUNT_STATUSES, FORECAST_CATEGORIES } from "@/types/sales";

type CompanyRef = { id: string; name: string; domain: string };

// ─── Stages ───────────────────────────────────────────────────────────────────

const STAGE_MAP: Record<string, OppStage> = {
  ClosedWon: "Closed Won",
  ClosedLost: "Closed Lost",
};
const STAGE_TO_DB: Record<string, string> = {
  "Closed Won": "ClosedWon",
  "Closed Lost": "ClosedLost",
};

export type DbOppStage = "Prospecting" | "Qualifying" | "Proposal" | "Negotiation" | "ClosedWon" | "ClosedLost";

export function toStage(s: string): OppStage {
  return (STAGE_MAP[s] ?? s) as OppStage;
}

export function stageToDb(s: OppStage | string): DbOppStage {
  return (STAGE_TO_DB[s] ?? s) as DbOppStage;
}

const VALID_RATINGS = new Set<string>(PROPOSAL_RATINGS);
export function sanitizeRating(r: string | undefined | null): ProposalRating | null {
  if (r && VALID_RATINGS.has(r)) return r as ProposalRating;
  return null;
}

const VALID_ACCOUNT_STATUSES = new Set<string>(ACCOUNT_STATUSES);
export function sanitizeAccountStatus(s: string | undefined | null): AccountStatus {
  return s && VALID_ACCOUNT_STATUSES.has(s) ? (s as AccountStatus) : "Prospect";
}

const VALID_FORECAST = new Set<string>(FORECAST_CATEGORIES);
export function sanitizeForecast(s: string | undefined | null): ForecastCategory | null {
  return s && VALID_FORECAST.has(s) ? (s as ForecastCategory) : null;
}

export function clampProbability(p: number | null | undefined): number | null {
  if (p === null || p === undefined || Number.isNaN(p)) return null;
  return Math.max(0, Math.min(100, Math.round(p)));
}

// ─── Company / Opportunity ────────────────────────────────────────────────────

export function toCompany(
  r: DbCompany & { opportunities?: SalesOpportunity[] },
): SalesCompany {
  return {
    id: r.id,
    name: r.name,
    domain: r.domain,
    notes: r.notes,
    dealDeskId: r.dealDeskId,
    ownerId: r.ownerId,
    ownerName: r.ownerName,
    accountStatus: sanitizeAccountStatus(r.accountStatus),
    territory: r.territory,
    vertical: r.vertical,
    phone: r.phone,
    address: r.address,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    opportunities: r.opportunities,
  };
}

export function toOpp(
  r: DbOpp & {
    company?: CompanyRef;
    invoices?: SalesOppInvoice[];
    children?: SalesOpportunity[];
  },
): SalesOpportunity {
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
    commissionTeam: Array.isArray(r.commissionTeam) ? (r.commissionTeam as unknown as CommissionTeamMember[]) : null,
    parentOppId: r.parentOppId ?? null,
    probability: r.probability,
    forecastCategory: sanitizeForecast(r.forecastCategory),
    nextStep: r.nextStep,
    nextStepDate: r.nextStepDate?.toISOString() ?? null,
    nextStepOwnerId: r.nextStepOwnerId,
    nextStepOwnerName: r.nextStepOwnerName,
    leadSource: r.leadSource,
    stageChangedAt: r.stageChangedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    company: r.company,
    invoices: r.invoices,
    children: r.children,
  };
}

export function toInvoice(r: {
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

export function toActivity(r: {
  id: string; userId: string | null; userName: string;
  companyId: string | null; opportunityId: string | null; type: string;
  description: string; contacts: unknown; aiGenerated: boolean;
  weekStart: Date; createdAt: Date;
  company?: CompanyRef | null;
  opportunity?: { id: string; name: string; company: CompanyRef } | null;
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
    company: r.company ? { id: r.company.id, name: r.company.name, domain: r.company.domain } : null,
    opportunity: r.opportunity
      ? {
          id: r.opportunity.id,
          name: r.opportunity.name,
          company: { id: r.opportunity.company.id, name: r.opportunity.company.name, domain: r.opportunity.company.domain },
        }
      : null,
  };
}

export function toCompanyContact(r: {
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

// ─── CRM records ──────────────────────────────────────────────────────────────

export function toNote(
  r: DbNote & {
    company?: CompanyRef;
    opportunity?: { id: string; name: string } | null;
    contact?: { id: string; name: string } | null;
  },
): SalesNote {
  return {
    id: r.id,
    companyId: r.companyId,
    opportunityId: r.opportunityId,
    contactId: r.contactId,
    userId: r.userId,
    userName: r.userName,
    noteDate: r.noteDate.toISOString(),
    kind: r.kind as NoteKind,
    body: r.body,
    attachments: Array.isArray(r.attachments) ? (r.attachments as unknown as NoteAttachment[]) : [],
    pinned: r.pinned,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    company: r.company ? { id: r.company.id, name: r.company.name, domain: r.company.domain } : undefined,
    opportunity: r.opportunity ? { id: r.opportunity.id, name: r.opportunity.name } : null,
    contact: r.contact ? { id: r.contact.id, name: r.contact.name } : null,
  };
}

export function toTask(
  r: DbTask & {
    company?: CompanyRef | null;
    opportunity?: { id: string; name: string } | null;
  },
): SalesTask {
  return {
    id: r.id,
    companyId: r.companyId,
    opportunityId: r.opportunityId,
    title: r.title,
    description: r.description,
    dueDate: r.dueDate?.toISOString() ?? null,
    status: r.status as TaskStatus,
    priority: r.priority as TaskPriority,
    assigneeId: r.assigneeId,
    assigneeName: r.assigneeName,
    createdById: r.createdById,
    createdByName: r.createdByName,
    autoGenerated: r.autoGenerated,
    completedAt: r.completedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    company: r.company ? { id: r.company.id, name: r.company.name, domain: r.company.domain } : null,
    opportunity: r.opportunity ? { id: r.opportunity.id, name: r.opportunity.name } : null,
  };
}

export function toLead(r: DbLead): SalesLead {
  return {
    id: r.id,
    name: r.name,
    companyName: r.companyName,
    title: r.title,
    email: r.email,
    phone: r.phone,
    source: r.source,
    status: r.status as LeadStatus,
    ownerId: r.ownerId,
    ownerName: r.ownerName,
    territory: r.territory,
    vertical: r.vertical,
    estimatedValue: r.estimatedValue,
    notes: r.notes,
    convertedCompanyId: r.convertedCompanyId,
    convertedOpportunityId: r.convertedOpportunityId,
    convertedAt: r.convertedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

export function toAudit(r: DbAudit): SalesAuditEntry {
  return {
    id: r.id,
    entityType: r.entityType as SalesAuditEntry["entityType"],
    entityId: r.entityId,
    companyId: r.companyId,
    opportunityId: r.opportunityId,
    action: r.action,
    field: r.field,
    oldValue: r.oldValue,
    newValue: r.newValue,
    userName: r.userName,
    createdAt: r.createdAt.toISOString(),
  };
}
