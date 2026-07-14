"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SalesActivity, SalesCompany, SalesContact, SalesOpportunity } from "@/types/sales";
import type { AppUser } from "@/types/user";

// ── constants ──────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  Prospecting:   "bg-slate-100 text-slate-700",
  Qualifying:    "bg-blue-100 text-blue-700",
  Proposal:      "bg-violet-100 text-violet-700",
  Negotiation:   "bg-amber-100 text-amber-700",
  "Closed Won":  "bg-emerald-100 text-emerald-700",
  "Closed Lost": "bg-red-100 text-red-700",
};

const STAGE_BORDER_COLOR: Record<string, string> = {
  Prospecting:   "#94a3b8",
  Qualifying:    "#60a5fa",
  Proposal:      "#a78bfa",
  Negotiation:   "#fbbf24",
  "Closed Won":  "#34d399",
  "Closed Lost": "#f87171",
};

const STAGE_PRIORITY: Record<string, number> = {
  Negotiation: 0, Proposal: 1, Qualifying: 2, Prospecting: 3,
  "Closed Won": 4, "Closed Lost": 5,
};

const RATING_COLORS: Record<string, string> = {
  "Highly Likely": "bg-emerald-100 text-emerald-700",
  "Likely":        "bg-blue-100 text-blue-700",
  "Possible":      "bg-amber-100 text-amber-700",
  "Unlikely":      "bg-red-100 text-red-600",
};

const RATING_ORDER: Record<string, number> = {
  "Highly Likely": 0, "Likely": 1, "Possible": 2, "Unlikely": 3,
};

const TYPE_ICONS: Record<string, string> = {
  Call: "📞", Email: "✉️", Meeting: "🗓", Research: "🔍",
  Demo: "💻", Proposal: "📄", Other: "📝",
};

const TYPE_BG: Record<string, string> = {
  Call:     "bg-blue-50 text-blue-500 dark:bg-blue-900/30 dark:text-blue-400",
  Email:    "bg-indigo-50 text-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-400",
  Meeting:  "bg-violet-50 text-violet-500 dark:bg-violet-900/30 dark:text-violet-400",
  Research: "bg-amber-50 text-amber-500 dark:bg-amber-900/30 dark:text-amber-400",
  Demo:     "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400",
  Proposal: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
  Other:    "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
};

const ACTIVE_STAGES = new Set(["Prospecting", "Qualifying", "Proposal", "Negotiation"]);
const THIS_YEAR = new Date().getFullYear();

type ActivityRange = "week" | "month" | "quarter" | "all";
type OppRange = "next30" | "next90" | "nextyear" | "thisyear" | "custom" | "all";
type SortBy = "stage" | "pipeline" | "won_ytd" | "last_activity" | "company" | "activities";

const ACTIVITY_RANGE_LABELS: Record<ActivityRange, string> = {
  week: "This week", month: "30 days", quarter: "Quarter", all: "All time",
};

const OPP_RANGE_LABELS: Record<OppRange, string> = {
  next30: "Next 30 days", next90: "Next 90 days", nextyear: "Next 12 months",
  thisyear: `This year (${THIS_YEAR})`, custom: "Custom range", all: "All time",
};

const SORT_LABELS: Record<SortBy, string> = {
  stage: "Stage", pipeline: "Pipeline value", won_ytd: "Won YTD",
  last_activity: "Last activity", company: "Company name", activities: "Activity count",
};

// ── helpers ────────────────────────────────────────────────────────────────────

function getActivityRangeStart(range: ActivityRange): Date | null {
  if (range === "all") return null;
  const now = new Date();
  if (range === "week") {
    const d = new Date(now);
    const day = d.getUTCDay();
    const diff = day === 0 ? -6 : 1 - day;
    d.setUTCDate(d.getUTCDate() + diff);
    d.setUTCHours(0, 0, 0, 0);
    return d;
  }
  const days = range === "month" ? 30 : 90;
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - days);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getOppDateWindow(range: OppRange, customFrom?: string, customTo?: string): { from: Date | null; to: Date | null } {
  if (range === "all") return { from: null, to: null };
  const today = new Date(); today.setUTCHours(0, 0, 0, 0);
  if (range === "thisyear") {
    return { from: new Date(Date.UTC(THIS_YEAR, 0, 1)), to: new Date(Date.UTC(THIS_YEAR, 11, 31)) };
  }
  if (range === "custom") {
    return {
      from: customFrom ? new Date(customFrom + "T00:00:00Z") : null,
      to:   customTo   ? new Date(customTo   + "T23:59:59Z") : null,
    };
  }
  const days = range === "next30" ? 30 : range === "next90" ? 90 : 365;
  const end = new Date(today);
  end.setUTCDate(end.getUTCDate() + days);
  return { from: today, to: end };
}

function fmt(cents: number) {
  if (!cents) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(cents / 100);
}

function fmtK(cents: number) {
  if (!cents) return "—";
  const v = cents / 100;
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${Math.round(v / 1_000)}K`;
  return `$${Math.round(v)}`;
}

function oppAge(o: SalesOpportunity): number | null {
  if (!o.proposalCreatedAt) return null;
  return Math.floor((Date.now() - new Date(o.proposalCreatedAt).getTime()) / 86400000);
}

// ── sub-components ─────────────────────────────────────────────────────────────

function CompanyLogo({ domain, name, size = 40 }: { domain: string; name: string; size?: number }) {
  const [err, setErr] = useState(false);
  if (!domain || err) {
    return (
      <div
        className="rounded-xl bg-muted/60 border flex items-center justify-center shrink-0 font-bold text-muted-foreground"
        style={{ width: size, height: size, fontSize: size * 0.32 }}
      >
        {name.slice(0, 2).toUpperCase()}
      </div>
    );
  }
  return (
    <Image
      src={`https://www.google.com/s2/favicons?domain=${domain.toLowerCase().trim()}&sz=64`}
      alt={name} width={size} height={size}
      className="rounded-xl object-contain shrink-0"
      onError={() => setErr(true)} unoptimized
    />
  );
}

function PrintIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"/>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
      <rect x="6" y="14" width="12" height="8"/>
    </svg>
  );
}

// ── analytics section (Epic 7) ─────────────────────────────────────────────────

function AnalyticsSection({ pulses, activities }: {
  pulses: CompanyPulse[];
  activities: SalesActivity[];
}) {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
  const nextMonthStart = new Date(today.getFullYear(), today.getMonth() + 1, 1);
  const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0, 23, 59, 59, 999);
  const quarterEnd = new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3 + 3, 0, 23, 59, 59, 999);

  const allActiveOpps = pulses.flatMap((p) => p.activeOpps);

  // Proposal Aging buckets
  const aging = { "0–30": 0, "31–60": 0, "61–90": 0, "90+": 0 };
  let totalAge = 0; let ageCount = 0;
  for (const o of allActiveOpps) {
    const age = oppAge(o);
    if (age !== null) {
      totalAge += age; ageCount++;
      if (age <= 30) aging["0–30"]++;
      else if (age <= 60) aging["31–60"]++;
      else if (age <= 90) aging["61–90"]++;
      else aging["90+"]++;
    }
  }
  const avgAge = ageCount > 0 ? Math.round(totalAge / ageCount) : null;
  const maxAging = Math.max(...Object.values(aging), 1);

  // Pipeline by Rating
  const byRating: Record<string, number> = { "Highly Likely": 0, "Likely": 0, "Possible": 0, "Unlikely": 0, "Unrated": 0 };
  for (const o of allActiveOpps) {
    const key = o.rating ?? "Unrated";
    byRating[key] = (byRating[key] ?? 0) + (o.value ?? 0);
  }
  const maxRatingVal = Math.max(...Object.values(byRating), 1);

  // Closing Forecast
  const forecast = {
    "This Month":  allActiveOpps.filter((o) => o.closeDate && new Date(o.closeDate) <= monthEnd && new Date(o.closeDate) >= today).reduce((s, o) => s + (o.value ?? 0), 0),
    "Next Month":  allActiveOpps.filter((o) => o.closeDate && new Date(o.closeDate) >= nextMonthStart && new Date(o.closeDate) <= nextMonthEnd).reduce((s, o) => s + (o.value ?? 0), 0),
    "This Quarter": allActiveOpps.filter((o) => o.closeDate && new Date(o.closeDate) >= today && new Date(o.closeDate) <= quarterEnd).reduce((s, o) => s + (o.value ?? 0), 0),
  };

  // Activity velocity (last 30 days vs 30 before that)
  const ms30 = 30 * 86400000;
  const cut30 = new Date(Date.now() - ms30);
  const cut60 = new Date(Date.now() - ms30 * 2);
  const recent = activities.filter((a) => new Date(a.createdAt) >= cut30).length;
  const prev   = activities.filter((a) => new Date(a.createdAt) >= cut60 && new Date(a.createdAt) < cut30).length;
  const veloDelta = prev > 0 ? Math.round(((recent - prev) / prev) * 100) : null;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-5">
      <h3 className="text-sm font-semibold">Executive Analytics</h3>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {/* Proposal Aging */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Proposal Age</p>
            {avgAge !== null && <span className="text-xs text-muted-foreground">avg {avgAge}d</span>}
          </div>
          <div className="space-y-1.5">
            {(["0–30", "31–60", "61–90", "90+"] as const).map((bucket) => {
              const count = aging[bucket];
              const pct = Math.round((count / maxAging) * 100);
              const color = bucket === "0–30" ? "bg-emerald-400" : bucket === "31–60" ? "bg-amber-400" : "bg-red-400";
              return (
                <div key={bucket} className="flex items-center gap-2">
                  <span className="w-10 text-right text-[11px] text-muted-foreground tabular-nums">{bucket}d</span>
                  <div className="flex-1 h-5 rounded bg-muted/40 overflow-hidden">
                    <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-5 text-[11px] tabular-nums text-muted-foreground">{count}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Pipeline by Rating */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pipeline by Rating</p>
          <div className="space-y-1.5">
            {["Highly Likely", "Likely", "Possible", "Unlikely", "Unrated"].map((r) => {
              const val = byRating[r] ?? 0;
              const pct = Math.round((val / maxRatingVal) * 100);
              const color = r === "Highly Likely" ? "bg-emerald-400" : r === "Likely" ? "bg-blue-400" : r === "Possible" ? "bg-amber-400" : r === "Unlikely" ? "bg-red-400" : "bg-slate-300";
              return (
                <div key={r} className="flex items-center gap-2">
                  <span className="w-20 truncate text-[11px] text-muted-foreground">{r}</span>
                  <div className="flex-1 h-5 rounded bg-muted/40 overflow-hidden">
                    <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
                  </div>
                  <span className="w-14 text-right text-[11px] tabular-nums text-muted-foreground">{val > 0 ? fmtK(val) : "—"}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Closing Forecast + Activity Velocity */}
        <div className="space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Closing Forecast</p>
            <div className="space-y-1">
              {Object.entries(forecast).map(([label, val]) => (
                <div key={label} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground text-xs">{label}</span>
                  <span className={`font-semibold tabular-nums text-xs ${val > 0 ? "text-foreground" : "text-muted-foreground/40"}`}>
                    {val > 0 ? fmtK(val) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Activity Velocity</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tabular-nums">{recent}</span>
              <span className="text-xs text-muted-foreground">activities (30d)</span>
            </div>
            {veloDelta !== null && (
              <span className={`text-xs font-semibold ${veloDelta >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                {veloDelta >= 0 ? "▲" : "▼"} {Math.abs(veloDelta)}% vs prior 30d
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── types ──────────────────────────────────────────────────────────────────────

interface CompanyPulse {
  company: SalesCompany;
  activeOpps: SalesOpportunity[];
  wonOpps: SalesOpportunity[];
  lostOpps: SalesOpportunity[];
  activities: SalesActivity[];
  contacts: SalesContact[];
  topStage: string;
  openValue: number;
  wonValue: number;
  ytdWonValue: number;
  lastActivity: string | null;
}

interface SalesPulseReportProps {
  companies: SalesCompany[];
  activities: SalesActivity[];
  isManagement?: boolean;
}

// ── main component ─────────────────────────────────────────────────────────────

export function SalesPulseReport({ companies, activities, isManagement }: SalesPulseReportProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [expandedActIds, setExpandedActIds] = useState<Set<string>>(new Set());

  // ── Epic 3: independent filters for activity vs opportunity ─────────────────
  const [activityRange, setActivityRange] = useState<ActivityRange>("all");
  const [actRepFilter, setActRepFilter] = useState<string>(""); // Activity History filter

  const [oppRange, setOppRange] = useState<OppRange>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [oppRepFilter, setOppRepFilter] = useState<string>("");  // Future Pipeline filter
  const [oppRatingFilter, setOppRatingFilter] = useState<string>("");

  // ── Shared display controls ─────────────────────────────────────────────────
  const [companyFilter, setCompanyFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortBy>("stage");
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);

  useEffect(() => {
    if (!isManagement) return;
    fetch("/api/users").then((r) => r.json()).then(setAllUsers).catch(() => {});
  }, [isManagement]);

  const salesReps = useMemo(() => {
    const rawNames = new Set<string>();
    for (const a of activities) if (a.userName) rawNames.add(a.userName);
    for (const c of companies) for (const o of (c.opportunities ?? [])) if (o.ownerName) rawNames.add(o.ownerName);

    function cwSlug(u: AppUser) {
      const parts = u.name.trim().split(/\s+/);
      return parts.length < 2 ? u.name.toLowerCase() : (parts[0][0] + parts[parts.length - 1]).toLowerCase();
    }
    const byName = new Map(allUsers.map((u) => [u.name, u]));
    const bySlug = new Map(allUsers.map((u) => [cwSlug(u), u]));

    const seen = new Set<string>();
    const resolved: AppUser[] = [];
    for (const n of rawNames) {
      const user = byName.get(n) ?? bySlug.get(n.toLowerCase().trim());
      if (user && !seen.has(user.id)) {
        seen.add(user.id);
        resolved.push(user);
      }
    }
    return resolved.sort((a, b) => a.name.localeCompare(b.name));
  }, [activities, companies, allUsers]);

  // Activity History filter — uses activityRange + actRepFilter only
  const filteredActivities = useMemo(() => {
    const rangeStart = getActivityRangeStart(activityRange);
    return activities.filter((a) => {
      if (rangeStart && new Date(a.weekStart) < rangeStart) return false;
      if (actRepFilter && a.userName !== actRepFilter) return false;
      return true;
    });
  }, [activities, activityRange, actRepFilter]);

  // ── Epic 4: Rich PDF print ──────────────────────────────────────────────────
  const printReport = useCallback(() => {
    const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const allActiveOpps = companies.flatMap((c) => (c.opportunities ?? []).filter((o) => ACTIVE_STAGES.has(o.stage)));
    const allWonOpps    = companies.flatMap((c) => (c.opportunities ?? []).filter((o) => o.stage === "Closed Won"));

    const totalPipeline = allActiveOpps.reduce((s, o) => s + (o.value ?? 0), 0);
    const highlyLikely  = allActiveOpps.filter((o) => o.rating === "Highly Likely");
    const monthEnd = new Date(); monthEnd.setUTCHours(23, 59, 59, 999); monthEnd.setUTCDate(new Date(monthEnd.getFullYear(), monthEnd.getMonth() + 1, 0).getDate());
    const monthStart = new Date(); monthStart.setUTCDate(1); monthStart.setUTCHours(0, 0, 0, 0);
    const closingThisMonth = allActiveOpps.filter((o) => o.closeDate && new Date(o.closeDate) >= monthStart && new Date(o.closeDate) <= monthEnd);
    const ages = allActiveOpps.map((o) => oppAge(o)).filter((x): x is number => x !== null);
    const avgAge = ages.length > 0 ? Math.round(ages.reduce((s, v) => s + v, 0) / ages.length) : null;
    const ytdWon = allWonOpps.filter((o) => {
      const d = o.closeDate ? new Date(o.closeDate) : new Date(o.updatedAt);
      return d.getFullYear() === THIS_YEAR;
    }).reduce((s, o) => s + (o.value ?? 0), 0);

    // Per-rep stats
    const repStats = new Map<string, { pipeline: number; oppCount: number; highlyLikely: number; closingMonth: number; ages: number[] }>();
    for (const o of allActiveOpps) {
      const rep = o.ownerName || "Unassigned";
      if (!repStats.has(rep)) repStats.set(rep, { pipeline: 0, oppCount: 0, highlyLikely: 0, closingMonth: 0, ages: [] });
      const s = repStats.get(rep)!;
      s.pipeline += o.value ?? 0;
      s.oppCount++;
      if (o.rating === "Highly Likely") s.highlyLikely++;
      if (o.closeDate && new Date(o.closeDate) >= monthStart && new Date(o.closeDate) <= monthEnd) s.closingMonth++;
      const a = oppAge(o); if (a !== null) s.ages.push(a);
    }
    const repRows = Array.from(repStats.entries()).sort((a, b) => b[1].pipeline - a[1].pipeline);

    // Activity counts by rep
    const actByRep = new Map<string, Record<string, number>>();
    for (const a of activities) {
      const rep = a.userName || "Unknown";
      if (!actByRep.has(rep)) actByRep.set(rep, {});
      const m = actByRep.get(rep)!;
      m[a.type] = (m[a.type] ?? 0) + 1;
    }

    // Aging buckets
    const aging = { "0–30": 0, "31–60": 0, "61–90": 0, "90+": 0 };
    for (const age of ages) {
      if (age <= 30) aging["0–30"]++; else if (age <= 60) aging["31–60"]++; else if (age <= 90) aging["61–90"]++; else aging["90+"]++;
    }

    // Recent changes
    const msWeek = 7 * 86400000;
    const cutoff = new Date(Date.now() - msWeek);
    const recentWon = allWonOpps.filter((o) => new Date(o.updatedAt) >= cutoff);
    const recentNew = allActiveOpps.filter((o) => new Date(o.createdAt) >= cutoff);

    const htmlDoc = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<title>Sales Pulse Report — ${today}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: system-ui, -apple-system, sans-serif; font-size: 10pt; color: #111; background: #fff; }
  @page { margin: 0.65in; size: letter; }
  h1 { font-size: 18pt; font-weight: 700; }
  h2 { font-size: 11pt; font-weight: 700; color: #1a1a2e; border-bottom: 2px solid #3b82f6; padding-bottom: 4px; margin-bottom: 10px; page-break-after: avoid; }
  h3 { font-size: 9pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-bottom: 6px; }
  .page-break { page-break-before: always; }
  .header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 18px; border-bottom: 3px solid #1d4ed8; padding-bottom: 10px; }
  .header-sub { font-size: 9pt; color: #6b7280; }
  .section { margin-bottom: 20px; }
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
  .kpi { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 14px; }
  .kpi-label { font-size: 8pt; color: #6b7280; text-transform: uppercase; letter-spacing: 0.05em; }
  .kpi-value { font-size: 16pt; font-weight: 700; margin-top: 2px; }
  .kpi-value.green { color: #059669; }
  .kpi-value.amber { color: #d97706; }
  .kpi-value.red { color: #dc2626; }
  table { width: 100%; border-collapse: collapse; font-size: 9pt; }
  th { background: #f1f5f9; text-align: left; padding: 5px 8px; font-size: 8pt; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; border-bottom: 1px solid #e2e8f0; }
  td { padding: 5px 8px; border-bottom: 1px solid #f1f5f9; vertical-align: top; }
  tr:last-child td { border-bottom: none; }
  .bar-row { display: flex; align-items: center; gap: 6px; margin-bottom: 4px; }
  .bar-label { width: 48px; font-size: 8pt; color: #6b7280; text-align: right; }
  .bar-bg { flex: 1; height: 14px; background: #f1f5f9; border-radius: 3px; overflow: hidden; }
  .bar-fill { height: 100%; border-radius: 3px; }
  .bar-count { width: 20px; font-size: 8pt; color: #6b7280; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 10px; font-size: 8pt; font-weight: 600; }
  .badge-hl { background: #d1fae5; color: #065f46; }
  .badge-l  { background: #dbeafe; color: #1e40af; }
  .badge-p  { background: #fef3c7; color: #92400e; }
  .badge-u  { background: #fee2e2; color: #991b1b; }
  .tag-row { display: flex; flex-wrap: wrap; gap: 4px; }
  .rep-chip { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 4px; padding: 2px 8px; font-size: 8pt; }
  .footer { font-size: 7.5pt; color: #9ca3af; margin-top: 8px; }
</style>
</head>
<body>

<div class="header">
  <div>
    <h1>Sales Pulse Report</h1>
    <div class="header-sub">Generated ${today}</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:9pt;color:#6b7280">${allActiveOpps.length} active · ${fmt(totalPipeline) ?? "—"} pipeline</div>
  </div>
</div>

<!-- S1: Pipeline Snapshot -->
<div class="section">
  <h2>Pipeline Snapshot</h2>
  <div class="kpi-grid">
    <div class="kpi"><div class="kpi-label">Pipeline</div><div class="kpi-value">${fmt(totalPipeline) ?? "—"}</div></div>
    <div class="kpi"><div class="kpi-label">Opportunities</div><div class="kpi-value">${allActiveOpps.length}</div></div>
    <div class="kpi"><div class="kpi-label">Highly Likely</div><div class="kpi-value green">${highlyLikely.length}</div></div>
    <div class="kpi"><div class="kpi-label">Won ${THIS_YEAR}</div><div class="kpi-value green">${fmt(ytdWon) ?? "—"}</div></div>
    <div class="kpi"><div class="kpi-label">Closing This Month</div><div class="kpi-value amber">${closingThisMonth.length}</div></div>
    <div class="kpi"><div class="kpi-label">Avg Proposal Age</div><div class="kpi-value ${avgAge !== null && avgAge > 60 ? "red" : avgAge !== null && avgAge > 30 ? "amber" : ""}">${avgAge !== null ? `${avgAge}d` : "—"}</div></div>
    <div class="kpi"><div class="kpi-label">New This Week</div><div class="kpi-value">${recentNew.length}</div></div>
    <div class="kpi"><div class="kpi-label">Closed Won (Week)</div><div class="kpi-value green">${recentWon.length}</div></div>
  </div>
</div>

<!-- S2: Sales Rep Snapshot -->
${repRows.length > 0 ? `
<div class="section">
  <h2>Sales Rep Snapshot</h2>
  <table>
    <thead>
      <tr>
        <th>Rep</th>
        <th style="text-align:right">Pipeline</th>
        <th style="text-align:center">Opps</th>
        <th style="text-align:center">Highly Likely</th>
        <th style="text-align:center">Closing Month</th>
        <th style="text-align:center">Avg Age</th>
      </tr>
    </thead>
    <tbody>
      ${repRows.map(([rep, s]) => {
        const avg = s.ages.length > 0 ? Math.round(s.ages.reduce((a, b) => a + b, 0) / s.ages.length) : null;
        return `<tr>
          <td><strong>${rep}</strong></td>
          <td style="text-align:right;font-weight:600">${fmt(s.pipeline) ?? "—"}</td>
          <td style="text-align:center">${s.oppCount}</td>
          <td style="text-align:center;color:#059669;font-weight:600">${s.highlyLikely}</td>
          <td style="text-align:center;color:#d97706">${s.closingMonth}</td>
          <td style="text-align:center;color:${avg !== null && avg > 60 ? "#dc2626" : avg !== null && avg > 30 ? "#d97706" : "#6b7280"}">${avg !== null ? `${avg}d` : "—"}</td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>
</div>` : ""}

<!-- S3: Pipeline Health -->
<div class="section">
  <h2>Pipeline Health</h2>
  <table>
    <thead><tr><th style="width:30%">Bucket</th><th>Distribution</th><th style="text-align:right">Count</th></tr></thead>
    <tbody>
      ${[["0–30d", aging["0–30"], "#34d399"], ["31–60d", aging["31–60"], "#fbbf24"], ["61–90d", aging["61–90"], "#f97316"], ["90+d", aging["90+"], "#f87171"]].map(([label, count, color]) => {
        const pct = Math.round((Number(count) / Math.max(...Object.values(aging), 1)) * 100);
        return `<tr>
          <td style="color:#6b7280;font-size:8.5pt">${label}</td>
          <td><div style="background:#f1f5f9;border-radius:3px;height:12px;overflow:hidden"><div style="background:${color};height:100%;width:${pct}%;"></div></div></td>
          <td style="text-align:right;font-weight:600">${count}</td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>
</div>

<!-- S4: Weekly Activity Summary -->
${actByRep.size > 0 ? `
<div class="section page-break">
  <h2>Activity History</h2>
  <table>
    <thead>
      <tr>
        <th>Rep</th>
        <th style="text-align:center">Calls</th>
        <th style="text-align:center">Emails</th>
        <th style="text-align:center">Meetings</th>
        <th style="text-align:center">Demos</th>
        <th style="text-align:center">Research</th>
        <th style="text-align:center">Proposals</th>
        <th style="text-align:center">Total</th>
      </tr>
    </thead>
    <tbody>
      ${Array.from(actByRep.entries()).sort((a,b) => Object.values(b[1]).reduce((s,v)=>s+v,0) - Object.values(a[1]).reduce((s,v)=>s+v,0)).map(([rep, counts]) => {
        const total = Object.values(counts).reduce((s, v) => s + v, 0);
        return `<tr>
          <td><strong>${rep}</strong></td>
          <td style="text-align:center">${counts["Call"] ?? "—"}</td>
          <td style="text-align:center">${counts["Email"] ?? "—"}</td>
          <td style="text-align:center">${counts["Meeting"] ?? "—"}</td>
          <td style="text-align:center">${counts["Demo"] ?? "—"}</td>
          <td style="text-align:center">${counts["Research"] ?? "—"}</td>
          <td style="text-align:center">${counts["Proposal"] ?? "—"}</td>
          <td style="text-align:center;font-weight:700">${total}</td>
        </tr>`;
      }).join("")}
    </tbody>
  </table>
</div>` : ""}

<!-- S5: Recent Changes -->
${(recentNew.length > 0 || recentWon.length > 0) ? `
<div class="section">
  <h2>Recent Changes (Last 7 Days)</h2>
  ${recentWon.length > 0 ? `
  <h3 style="margin-top:8px">Closed Won</h3>
  <div class="tag-row" style="margin-bottom:10px">
    ${recentWon.map((o) => `<span class="rep-chip" style="background:#d1fae5;border-color:#6ee7b7">✓ ${o.name}${o.value ? ` — ${fmt(o.value)}` : ""}</span>`).join("")}
  </div>` : ""}
  ${recentNew.length > 0 ? `
  <h3>New Opportunities</h3>
  <div class="tag-row">
    ${recentNew.map((o) => `<span class="rep-chip">+ ${o.name}</span>`).join("")}
  </div>` : ""}
</div>` : ""}

<div class="footer">Sales Pulse Report · ${today} · ${allActiveOpps.length} opportunities · ${fmt(totalPipeline) ?? "—"} total pipeline</div>
</body>
</html>`;

    const win = window.open("", "_blank", "width=900,height=750");
    if (!win) return;
    win.document.write(htmlDoc);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); }, 300);
  }, [companies, activities]);

  function toggle(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  // Future Pipeline uses oppRange + oppRepFilter + oppRatingFilter — independent of activity filters
  const pulses = useMemo((): CompanyPulse[] => {
    const { from: oppFrom, to: oppTo } = getOppDateWindow(oppRange, customFrom, customTo);

    function oppInRange(o: SalesOpportunity) {
      if (!oppFrom && !oppTo) return true;
      const d = o.closeDate ? new Date(o.closeDate) : new Date(o.updatedAt);
      if (oppFrom && d < oppFrom) return false;
      if (oppTo && d > oppTo) return false;
      return true;
    }

    function oppMatchesRep(o: SalesOpportunity) {
      if (!oppRepFilter) return true;
      return o.ownerName === oppRepFilter;
    }

    function oppMatchesRating(o: SalesOpportunity) {
      if (!oppRatingFilter) return true;
      return o.rating === oppRatingFilter;
    }

    return companies
      .map((company) => {
        const opps = company.opportunities ?? [];
        const activeOpps = opps.filter((o) =>
          o.stage !== "Closed Won" && o.stage !== "Closed Lost" && oppInRange(o) && oppMatchesRep(o) && oppMatchesRating(o)
        );
        const wonOpps  = opps.filter((o) => o.stage === "Closed Won"  && oppInRange(o) && oppMatchesRep(o));
        const lostOpps = opps.filter((o) => o.stage === "Closed Lost" && oppInRange(o) && oppMatchesRep(o));

        const coActivities = filteredActivities.filter((a) => {
          const coId = a.companyId ?? a.opportunity?.company.id;
          return coId === company.id;
        });

        const contacts: SalesContact[] = [];
        for (const a of coActivities) {
          for (const c of a.contacts) {
            if (!contacts.some((x) => x.name.toLowerCase() === c.name.toLowerCase())) {
              contacts.push(c);
            }
          }
        }

        const topStage = activeOpps.length > 0
          ? activeOpps.slice().sort((a, b) => (STAGE_PRIORITY[a.stage] ?? 9) - (STAGE_PRIORITY[b.stage] ?? 9))[0].stage
          : wonOpps.length > 0 ? "Closed Won" : "";

        const openValue   = activeOpps.reduce((s, o) => s + (o.value ?? 0), 0);
        const wonValue    = wonOpps.reduce((s, o) => s + (o.value ?? 0), 0);
        const ytdWonValue = (oppFrom || oppTo)
          ? wonValue
          : wonOpps
              .filter((o) => {
                const d = o.closeDate ? new Date(o.closeDate) : new Date(o.updatedAt);
                return d.getFullYear() === THIS_YEAR;
              })
              .reduce((s, o) => s + (o.value ?? 0), 0);

        const lastActivity = coActivities.length > 0
          ? coActivities.slice().sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0].createdAt
          : null;

        return { company, activeOpps, wonOpps, lostOpps, activities: coActivities, contacts, topStage, openValue, wonValue, ytdWonValue, lastActivity };
      })
      .filter((p) => p.activeOpps.length > 0 || p.wonOpps.length > 0 || p.lostOpps.length > 0 || p.activities.length > 0)
      .sort((a, b) => {
        switch (sortBy) {
          case "pipeline":      return b.openValue - a.openValue;
          case "won_ytd":       return b.ytdWonValue - a.ytdWonValue;
          case "last_activity": {
            const ad = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
            const bd = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
            return bd - ad;
          }
          case "company":    return a.company.name.localeCompare(b.company.name);
          case "activities": return b.activities.length - a.activities.length;
          default: {
            const aPri = STAGE_PRIORITY[a.topStage] ?? 9;
            const bPri = STAGE_PRIORITY[b.topStage] ?? 9;
            if (aPri !== bPri) return aPri - bPri;
            const aDate = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
            const bDate = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
            return bDate - aDate;
          }
        }
      });
  }, [companies, filteredActivities, oppRange, customFrom, customTo, oppRepFilter, oppRatingFilter, sortBy]);

  const filteredPulses = companyFilter
    ? pulses.filter((p) => p.company.id === companyFilter)
    : pulses;

  const totalOpenValue  = filteredPulses.reduce((s, p) => s + p.openValue, 0);
  const totalWonValue   = filteredPulses.reduce((s, p) => s + p.wonValue, 0);
  const totalYTD        = filteredPulses.reduce((s, p) => s + p.ytdWonValue, 0);
  const activeOppCount  = filteredPulses.reduce((s, p) => s + p.activeOpps.length, 0);
  const activityCount   = filteredPulses.reduce((s, p) => s + p.activities.length, 0);

  if (companies.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center">
        <p className="text-sm text-muted-foreground">No companies yet. Add companies and opportunities to see your Sales Pulse.</p>
      </div>
    );
  }

  const hasOppFilters  = oppRange !== "all" || oppRepFilter !== "" || oppRatingFilter !== "" || customFrom !== "" || customTo !== "";
  const hasActFilters  = activityRange !== "all" || actRepFilter !== "";
  const hasDisplayFilters = companyFilter !== "";

  return (
    <div id="sales-pulse-root" className="space-y-4">

      {/* ── Future Pipeline filters (Epic 3: independent from activity) ── */}
      <div className="no-print rounded-lg border bg-card p-3 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Future Pipeline Filters</p>
          {hasOppFilters && (
            <button
              onClick={() => { setOppRange("all"); setOppRepFilter(""); setOppRatingFilter(""); setCustomFrom(""); setCustomTo(""); }}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={oppRange}
            onChange={(e) => setOppRange(e.target.value as OppRange)}
            className="rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring h-[30px]"
          >
            <option value="all">Close date: All time</option>
            {(["next30", "next90", "nextyear", "thisyear", "custom"] as OppRange[]).map((r) => (
              <option key={r} value={r}>{OPP_RANGE_LABELS[r]}</option>
            ))}
          </select>

          <select
            value={oppRatingFilter}
            onChange={(e) => setOppRatingFilter(e.target.value)}
            className="rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring h-[30px]"
          >
            <option value="">Rating: All</option>
            {["Highly Likely", "Likely", "Possible", "Unlikely"].map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>

          {isManagement && salesReps.length > 0 && (
            <select
              value={oppRepFilter}
              onChange={(e) => setOppRepFilter(e.target.value)}
              className="rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring h-[30px]"
            >
              <option value="">Rep: All</option>
              {salesReps.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          )}
        </div>

        {oppRange === "custom" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">From</span>
            <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)}
              className="rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring h-[30px]" />
            <span className="text-xs text-muted-foreground">to</span>
            <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)}
              className="rounded-md border bg-background px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-ring h-[30px]" />
          </div>
        )}
      </div>

      {/* ── Activity History filters (Epic 3: independent from pipeline) ── */}
      <div className="no-print rounded-lg border bg-card p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Activity History Filters</p>
          {hasActFilters && (
            <button
              onClick={() => { setActivityRange("all"); setActRepFilter(""); }}
              className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
            >
              Clear
            </button>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={activityRange}
            onChange={(e) => setActivityRange(e.target.value as ActivityRange)}
            className="rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring h-[30px]"
          >
            <option value="all">Date: All time</option>
            {(["week", "month", "quarter"] as ActivityRange[]).map((r) => (
              <option key={r} value={r}>{ACTIVITY_RANGE_LABELS[r]}</option>
            ))}
          </select>

          {isManagement && salesReps.length > 0 && (
            <select
              value={actRepFilter}
              onChange={(e) => setActRepFilter(e.target.value)}
              className="rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring h-[30px]"
            >
              <option value="">Rep: All</option>
              {salesReps.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* ── Display controls + PDF ── */}
      <div className="no-print flex items-center gap-2 flex-wrap">
        {pulses.length > 1 && (
          <select
            value={companyFilter}
            onChange={(e) => setCompanyFilter(e.target.value)}
            className="rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring h-[30px]"
          >
            <option value="">All companies</option>
            {pulses.map((p) => (
              <option key={p.company.id} value={p.company.id}>{p.company.name}</option>
            ))}
          </select>
        )}

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring h-[30px]"
        >
          {(Object.keys(SORT_LABELS) as SortBy[]).map((k) => (
            <option key={k} value={k}>Sort: {SORT_LABELS[k]}</option>
          ))}
        </select>

        {hasDisplayFilters && (
          <button
            onClick={() => setCompanyFilter("")}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
          >
            Clear
          </button>
        )}

        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">
            {filteredPulses.length} account{filteredPulses.length !== 1 ? "s" : ""} · {activityCount} activit{activityCount !== 1 ? "ies" : "y"}
          </span>

          <button
            onClick={() => setShowAnalytics((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors ${showAnalytics ? "bg-muted" : ""}`}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
            </svg>
            Analytics
          </button>

          <button
            onClick={printReport}
            className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
          >
            <PrintIcon />
            PDF
          </button>
        </div>
      </div>

      {/* ── Executive Analytics (Epic 7) ── */}
      {showAnalytics && (
        <AnalyticsSection pulses={pulses} activities={activities} />
      )}

      {/* ── KPI bar ── */}
      <div className="kpi-grid grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { label: "Active Opps",  value: activeOppCount.toString(), cls: "" },
          { label: "Pipeline",     value: fmt(totalOpenValue) ?? "—", cls: "" },
          { label: `Won ${THIS_YEAR}`, value: fmt(totalYTD) ?? "—", cls: "text-emerald-600" },
          { label: "Won Lifetime", value: fmt(totalWonValue) ?? "—", cls: "text-emerald-700" },
          { label: activityRange === "all" ? "Activities" : `Activities (${ACTIVITY_RANGE_LABELS[activityRange]})`,
            value: activityCount.toString(), cls: "" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg border bg-card px-4 py-3">
            <div className="text-xs text-muted-foreground">{s.label}</div>
            <div className={`text-xl font-bold leading-tight mt-0.5 tabular-nums ${s.cls}`}>{s.value}</div>
          </div>
        ))}
      </div>

      {filteredPulses.length === 0 && (
        <div className="rounded-xl border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">No activity matches the current filters.</p>
        </div>
      )}

      {/* ── Company cards ── */}
      {filteredPulses.map(({ company, activeOpps, wonOpps, lostOpps, activities: acts, contacts, openValue, wonValue, ytdWonValue, lastActivity, topStage }) => {
        const isOpen       = !collapsedIds.has(company.id);
        const actsExpanded = expandedActIds.has(company.id);
        const sortedActs   = [...acts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        const recentActs   = actsExpanded ? sortedActs : sortedActs.slice(0, 1);
        const hiddenActCount = sortedActs.length - 1;
        const totalDeals = wonOpps.length + lostOpps.length;
        const winRate    = totalDeals > 0 ? Math.round((wonOpps.length / totalDeals) * 100) : null;
        const pipelineTotal = fmt(openValue);
        const lifetimeWon   = fmt(wonValue);
        const ytdWon        = fmt(ytdWonValue);

        const repNames = Array.from(new Set(
          [...activeOpps, ...wonOpps].map((o) => o.ownerName).filter(Boolean)
        )) as string[];

        return (
          <div
            key={company.id}
            className="pulse-card rounded-lg border bg-card shadow-sm border-l-4"
            style={{ borderLeftColor: STAGE_BORDER_COLOR[topStage] ?? "#e2e8f0" }}
          >
            {/* Card header */}
            <button
              type="button"
              onClick={() => toggle(company.id)}
              className="pulse-card-hdr w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors text-left sticky top-0 z-10 bg-card/95 rounded-t-lg"
              style={{ backdropFilter: "blur(4px)", boxShadow: "0 1px 0 0 hsl(var(--border))" }}
            >
              <CompanyLogo domain={company.domain} name={company.name} size={40} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{company.name}</span>
                  {topStage && (
                    <span className={`text-[11px] font-semibold rounded-full px-2 py-px shrink-0 ${STAGE_COLORS[topStage] ?? "bg-muted text-muted-foreground"}`}>
                      {topStage}
                    </span>
                  )}
                  {/* Show ratings inline */}
                  {activeOpps.some((o) => o.rating) && (
                    <span className={`text-[11px] font-semibold rounded-full px-2 py-px shrink-0 ${
                      (() => {
                        const best = activeOpps.map((o) => o.rating).filter(Boolean).sort((a, b) => (RATING_ORDER[a!] ?? 9) - (RATING_ORDER[b!] ?? 9))[0];
                        return RATING_COLORS[best!] ?? "bg-muted text-muted-foreground";
                      })()
                    }`}>
                      {activeOpps.map((o) => o.rating).filter(Boolean).sort((a, b) => (RATING_ORDER[a!] ?? 9) - (RATING_ORDER[b!] ?? 9))[0]}
                    </span>
                  )}
                </div>
                {repNames.length > 0 && (
                  <span className="text-xs text-muted-foreground">{repNames.join(", ")}</span>
                )}
              </div>

              <div className="hidden md:flex items-center gap-5 shrink-0">
                {pipelineTotal && (
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Pipeline</div>
                    <div className="text-sm font-semibold tabular-nums">{pipelineTotal}</div>
                  </div>
                )}
                {ytdWon && (
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Won {THIS_YEAR}</div>
                    <div className="text-sm font-semibold text-emerald-600 tabular-nums">{ytdWon}</div>
                  </div>
                )}
                {winRate !== null && (
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Win rate</div>
                    <div className="text-sm font-semibold tabular-nums">{winRate}%</div>
                  </div>
                )}
                {lastActivity && (
                  <div className="text-right">
                    <div className="text-[10px] text-muted-foreground uppercase tracking-wide">Last contact</div>
                    <div className="text-xs text-muted-foreground tabular-nums">
                      {new Date(lastActivity).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </div>
                  </div>
                )}
              </div>

              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className="text-muted-foreground shrink-0 transition-transform ml-1"
                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
              >
                <polyline points="6 9 12 15 18 9" />
              </svg>
            </button>

            {isOpen && (
              <div className="border-t divide-y rounded-b-lg overflow-hidden">

                {/* Active Pipeline */}
                {activeOpps.length > 0 && (
                  <div className="px-4 py-3">
                    <div className="pulse-section-hdr flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Future Pipeline</p>
                      {openValue > 0 && <span className="text-xs font-bold tabular-nums">{fmt(openValue)}</span>}
                    </div>
                    <div className="space-y-1.5">
                      {activeOpps
                        .slice()
                        .sort((a, b) => (STAGE_PRIORITY[a.stage] ?? 9) - (STAGE_PRIORITY[b.stage] ?? 9))
                        .map((o) => {
                          const closeLabel = o.closeDate
                            ? new Date(o.closeDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" })
                            : null;
                          const age = oppAge(o);
                          return (
                            <div key={o.id} className="pulse-opp-row flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{o.name}</div>
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 flex-wrap">
                                  {o.ownerName && <span>{o.ownerName}</span>}
                                  {closeLabel && <span>· closes {closeLabel}</span>}
                                  {age !== null && (
                                    <span className={age > 60 ? "text-red-500 font-semibold" : age > 30 ? "text-amber-500" : ""}>
                                      · {age}d old
                                    </span>
                                  )}
                                </div>
                              </div>
                              {o.rating && (
                                <span className={`text-[10px] font-semibold rounded-full px-2 py-px shrink-0 ${RATING_COLORS[o.rating] ?? "bg-muted"}`}>
                                  {o.rating}
                                </span>
                              )}
                              <span className={`text-[11px] font-semibold rounded-full px-2.5 py-0.5 shrink-0 ${STAGE_COLORS[o.stage] ?? "bg-muted text-muted-foreground"}`}>
                                {o.stage}
                              </span>
                              {o.value > 0 && (
                                <span className="text-sm font-semibold shrink-0 tabular-nums w-20 text-right">{fmt(o.value)}</span>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Won Business */}
                {wonOpps.length > 0 && (
                  <div className="px-4 py-3">
                    <div className="pulse-section-hdr flex items-center justify-between mb-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Won Business</p>
                      <div className="flex items-center gap-3 text-xs tabular-nums">
                        {ytdWon && <span className="text-emerald-600 font-semibold">{ytdWon} YTD</span>}
                        {lifetimeWon && <span className="text-muted-foreground">{lifetimeWon} lifetime</span>}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {wonOpps
                        .slice()
                        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
                        .map((o) => {
                          const d = o.closeDate ? new Date(o.closeDate) : new Date(o.updatedAt);
                          const isYTD = d.getFullYear() === THIS_YEAR;
                          return (
                            <span key={o.id} className={`pulse-won-chip inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm ${
                              isYTD ? "bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200/60" : "bg-muted/30"
                            }`}>
                              <span className={`font-medium ${isYTD ? "text-emerald-800 dark:text-emerald-200" : "text-foreground"}`}>{o.name}</span>
                              {o.value > 0 && (
                                <span className={`font-semibold tabular-nums ${isYTD ? "text-emerald-600" : "text-muted-foreground"}`}>{fmt(o.value)}</span>
                              )}
                            </span>
                          );
                        })}
                    </div>
                  </div>
                )}

                {/* Contacts */}
                {contacts.length > 0 && (
                  <div className="px-4 py-3">
                    <p className="pulse-section-hdr text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contacts</p>
                    <div className="flex flex-wrap gap-1.5">
                      {contacts.map((c, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 rounded-full border bg-muted/40 px-3 py-1 text-sm">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold shrink-0">
                            {c.name[0]?.toUpperCase()}
                          </span>
                          <span className="font-medium">{c.name}</span>
                          {c.title && <span className="text-muted-foreground">· {c.title}</span>}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Activity History */}
                {sortedActs.length > 0 && (
                  <div>
                    <p className="pulse-section-hdr text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 pt-3 pb-2">Activity History</p>
                    <ul className="divide-y">
                      {recentActs.map((a) => (
                        <li key={a.id} className="pulse-opp-row flex items-start gap-3 px-4 py-2.5 hover:bg-muted/20 transition-colors">
                          <div className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center text-sm ${TYPE_BG[a.type] ?? "bg-slate-100 text-slate-500"}`}>
                            {TYPE_ICONS[a.type] ?? "📝"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <span className="text-xs font-semibold shrink-0">{a.type}</span>
                              {a.opportunity && (
                                <span className="text-xs text-muted-foreground truncate">· {a.opportunity.name}</span>
                              )}
                              {isManagement && a.userName && (
                                <span className="text-xs text-muted-foreground shrink-0">· {a.userName}</span>
                              )}
                              {a.aiGenerated && (
                                <span className="rounded-full bg-violet-100 text-violet-700 px-1.5 py-px text-[10px] font-semibold shrink-0">AI</span>
                              )}
                              <span className="text-[11px] text-muted-foreground/50 tabular-nums ml-auto shrink-0">
                                {new Date(a.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                              </span>
                            </div>
                            {a.description && (
                              <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1 mt-0.5">{a.description.split("\n\n")[0]}</p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                    {hiddenActCount > 0 && (
                      <button
                        type="button"
                        onClick={() => setExpandedActIds((prev) => {
                          const next = new Set(prev);
                          actsExpanded ? next.delete(company.id) : next.add(company.id);
                          return next;
                        })}
                        className="no-print w-full text-xs text-primary hover:text-primary/80 font-medium py-2 border-t text-center hover:bg-muted/20 transition-colors"
                      >
                        {actsExpanded ? "Show less ↑" : `+ ${hiddenActCount} more activit${hiddenActCount === 1 ? "y" : "ies"}`}
                      </button>
                    )}
                  </div>
                )}

                {acts.length === 0 && activeOpps.length === 0 && wonOpps.length === 0 && (
                  <div className="px-4 py-4 text-center text-xs text-muted-foreground">No activity or opportunities recorded yet.</div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
