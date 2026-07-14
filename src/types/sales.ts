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

export interface SalesCompany {
  id: string;
  name: string;
  domain: string;
  notes: string;
  dealDeskId: string | null;
  createdAt: string;
  updatedAt: string;
  opportunities?: SalesOpportunity[];
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
  proposalCreatedAt: string | null;
  rating: ProposalRating | null;
  createdAt: string;
  updatedAt: string;
  company?: Pick<SalesCompany, "id" | "name" | "domain">;
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

// Kept for backward compat references
export type SalesLogo = SalesCompany;
export const LOGO_STAGES = OPP_STAGES;
export type LogoStage = OppStage;
