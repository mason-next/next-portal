"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SalesActivity, SalesCompany, SalesContact, SalesOpportunity } from "@/types/sales";
import type { AppUser } from "@/types/user";

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

const THIS_YEAR = new Date().getFullYear();

type ActivityRange = "week" | "month" | "quarter" | "all";
type OppRange = "next30" | "next90" | "nextyear" | "thisyear" | "custom" | "all";
type SortBy = "stage" | "pipeline" | "won_ytd" | "last_activity" | "company" | "activities";

const ACTIVITY_RANGE_LABELS: Record<ActivityRange, string> = {
  week:    "This week",
  month:   "30 days",
  quarter: "Quarter",
  all:     "All time",
};

const OPP_RANGE_LABELS: Record<OppRange, string> = {
  next30:   "Next 30 days",
  next90:   "Next 90 days",
  nextyear: "Next 12 months",
  thisyear: `This year (${THIS_YEAR})`,
  custom:   "Custom range",
  all:      "All time",
};

const SORT_LABELS: Record<SortBy, string> = {
  stage:         "Stage",
  pipeline:      "Pipeline value",
  won_ytd:       "Won YTD",
  last_activity: "Last activity",
  company:       "Company name",
  activities:    "Activity count",
};

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

function PrintIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 6 2 18 2 18 9"/>
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
      <rect x="6" y="14" width="12" height="8"/>
    </svg>
  );
}

export function SalesPulseReport({ companies, activities, isManagement }: SalesPulseReportProps) {
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  const [expandedActIds, setExpandedActIds] = useState<Set<string>>(new Set());
  const [activityRange, setActivityRange] = useState<ActivityRange>("all");
  const [oppRange, setOppRange] = useState<OppRange>("all");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [personFilter, setPersonFilter] = useState<string>("");
  const [companyFilter, setCompanyFilter] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortBy>("stage");
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

  const filteredActivities = useMemo(() => {
    const rangeStart = getActivityRangeStart(activityRange);
    return activities.filter((a) => {
      if (rangeStart && new Date(a.weekStart) < rangeStart) return false;
      if (personFilter && a.userName !== personFilter) return false;
      return true;
    });
  }, [activities, activityRange, personFilter]);

  const printReport = useCallback(() => {
    const root = document.getElementById("sales-pulse-root");
    if (!root) return;
    const clone = root.cloneNode(true) as HTMLElement;
    clone.id = "sales-pulse-print-clone";
    document.body.appendChild(clone);
    const today = new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    const style = document.createElement("style");
    style.textContent = `
      @page {
        margin: 0.75in;
        @top-left  { content: "Sales Pulse Report"; font-family: system-ui, sans-serif; font-size: 10pt; font-weight: 600; color: #111; }
        @top-right { content: "${today}"; font-family: system-ui, sans-serif; font-size: 10pt; color: #666; }
        @bottom-right { content: "Page " counter(page) " of " counter(pages); font-family: system-ui, sans-serif; font-size: 9pt; color: #999; }
      }
      @media print {
        body > *:not(#sales-pulse-print-clone) { display: none !important; }
        #sales-pulse-print-clone {
          display: block !important;
          -webkit-print-color-adjust: exact; print-color-adjust: exact;
        }
        .no-print { display: none !important; }
        .sticky { position: static !important; box-shadow: none !important; backdrop-filter: none !important; }
        #sales-pulse-print-clone .kpi-grid { display: grid !important; grid-template-columns: repeat(5, 1fr) !important; gap: 0.5rem !important; }
        .pulse-card { break-inside: auto; page-break-inside: auto; }
        .pulse-opp-row { break-inside: avoid; page-break-inside: avoid; }
        .pulse-won-chip { break-inside: avoid; page-break-inside: avoid; }
        .pulse-section-hdr { break-after: avoid; page-break-after: avoid; }
        .pulse-card-hdr { break-after: avoid; page-break-after: avoid; }
      }
    `;
    document.head.appendChild(style);
    window.print();
    window.addEventListener("afterprint", () => { clone.remove(); style.remove(); }, { once: true });
  }, []);

  function toggle(id: string) {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

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
      if (!personFilter) return true;
      return o.ownerName === personFilter;
    }

    return companies
      .map((company) => {
        const opps = company.opportunities ?? [];
        const activeOpps = opps.filter((o) =>
          o.stage !== "Closed Won" && o.stage !== "Closed Lost" && oppInRange(o) && oppMatchesRep(o)
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
          case "company":      return a.company.name.localeCompare(b.company.name);
          case "activities":   return b.activities.length - a.activities.length;
          default: { // stage
            const aPri = STAGE_PRIORITY[a.topStage] ?? 9;
            const bPri = STAGE_PRIORITY[b.topStage] ?? 9;
            if (aPri !== bPri) return aPri - bPri;
            const aDate = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
            const bDate = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
            return bDate - aDate;
          }
        }
      });
  }, [companies, filteredActivities, oppRange, customFrom, customTo, personFilter, sortBy]);

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

  const hasFilters = oppRange !== "all" || activityRange !== "all" || personFilter !== "" || companyFilter !== "" || customFrom !== "" || customTo !== "";

  return (
    <div id="sales-pulse-root" className="space-y-4">

      {/* ── Filter row ── */}
      <div className="no-print space-y-2">
        <div className="flex items-center gap-2 flex-wrap">

          {/* Close date */}
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

          {/* Activity range */}
          <select
            value={activityRange}
            onChange={(e) => setActivityRange(e.target.value as ActivityRange)}
            className="rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring h-[30px]"
          >
            <option value="all">Activities: All time</option>
            {(["week", "month", "quarter"] as ActivityRange[]).map((r) => (
              <option key={r} value={r}>{ACTIVITY_RANGE_LABELS[r]}</option>
            ))}
          </select>

          {/* Company filter */}
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

          {/* Rep filter */}
          {isManagement && salesReps.length > 0 && (
            <select
              value={personFilter}
              onChange={(e) => setPersonFilter(e.target.value)}
              className="rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring h-[30px]"
            >
              <option value="">All reps</option>
              {salesReps.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
            </select>
          )}

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="rounded-lg border bg-background px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring h-[30px]"
          >
            {(Object.keys(SORT_LABELS) as SortBy[]).map((k) => (
              <option key={k} value={k}>Sort: {SORT_LABELS[k]}</option>
            ))}
          </select>

          {/* Right side */}
          <div className="flex items-center gap-3 ml-auto">
            {hasFilters && (
              <button
                onClick={() => { setOppRange("all"); setActivityRange("all"); setPersonFilter(""); setCompanyFilter(""); setCustomFrom(""); setCustomTo(""); }}
                className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
              >
                Clear filters
              </button>
            )}
            <span className="text-xs text-muted-foreground">
              {filteredPulses.length} account{filteredPulses.length !== 1 ? "s" : ""} · {activityCount} activit{activityCount !== 1 ? "ies" : "y"}
            </span>
            <button
              onClick={printReport}
              className="inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              <PrintIcon />
              PDF
            </button>
          </div>
        </div>

        {/* Custom date range — secondary row */}
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

      {/* ── KPI bar ── */}
      <div className="kpi-grid grid grid-cols-2 gap-2 sm:grid-cols-5">
        {[
          { label: "Active Opps",   value: activeOppCount.toString(),       cls: "" },
          { label: "Pipeline",      value: fmt(totalOpenValue) ?? "—",       cls: "" },
          { label: `Won ${THIS_YEAR}`,  value: fmt(totalYTD) ?? "—",        cls: "text-emerald-600" },
          { label: "Won Lifetime",  value: fmt(totalWonValue) ?? "—",        cls: "text-emerald-700" },
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
            {/* ── Card header ── */}
            <button
              type="button"
              onClick={() => toggle(company.id)}
              className="pulse-card-hdr w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/20 transition-colors text-left sticky top-0 z-10 bg-card/95 rounded-t-lg"
              style={{ backdropFilter: "blur(4px)", boxShadow: "0 1px 0 0 hsl(var(--border))" }}
            >
              <CompanyLogo domain={company.domain} name={company.name} size={40} />

              {/* Name + rep + stage pill */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm">{company.name}</span>
                  {topStage && (
                    <span className={`text-[11px] font-semibold rounded-full px-2 py-px shrink-0 ${STAGE_COLORS[topStage] ?? "bg-muted text-muted-foreground"}`}>
                      {topStage}
                    </span>
                  )}
                </div>
                {repNames.length > 0 && (
                  <span className="text-xs text-muted-foreground">{repNames.join(", ")}</span>
                )}
              </div>

              {/* Key stats — hidden on small screens */}
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
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Active Pipeline</p>
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
                          return (
                            <div key={o.id} className="pulse-opp-row flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2">
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">{o.name}</div>
                                {(o.ownerName || closeLabel) && (
                                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5">
                                    {o.ownerName && <span>{o.ownerName}</span>}
                                    {closeLabel && <span>· closes {closeLabel}</span>}
                                  </div>
                                )}
                              </div>
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

                {/* Recent Activity */}
                {sortedActs.length > 0 && (
                  <div>
                    <p className="pulse-section-hdr text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 pt-3 pb-2">Recent Activity</p>
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
