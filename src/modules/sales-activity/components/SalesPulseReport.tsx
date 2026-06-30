"use client";

import Image from "next/image";
import { useState } from "react";
import type { SalesCompany, SalesActivity, OppStage } from "@/types/sales";
import { OPP_STAGES, ACTIVITY_TYPES } from "@/types/sales";

const STAGE_COLORS: Record<OppStage, string> = {
  Prospecting:   "bg-blue-100 text-blue-700",
  Qualifying:    "bg-indigo-100 text-indigo-700",
  Proposal:      "bg-amber-100 text-amber-700",
  Negotiation:   "bg-orange-100 text-orange-700",
  "Closed Won":  "bg-green-100 text-green-700",
  "Closed Lost": "bg-red-100 text-red-700",
};

const TYPE_ICONS: Record<string, string> = {
  Call: "📞", Email: "✉️", Meeting: "🗓", Research: "🔍",
  Demo: "💻", Proposal: "📄", Other: "📝",
};

function formatDollars(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100);
}

function CompanyLogo({ domain, name }: { domain: string; name: string }) {
  const [err, setErr] = useState(false);
  if (!domain || err) {
    return (
      <div className="w-6 h-6 rounded bg-muted border flex items-center justify-center shrink-0">
        <span className="text-[9px] font-bold text-muted-foreground">{name.slice(0, 2).toUpperCase()}</span>
      </div>
    );
  }
  return (
    <Image
      src={`https://icons.duckduckgo.com/ip3/${domain.toLowerCase().trim()}.ico`}
      alt={name} width={24} height={24}
      className="w-6 h-6 rounded object-contain border bg-white shrink-0"
      onError={() => setErr(true)} unoptimized
    />
  );
}

interface SalesPulseReportProps {
  companies: SalesCompany[];
  activities: SalesActivity[];
  isManagement: boolean;
}

export function SalesPulseReport({ companies, activities, isManagement }: SalesPulseReportProps) {
  const [timeRange, setTimeRange] = useState<"30" | "90" | "all">("30");

  const cutoff = timeRange === "all" ? null : (() => {
    const d = new Date();
    d.setDate(d.getDate() - parseInt(timeRange));
    d.setHours(0, 0, 0, 0);
    return d;
  })();

  const filteredActivities = cutoff
    ? activities.filter((a) => new Date(a.weekStart) >= cutoff)
    : activities;

  // Pipeline by stage
  const allOpps = companies.flatMap((c) => (c.opportunities ?? []).map((o) => ({ ...o, companyName: c.name, companyDomain: c.domain })));
  const pipelineByStage = OPP_STAGES.reduce((acc, s) => {
    const stageOpps = allOpps.filter((o) => o.stage === s);
    acc[s] = { count: stageOpps.length, value: stageOpps.reduce((sum, o) => sum + o.value, 0) };
    return acc;
  }, {} as Record<OppStage, { count: number; value: number }>);

  const totalPipeline = allOpps.filter((o) => o.stage !== "Closed Lost").reduce((sum, o) => sum + o.value, 0);
  const wonValue = allOpps.filter((o) => o.stage === "Closed Won").reduce((sum, o) => sum + o.value, 0);

  // Activity metrics
  const byType = ACTIVITY_TYPES.reduce((acc, t) => {
    acc[t] = filteredActivities.filter((a) => a.type === t).length;
    return acc;
  }, {} as Record<string, number>);

  const byPerson = filteredActivities.reduce((acc, a) => {
    if (a.userName) acc[a.userName] = (acc[a.userName] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  // Top companies by activity
  const byCompany = filteredActivities.reduce((acc, a) => {
    const name = a.company?.name ?? a.opportunity?.company?.name;
    if (name) acc[name] = (acc[name] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const topCompanies = Object.entries(byCompany).sort((a, b) => b[1] - a[1]).slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Time range selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">Activity period:</span>
        <div className="flex rounded-lg border bg-muted/30 p-0.5 gap-0.5">
          {(["30", "90", "all"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setTimeRange(r)}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                timeRange === r ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r === "all" ? "All time" : `Last ${r} days`}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <KpiCard label="Total Pipeline" value={formatDollars(totalPipeline)} sub={`${allOpps.filter((o) => o.stage !== "Closed Lost" && o.stage !== "Closed Won").length} active opps`} />
        <KpiCard label="Closed Won" value={formatDollars(wonValue)} sub={`${allOpps.filter((o) => o.stage === "Closed Won").length} won`} accent="green" />
        <KpiCard label="Companies" value={String(companies.length)} sub={`${allOpps.length} opportunities`} />
        <KpiCard label="Activities" value={String(filteredActivities.length)} sub={timeRange === "all" ? "all time" : `last ${timeRange} days`} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Pipeline by stage */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">Pipeline by Stage</h3>
          {OPP_STAGES.map((s) => {
            const { count, value } = pipelineByStage[s];
            if (count === 0) return null;
            return (
              <div key={s} className="flex items-center gap-3">
                <span className={`rounded-full px-2 py-px text-[10px] font-medium w-28 text-center ${STAGE_COLORS[s]}`}>{s}</span>
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 bg-primary/60 rounded-full"
                    style={{ width: `${Math.min(100, (count / allOpps.length) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
                {value > 0 && <span className="text-xs font-medium w-20 text-right">{formatDollars(value)}</span>}
              </div>
            );
          })}
        </div>

        {/* Activity breakdown */}
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold">Activity Breakdown</h3>
          {ACTIVITY_TYPES.map((t) => (
            byType[t] > 0 ? (
              <div key={t} className="flex items-center gap-3">
                <span className="text-sm w-5">{TYPE_ICONS[t]}</span>
                <span className="text-xs w-20">{t}</span>
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden">
                  <div
                    className="h-2 bg-primary/60 rounded-full"
                    style={{ width: `${Math.min(100, (byType[t] / filteredActivities.length) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-6 text-right">{byType[t]}</span>
              </div>
            ) : null
          ))}
          {filteredActivities.length === 0 && (
            <p className="text-xs text-muted-foreground">No activities in this period.</p>
          )}
        </div>

        {/* Top engaged companies */}
        {topCompanies.length > 0 && (
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold">Most Engaged Companies</h3>
            {topCompanies.map(([name, count]) => {
              const co = companies.find((c) => c.name === name);
              return (
                <div key={name} className="flex items-center gap-3">
                  <CompanyLogo domain={co?.domain ?? ""} name={name} />
                  <span className="text-xs font-medium flex-1 truncate">{name}</span>
                  <span className="text-xs text-muted-foreground">{count} activit{count === 1 ? "y" : "ies"}</span>
                </div>
              );
            })}
          </div>
        )}

        {/* By rep — management only */}
        {isManagement && Object.keys(byPerson).length > 0 && (
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold">Activity by Rep</h3>
            {Object.entries(byPerson).sort((a, b) => b[1] - a[1]).map(([name, count]) => (
              <div key={name} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="text-[9px] font-bold text-primary">{name.split(" ").map((p) => p[0]).join("").slice(0, 2)}</span>
                </div>
                <span className="text-xs font-medium flex-1">{name}</span>
                <div className="flex-1 bg-muted rounded-full h-2 overflow-hidden max-w-24">
                  <div
                    className="h-2 bg-primary/60 rounded-full"
                    style={{ width: `${Math.min(100, (count / filteredActivities.length) * 100)}%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground w-6 text-right">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: "green" }) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-xl font-bold mt-1 ${accent === "green" ? "text-green-600 dark:text-green-400" : ""}`}>{value}</p>
      <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
    </div>
  );
}
