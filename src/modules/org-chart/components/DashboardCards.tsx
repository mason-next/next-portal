"use client";

import type { OrgChartStats } from "../lib/types";

interface CardProps {
  label: string;
  value: number;
  sublabel?: string;
  accent?: string;
}

function StatCard({ label, value, sublabel, accent = "bg-muted" }: CardProps) {
  return (
    <div className="rounded-xl border bg-card shadow-sm p-5">
      <div className={`mb-3 inline-flex h-9 w-9 items-center justify-center rounded-lg ${accent}`}>
        <span className="text-lg font-bold tabular-nums">{value}</span>
      </div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
      <div className="mt-1 text-sm font-medium text-foreground">{label}</div>
      {sublabel && <div className="text-xs text-muted-foreground mt-0.5">{sublabel}</div>}
    </div>
  );
}

export function DashboardCards({ stats }: { stats: OrgChartStats }) {
  const fillRate =
    stats.totalPositions > 0
      ? Math.round((stats.filledPositions / stats.totalPositions) * 100)
      : 0;

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
      <div className="rounded-xl border bg-card shadow-sm p-5 col-span-2 sm:col-span-3 lg:col-span-2">
        <div className="text-3xl font-bold tabular-nums">{stats.totalPositions}</div>
        <div className="mt-1 text-sm font-medium text-foreground">Total Positions</div>
        <div className="mt-3 h-2 w-full rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${fillRate}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{fillRate}% filled</div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm p-5">
        <div className="text-2xl font-bold tabular-nums text-emerald-600">{stats.filledPositions}</div>
        <div className="mt-1 text-sm font-medium text-foreground">Filled</div>
        <div className="mt-0.5 text-xs text-muted-foreground">Active headcount</div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm p-5">
        <div className="text-2xl font-bold tabular-nums text-amber-600">{stats.openPositions}</div>
        <div className="mt-1 text-sm font-medium text-foreground">Open</div>
        <div className="mt-0.5 text-xs text-muted-foreground">Needs hiring</div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm p-5">
        <div className="text-2xl font-bold tabular-nums text-sky-600">{stats.plannedPositions}</div>
        <div className="mt-1 text-sm font-medium text-foreground">Planned</div>
        <div className="mt-0.5 text-xs text-muted-foreground">Future roles</div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm p-5">
        <div className="flex flex-col gap-2">
          <div>
            <div className="text-xl font-bold tabular-nums">{stats.totalDepartments}</div>
            <div className="text-xs font-medium text-muted-foreground">Departments</div>
          </div>
          <div>
            <div className="text-xl font-bold tabular-nums">{stats.totalLocations}</div>
            <div className="text-xs font-medium text-muted-foreground">Locations</div>
          </div>
        </div>
      </div>
    </div>
  );
}
