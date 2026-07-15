"use client";

import { useMemo, useState } from "react";
import type { SalesCompany, SalesActivity, SalesOpportunity } from "@/types/sales";

// ── constants ─────────────────────────────────────────────────────────────────

const STAGE_COLORS: Record<string, string> = {
  Prospecting:   "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  Qualifying:    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Proposal:      "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  Negotiation:   "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "Closed Won":  "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Closed Lost": "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
};

const RATING_COLORS: Record<string, string> = {
  "Highly Likely": "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Likely":        "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  "Possible":      "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "Unlikely":      "bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400",
};

const RATING_ORDER: Record<string, number> = {
  "Highly Likely": 0, "Likely": 1, "Possible": 2, "Unlikely": 3,
};

const STAGE_ORDER: Record<string, number> = {
  Negotiation: 0, Proposal: 1, Qualifying: 2, Prospecting: 3,
  "Closed Won": 4, "Closed Lost": 5,
};

const ACTIVE_STAGES = new Set(["Prospecting", "Qualifying", "Proposal", "Negotiation"]);

type SortKey = "name" | "company" | "rep" | "rating" | "age" | "closeDate" | "value" | "stage" | "createdAt";
type SortDir = "asc" | "desc";

type QuickFilter =
  | "closing_this_month"
  | "highly_likely"
  | "over_30"
  | "over_60"
  | "high_value"
  | "needs_attention"
  | "no_recent_activity";

const QUICK_FILTER_LABELS: Record<QuickFilter, string> = {
  closing_this_month:  "Closing This Month",
  highly_likely:       "Highly Likely",
  over_30:             "30+ Days Old",
  over_60:             "60+ Days Old",
  high_value:          "High Value",
  needs_attention:     "Needs Attention",
  no_recent_activity:  "No Recent Activity",
};

// ── helpers ───────────────────────────────────────────────────────────────────

function fmt(cents: number) {
  if (!cents) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency", currency: "USD", maximumFractionDigits: 0,
  }).format(cents / 100);
}

function oppAge(o: SalesOpportunity): number | null {
  if (!o.proposalCreatedAt) return null;
  return Math.floor((Date.now() - new Date(o.proposalCreatedAt).getTime()) / 86400000);
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
}

// ── row type ──────────────────────────────────────────────────────────────────

interface OppRow {
  opp: SalesOpportunity;
  companyName: string;
  age: number | null;
  lastActivityDate: number | null; // ms timestamp
}

// ── sub-components ────────────────────────────────────────────────────────────

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return (
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground/40">
        <polyline points="6 9 12 3 18 9"/><polyline points="6 15 12 21 18 15"/>
      </svg>
    );
  }
  return (
    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round" className="text-primary">
      {dir === "asc"
        ? <polyline points="6 9 12 3 18 9"/>
        : <polyline points="6 15 12 21 18 15"/>}
    </svg>
  );
}

// ── main component ────────────────────────────────────────────────────────────

export interface OpportunityTableProps {
  companies: SalesCompany[];
  activities: SalesActivity[];
  isManagement: boolean;
  repFilter: string;
  onRepFilterChange: (r: string) => void;
  onOpenConversation: (opp: SalesOpportunity) => void;
}

export function OpportunityTable({
  companies, activities, isManagement, repFilter, onRepFilterChange, onOpenConversation,
}: OpportunityTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>("stage");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [stageFilter, setStageFilter] = useState("All");
  const [quickFilters, setQuickFilters] = useState<Set<QuickFilter>>(new Set());
  const [search, setSearch] = useState("");

  // Build a lookup: companyId → latest activity timestamp (ms)
  const lastActivityByCompany = useMemo(() => {
    const map = new Map<string, number>();
    for (const a of activities) {
      const cid = a.companyId ?? a.opportunity?.company.id;
      if (!cid) continue;
      const t = new Date(a.createdAt).getTime();
      if (!map.has(cid) || t > map.get(cid)!) map.set(cid, t);
    }
    return map;
  }, [activities]);

  const rows = useMemo((): OppRow[] => {
    const result: OppRow[] = [];
    for (const c of companies) {
      for (const o of (c.opportunities ?? [])) {
        result.push({
          opp: o,
          companyName: c.name,
          age: oppAge(o),
          lastActivityDate: lastActivityByCompany.get(c.id) ?? null,
        });
      }
    }
    return result;
  }, [companies, lastActivityByCompany]);

  const allReps = useMemo(() => {
    return Array.from(new Set(rows.map((r) => r.opp.ownerName).filter(Boolean))).sort() as string[];
  }, [rows]);

  const now = Date.now();
  const MS_30 = 30 * 86400000;
  const thisMonthStart = new Date(); thisMonthStart.setUTCDate(1); thisMonthStart.setUTCHours(0, 0, 0, 0);
  const thisMonthEnd = new Date(thisMonthStart.getFullYear(), thisMonthStart.getMonth() + 1, 0, 23, 59, 59, 999);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const o = r.opp;
      // Stage
      if (stageFilter !== "All" && o.stage !== stageFilter) return false;
      // Rep
      const eff = isManagement ? repFilter : (rows[0]?.opp.ownerName ?? "");
      if (eff && o.ownerName !== eff) return false;
      // Search
      if (search) {
        const q = search.toLowerCase();
        if (!o.name.toLowerCase().includes(q) && !r.companyName.toLowerCase().includes(q) && !o.ownerName.toLowerCase().includes(q)) return false;
      }
      // Quick filters — AND'd together
      for (const qf of quickFilters) {
        if (qf === "closing_this_month") {
          if (!o.closeDate) return false;
          const d = new Date(o.closeDate);
          if (d < thisMonthStart || d > thisMonthEnd) return false;
        }
        if (qf === "highly_likely") {
          if (o.rating !== "Highly Likely") return false;
        }
        if (qf === "over_30") {
          if (r.age === null || r.age < 30) return false;
        }
        if (qf === "over_60") {
          if (r.age === null || r.age < 60) return false;
        }
        if (qf === "high_value") {
          if ((o.value ?? 0) < 5000000) return false; // $50k+
        }
        if (qf === "needs_attention") {
          const isActive = ACTIVE_STAGES.has(o.stage);
          const stale = r.age !== null && r.age > 30;
          const noAct = r.lastActivityDate === null || (now - r.lastActivityDate) > 14 * 86400000;
          if (!(isActive && stale && noAct)) return false;
        }
        if (qf === "no_recent_activity") {
          const noAct = r.lastActivityDate === null || (now - r.lastActivityDate) > MS_30;
          if (!noAct) return false;
        }
      }
      return true;
    });
  }, [rows, stageFilter, repFilter, isManagement, search, quickFilters, now, thisMonthStart, thisMonthEnd, MS_30]);

  const sorted = useMemo(() => {
    return filtered.slice().sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "name":      cmp = a.opp.name.localeCompare(b.opp.name); break;
        case "company":   cmp = a.companyName.localeCompare(b.companyName); break;
        case "rep":       cmp = a.opp.ownerName.localeCompare(b.opp.ownerName); break;
        case "rating":    cmp = (RATING_ORDER[a.opp.rating ?? ""] ?? 9) - (RATING_ORDER[b.opp.rating ?? ""] ?? 9); break;
        case "age":       cmp = (b.age ?? -1) - (a.age ?? -1); break; // older first by default
        case "closeDate": {
          const ad = a.opp.closeDate ? new Date(a.opp.closeDate).getTime() : Infinity;
          const bd = b.opp.closeDate ? new Date(b.opp.closeDate).getTime() : Infinity;
          cmp = ad - bd;
          break;
        }
        case "value":     cmp = (b.opp.value ?? 0) - (a.opp.value ?? 0); break;
        case "stage":     cmp = (STAGE_ORDER[a.opp.stage] ?? 9) - (STAGE_ORDER[b.opp.stage] ?? 9); break;
        case "createdAt": {
          const ad = a.opp.proposalCreatedAt ? new Date(a.opp.proposalCreatedAt).getTime() : 0;
          const bd = b.opp.proposalCreatedAt ? new Date(b.opp.proposalCreatedAt).getTime() : 0;
          cmp = bd - ad;
          break;
        }
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => d === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      // Sensible default directions
      setSortDir(key === "age" || key === "value" ? "desc" : "asc");
    }
  }

  function toggleQuickFilter(qf: QuickFilter) {
    setQuickFilters((prev) => {
      const next = new Set(prev);
      next.has(qf) ? next.delete(qf) : next.add(qf);
      return next;
    });
  }

  const stages = ["All", "Prospecting", "Qualifying", "Proposal", "Negotiation", "Closed Won", "Closed Lost"];

  const totalPipeline = sorted.filter((r) => ACTIVE_STAGES.has(r.opp.stage)).reduce((s, r) => s + (r.opp.value ?? 0), 0);

  const Th = ({ label, col }: { label: string; col: SortKey }) => (
    <th
      scope="col"
      onClick={() => handleSort(col)}
      className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none hover:text-foreground whitespace-nowrap"
    >
      <span className="inline-flex items-center gap-1">
        {label}
        <SortIcon active={sortKey === col} dir={sortDir} />
      </span>
    </th>
  );

  return (
    <div className="space-y-3">
      {/* ── Quick filters ── */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(Object.keys(QUICK_FILTER_LABELS) as QuickFilter[]).map((qf) => (
          <button
            key={qf}
            onClick={() => toggleQuickFilter(qf)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors border ${
              quickFilters.has(qf)
                ? "bg-primary text-primary-foreground border-primary"
                : "hover:bg-muted border-border"
            }`}
          >
            {QUICK_FILTER_LABELS[qf]}
          </button>
        ))}
        {quickFilters.size > 0 && (
          <button
            onClick={() => setQuickFilters(new Set())}
            className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2 ml-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* ── Stage + rep + search ── */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {/* Stage pills */}
          <div className="flex gap-1 flex-wrap">
            {stages.map((s) => {
              const count = s === "All"
                ? rows.length
                : rows.filter((r) => r.opp.stage === s).length;
              return (
                <button
                  key={s}
                  onClick={() => setStageFilter(s)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    stageFilter === s ? "bg-primary text-primary-foreground" : "border hover:bg-muted"
                  }`}
                >
                  {s} {count > 0 && `(${count})`}
                </button>
              );
            })}
          </div>

          {/* Rep filter */}
          {isManagement && allReps.length > 0 && (
            <select
              value={repFilter}
              onChange={(e) => onRepFilterChange(e.target.value)}
              className="rounded-lg border bg-background px-3 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-ring h-[30px]"
            >
              <option value="">All reps</option>
              {allReps.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          )}
        </div>

        {/* Search */}
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" width="12" height="12"
            viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search opps…"
            className="pl-8 pr-3 py-1 rounded-lg border bg-background text-xs focus:outline-none focus:ring-2 focus:ring-ring h-[30px] w-48"
          />
        </div>
      </div>

      {/* ── Summary bar ── */}
      {sorted.length > 0 && (
        <div className="flex items-center gap-4 text-xs text-muted-foreground border-b pb-2">
          <span>{sorted.length} opportunit{sorted.length !== 1 ? "ies" : "y"}</span>
          {totalPipeline > 0 && (
            <span className="font-semibold text-foreground">{fmt(totalPipeline)} active pipeline</span>
          )}
        </div>
      )}

      {/* ── Table ── */}
      {sorted.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-sm text-muted-foreground">
            {rows.length === 0 ? "No opportunities yet. Add a company and create an opportunity to get started." : "No opportunities match the current filters."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border bg-card">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                <Th label="Opportunity" col="name" />
                <Th label="Company" col="company" />
                {isManagement && <Th label="Rep" col="rep" />}
                <Th label="Rating" col="rating" />
                <Th label="Age" col="age" />
                <Th label="Created" col="createdAt" />
                <Th label="Close Date" col="closeDate" />
                <Th label="Value" col="value" />
                <Th label="Stage" col="stage" />
                <th scope="col" className="px-3 py-2 w-16" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {sorted.map(({ opp, companyName, age }) => {
                const ageClass =
                  age === null ? "" :
                  age > 60 ? "text-red-600 font-semibold" :
                  age > 30 ? "text-amber-600 font-semibold" :
                  "text-muted-foreground";
                return (
                  <tr key={opp.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-3 py-2.5 font-medium max-w-[220px]">
                      <span className="truncate block" title={opp.name}>{opp.name}</span>
                      {opp.cwNumber && (
                        <span className="text-[10px] text-muted-foreground">CW #{opp.cwNumber}</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground max-w-[160px]">
                      <span className="truncate block" title={companyName}>{companyName}</span>
                    </td>
                    {isManagement && (
                      <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">
                        {opp.ownerName || "—"}
                      </td>
                    )}
                    <td className="px-3 py-2.5">
                      {opp.rating ? (
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${RATING_COLORS[opp.rating] ?? "bg-muted text-muted-foreground"}`}>
                          {opp.rating}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40 text-xs">—</span>
                      )}
                    </td>
                    <td className={`px-3 py-2.5 tabular-nums whitespace-nowrap ${ageClass}`}>
                      {age !== null ? `${age}d` : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground tabular-nums whitespace-nowrap text-xs">
                      {fmtDate(opp.proposalCreatedAt)}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums whitespace-nowrap text-xs">
                      {opp.closeDate ? (
                        <span className={(() => {
                          const d = new Date(opp.closeDate);
                          if (d < new Date() && ACTIVE_STAGES.has(opp.stage)) return "text-red-600 font-semibold";
                          if (d <= thisMonthEnd && d >= thisMonthStart) return "text-amber-600 font-semibold";
                          return "text-muted-foreground";
                        })()}>
                          {fmtDate(opp.closeDate)}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums whitespace-nowrap font-medium text-right">
                      {opp.value > 0 ? fmt(opp.value) : <span className="text-muted-foreground/40">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STAGE_COLORS[opp.stage] ?? "bg-muted text-muted-foreground"}`}>
                        {opp.stage}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1">
                        {opp.cwLink && (
                          <a
                            href={opp.cwLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Open in ConnectWise"
                            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
                            </svg>
                          </a>
                        )}
                        <button
                          type="button"
                          title="Open conversation"
                          onClick={() => onOpenConversation(opp)}
                          className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                        >
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
