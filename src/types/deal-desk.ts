export const PROJECT_TYPES = ["Enterprise", "Pod", "Custom"] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const DEAL_STATUSES = ["Pending", "Approved", "Rejected"] as const;
export type DealStatus = (typeof DEAL_STATUSES)[number];

export const COMMISSION_STATUSES = ["Estimated", "Pending Approval", "Approved", "Paid"] as const;
export type CommissionStatus = (typeof COMMISSION_STATUSES)[number];

export const CATEGORY_NAMES = ["Equipment", "Bulk Materials", "Labor", "G&A", "Service", "Other"] as const;
export type CategoryName = (typeof CATEGORY_NAMES)[number];

export const ROLE_KEYS = ["director", "bd", "de", "custom"] as const;
export type RoleKey = (typeof ROLE_KEYS)[number];

// All money stored in cents (integers) to avoid floating-point errors
export interface DealCategory {
  name: CategoryName;
  costCents: number;
  revenueCents: number;
}

export interface TeamMember {
  id: string;
  userId?: string;       // linked AppUser.id
  avatarUrl?: string | null;
  name: string;
  role: string;
  matrixKey: RoleKey;
  customRateBps?: number; // basis points; only used when matrixKey === "custom"
}

export interface CommissionBand {
  label: string;
  minPct: number;
  maxPct: number;
  totalBps: number;
  directorBps: number;
  bdBps: number;
  deBps: number;
}

export interface ApprovalEvent {
  id: string;
  status: DealStatus;
  user: string;
  comment: string;
  timestamp: string;
}

export interface AuditEntry {
  id: string;
  action: string;
  detail: string;
  user: string;
  timestamp: string;
}

export interface PayoutMilestone {
  id: string;
  label: string;
  triggerBillingPct: number; // milestone triggers when billingCompletionPct >= this
  commissionPct: number;     // % of total commission pool earned at this milestone
}

export interface PayoutEvent {
  id: string;
  date: string;
  commissionPctReleased: number; // % of total commission pool actually paid out
  notes: string;
  recordedBy: string;
}

// Enterprise: 50% at signing, 40% at delivery, 10% at closeout
export const DEFAULT_PAYOUT_MILESTONES: PayoutMilestone[] = [
  { id: "m1", label: "Contract Signing",  triggerBillingPct: 0,  commissionPct: 50 },
  { id: "m2", label: "Project Delivery",  triggerBillingPct: 50, commissionPct: 40 },
  { id: "m3", label: "Project Closeout",  triggerBillingPct: 90, commissionPct: 10 },
];

// Pod/SE: 50% on opportunity win + first 50% invoiced; 50% on project close + all invoices paid
export const POD_PAYOUT_MILESTONES: PayoutMilestone[] = [
  { id: "pm1", label: "Opportunity Won + 50% Invoiced",    triggerBillingPct: 50,  commissionPct: 50 },
  { id: "pm2", label: "Project Close + All Invoices Paid", triggerBillingPct: 100, commissionPct: 50 },
];

export function defaultMilestonesForType(projectType: ProjectType): PayoutMilestone[] {
  return projectType === "Pod" ? POD_PAYOUT_MILESTONES : DEFAULT_PAYOUT_MILESTONES;
}

export function quarterFromDate(isoDate: string): string {
  const d = new Date(isoDate + "T12:00:00"); // noon avoids timezone edge cases
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} ${d.getFullYear()}`;
}

// UI preference only — not domain data. Stored in localStorage.
export type DealDeskRole = "management" | "salesperson";

export interface DealDeskUser {
  name: string;
  role: DealDeskRole;
}

export interface DealDeskQuote {
  id: string;
  customer: string;
  projectName: string;
  quoteNumber: string;
  opportunityNumber: string;
  revision: string;
  version: number;
  projectType: ProjectType;
  salesperson: string;
  salespersonId?: string;
  importedAt: string;
  importedBy: string;
  bookingDate?: string;  // ISO date string (YYYY-MM-DD); quarter is derived from this
  quarter: string;       // derived display value, e.g. "Q2 2026"
  status: DealStatus;
  commissionStatus: CommissionStatus;
  categories: DealCategory[];
  team: TeamMember[];
  executiveNotes: string;
  approvalHistory: ApprovalEvent[];
  auditLog: AuditEntry[];
  sourceFiles: string[];
  createdAt: string;
  updatedAt: string;
  billingCompletionPct: number;
  milestones: PayoutMilestone[];
  payoutEvents: PayoutEvent[];
}
