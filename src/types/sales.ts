export const LOGO_STAGES = [
  "Prospecting",
  "Qualifying",
  "Proposal",
  "Negotiation",
  "Closed Won",
  "Closed Lost",
] as const;
export type LogoStage = (typeof LOGO_STAGES)[number];

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

export interface SalesLogo {
  id: string;
  company: string;
  domain: string;
  stage: LogoStage;
  ownerId: string | null;
  ownerName: string;
  notes: string;
  dealDeskId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SalesActivity {
  id: string;
  userId: string | null;
  userName: string;
  logoId: string | null;
  type: ActivityType;
  description: string;
  weekStart: string; // ISO Monday of the week
  durationMins: number;
  createdAt: string;
  logo?: Pick<SalesLogo, "id" | "company" | "domain"> | null;
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
  // aggregated
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

// Returns the ISO date string for the Monday of the week containing `date`
export function getWeekStart(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getUTCDay(); // 0=Sun
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

const STAGE_ORDER: Record<LogoStage, number> = {
  Prospecting: 0, Qualifying: 1, Proposal: 2,
  Negotiation: 3, "Closed Won": 4, "Closed Lost": 5,
};
export interface ActivitySummary {
  byType: Record<string, number>;
  byPerson: Record<string, number>;
  totalMins: number;
}

export function sortByStage(a: SalesLogo, b: SalesLogo): number {
  return STAGE_ORDER[a.stage] - STAGE_ORDER[b.stage];
}
