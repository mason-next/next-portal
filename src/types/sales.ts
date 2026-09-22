export const PROPOSAL_RATINGS = [
  "Highly Likely",
  "Likely",
  "Possible",
  "Unlikely",
] as const;
export type ProposalRating = (typeof PROPOSAL_RATINGS)[number];

export const OPP_STAGES = [
  "Prospecting",
  "Qualifying",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
] as const;
export type OppStage = (typeof OPP_STAGES)[number];

export const ACTIVITY_TYPES = [
  "Call",
  "Email",
  "Meeting",
  "Research",
  "Demo",
  "Proposal",
  "Other",
] as const;
export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export interface SalesContact {
  name: string;
  title: string;
}

export interface CompanyContact {
  id: string;
  companyId: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export interface SalesCompany {
  id: string;
  name: string;
  domain: string;
  notes: string;
  dealDeskId: string | null;
  // CRM account fields (optional so older callers that only know name/domain keep compiling)
  ownerId?: string | null;
  ownerName?: string;
  accountStatus?: AccountStatus;
  territory?: string;
  vertical?: string;
  phone?: string;
  address?: string;
  createdAt: string;
  updatedAt: string;
  opportunities?: SalesOpportunity[];
}

export interface CommissionTeamMember {
  userId: string | null;
  name: string;
  role: "director" | "bd" | "de" | "custom";
  rateBps: number;
}

export type OppInvoiceStatus = "Outstanding" | "Paid";

export interface SalesOppInvoice {
  id: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface SalesOpportunity {
  id: string;
  companyId: string;
  name: string;
  stage: OppStage;
  ownerId: string | null;
  ownerName: string;
  value: number; // cents
  notes: string;
  closeDate: string | null;
  cwNumber: string | null;
  cwLink: string | null;
  proposalCreatedAt: string | null;
  rating: ProposalRating | null;
  commissionTeam?: CommissionTeamMember[] | null;
  parentOppId?: string | null;
  // CRM forecasting / next-action fields (optional for backward compat with imports)
  /** Explicit win probability 0–100; null → stage default (see effectiveProbability). */
  probability?: number | null;
  forecastCategory?: ForecastCategory | null;
  nextStep?: string;
  nextStepDate?: string | null;
  nextStepOwnerId?: string | null;
  nextStepOwnerName?: string;
  leadSource?: string;
  stageChangedAt?: string | null;
  invoices?: SalesOppInvoice[];
  children?: SalesOpportunity[];
  createdAt: string;
  updatedAt: string;
  company?: Pick<SalesCompany, "id" | "name" | "domain">;
}

export interface SalesOppComment {
  id: string;
  opportunityId: string;
  userId: string | null;
  userName: string;
  message: string;
  richContent: unknown | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalesActivity {
  id: string;
  userId: string | null;
  userName: string;
  companyId: string | null;
  opportunityId: string | null;
  type: ActivityType;
  description: string;
  contacts: SalesContact[];
  aiGenerated: boolean;
  weekStart: string;
  createdAt: string;
  company?: Pick<SalesCompany, "id" | "name" | "domain"> | null;
  opportunity?: (Pick<SalesOpportunity, "id" | "name"> & {
    company: Pick<SalesCompany, "id" | "name" | "domain">;
  }) | null;
}

export interface ActivitySummary {
  totalActivities: number;
  byType: Record<string, number>;
  byPerson: Record<string, number>;
}

export interface QuotePresentation {
  id: string;
  slug: string;
  title: string;
  customer: string;
  isActive: boolean;
  htmlFile: string;
  storageKey: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  uniqueVisitors?: number;
  totalViews?: number;
  lastAccessed?: string | null;
}

export interface QuoteAccessLog {
  id: string;
  quoteId: string;
  email: string;
  ip: string;
  userAgent: string;
  accessedAt: string;
}

export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export function formatWeekLabel(weekStart: string): string {
  const d = new Date(weekStart);
  const end = new Date(d);
  end.setUTCDate(end.getUTCDate() + 6);
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
}

const STAGE_ORDER: Record<OppStage, number> = {
  Prospecting: 0, Qualifying: 1, Proposal: 2,
  Negotiation: 3, "Closed Won": 4, "Closed Lost": 5,
};

export function sortByStage(a: SalesOpportunity, b: SalesOpportunity): number {
  return STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage];
}

// ─── CRM ──────────────────────────────────────────────────────────────────────

export const ACCOUNT_STATUSES = ["Prospect", "Customer", "Former Customer", "Partner"] as const;
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number];

export const ACTIVE_STAGES: readonly OppStage[] = ["Prospecting", "Qualifying", "Proposal", "Negotiation"];
export function isOpenStage(stage: OppStage): boolean {
  return stage !== "Closed Won" && stage !== "Closed Lost";
}

/** Default win probability by stage, used when an opp has no explicit probability. */
export const STAGE_PROBABILITY: Record<OppStage, number> = {
  Prospecting: 10,
  Qualifying: 25,
  Proposal: 50,
  Negotiation: 75,
  "Closed Won": 100,
  "Closed Lost": 0,
};

export function effectiveProbability(o: Pick<SalesOpportunity, "stage" | "probability">): number {
  if (o.stage === "Closed Won") return 100;
  if (o.stage === "Closed Lost") return 0;
  return o.probability ?? STAGE_PROBABILITY[o.stage];
}

/** Probability-weighted value in cents. */
export function weightedValue(o: Pick<SalesOpportunity, "stage" | "probability" | "value">): number {
  return Math.round((o.value * effectiveProbability(o)) / 100);
}

export const FORECAST_CATEGORIES = ["Pipeline", "Best Case", "Commit", "Closed", "Omitted"] as const;
export type ForecastCategory = (typeof FORECAST_CATEGORIES)[number];

/** Forecast category: explicit override, else derived from stage + probability. */
export function effectiveForecastCategory(
  o: Pick<SalesOpportunity, "stage" | "probability" | "forecastCategory">,
): ForecastCategory {
  if (o.stage === "Closed Won") return "Closed";
  if (o.stage === "Closed Lost") return "Omitted";
  if (o.forecastCategory) return o.forecastCategory;
  const p = effectiveProbability(o);
  if (p >= 75) return "Commit";
  if (p >= 50) return "Best Case";
  return "Pipeline";
}

export const NOTE_KINDS = ["Note", "Call", "Meeting", "Email", "Site Visit", "Demo", "Internal"] as const;
export type NoteKind = (typeof NOTE_KINDS)[number];

export interface NoteAttachment {
  fileName: string;
  fileSize: number;
  mimeType: string;
  storagePath: string;
}

export interface SalesNote {
  id: string;
  companyId: string;
  opportunityId: string | null;
  contactId: string | null;
  userId: string | null;
  userName: string;
  /** The date the touchpoint happened (not when it was typed in). */
  noteDate: string;
  kind: NoteKind;
  body: string;
  attachments: NoteAttachment[];
  pinned: boolean;
  createdAt: string;
  updatedAt: string;
  company?: Pick<SalesCompany, "id" | "name" | "domain">;
  opportunity?: Pick<SalesOpportunity, "id" | "name"> | null;
  contact?: Pick<CompanyContact, "id" | "name"> | null;
}

export const TASK_STATUSES = ["Open", "Done"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];
export const TASK_PRIORITIES = ["Low", "Normal", "High"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface SalesTask {
  id: string;
  companyId: string | null;
  opportunityId: string | null;
  title: string;
  description: string;
  dueDate: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  assigneeName: string;
  createdById: string | null;
  createdByName: string;
  autoGenerated: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  company?: Pick<SalesCompany, "id" | "name" | "domain"> | null;
  opportunity?: Pick<SalesOpportunity, "id" | "name"> | null;
}

export const LEAD_STATUSES = ["New", "Working", "Qualified", "Disqualified", "Converted"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];
export const LEAD_SOURCES = ["Referral", "Website", "Event", "Cold Outreach", "Partner", "Existing Customer", "Other"] as const;

export interface SalesLead {
  id: string;
  name: string;
  companyName: string;
  title: string;
  email: string;
  phone: string;
  source: string;
  status: LeadStatus;
  ownerId: string | null;
  ownerName: string;
  territory: string;
  vertical: string;
  estimatedValue: number; // cents
  notes: string;
  convertedCompanyId: string | null;
  convertedOpportunityId: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalesAuditEntry {
  id: string;
  entityType: "company" | "opportunity" | "contact" | "note" | "task" | "lead";
  entityId: string;
  companyId: string | null;
  opportunityId: string | null;
  action: string;
  field: string;
  oldValue: string;
  newValue: string;
  userName: string;
  createdAt: string;
}

/** Everything the account snapshot page needs in one round trip. */
export interface AccountSnapshot {
  company: SalesCompany;
  opportunities: SalesOpportunity[];
  contacts: CompanyContact[];
  notes: SalesNote[];
  tasks: SalesTask[];
  activities: SalesActivity[];
  history: SalesAuditEntry[];
}

/** A dated item for the agenda: open task, opp next step, or expected close. */
export interface AgendaItem {
  kind: "task" | "nextStep" | "closeDate";
  id: string;
  date: string;
  title: string;
  ownerName: string;
  companyId: string | null;
  companyName: string;
  opportunityId: string | null;
  opportunityName: string;
  value: number;
  priority?: TaskPriority;
}

// Kept for backward compat references
export type SalesLogo = SalesCompany;
export const LOGO_STAGES = OPP_STAGES;
export type LogoStage = OppStage;
