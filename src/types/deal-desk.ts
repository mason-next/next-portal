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
  importedAt: string;
  importedBy: string;
  quarter: string;
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
}
