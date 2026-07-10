"use client";

import { useMemo } from "react";
import { Users, AlertCircle, Building2, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";
import type { OrgPosition, OrgDepartment, OrgLocation } from "../lib/types";

interface ReportsPanelProps {
  positions: OrgPosition[];
  departments: OrgDepartment[];
  locations: OrgLocation[];
}

// ─── Shared primitives ────────────────────────────────────────────────────────

function SectionHeader({
  icon,
  title,
  summary,
}: {
  icon: React.ReactNode;
  title: string;
  summary?: string;
}) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {summary && <p className="text-xs text-muted-foreground mt-0.5">{summary}</p>}
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border bg-card py-8 text-center text-sm text-muted-foreground">
      {message}
    </div>
  );
}

function FillBar({ filled, total }: { filled: number; total: number }) {
  const pct = total === 0 ? 0 : Math.round((filled / total) * 100);
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-400" : "bg-rose-400"
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
    </div>
  );
}

// ─── Section 1: Span of Control ──────────────────────────────────────────────

function SpanOfControlSection({ positions }: { positions: OrgPosition[] }) {
  const rows = useMemo(() => {
    const countMap = new Map<string, number>();
    positions.forEach((p) => {
      if (!countMap.has(p.id)) countMap.set(p.id, 0);
      if (p.reportsToPositionId) {
        countMap.set(p.reportsToPositionId, (countMap.get(p.reportsToPositionId) ?? 0) + 1);
      }
    });
    return positions
      .map((p) => ({ ...p, directReports: countMap.get(p.id) ?? 0 }))
      .filter((p) => p.directReports > 0)
      .sort((a, b) => b.directReports - a.directReports);
  }, [positions]);

  const icCount = positions.length - rows.length;
  const avgSpan =
    rows.length === 0 ? 0 : rows.reduce((s, r) => s + r.directReports, 0) / rows.length;

  const summary =
    rows.length === 0
      ? "No reporting relationships defined yet"
      : `${rows.length} manager${rows.length !== 1 ? "s" : ""} · avg span ${avgSpan.toFixed(1)} · ${icCount} individual contributor${icCount !== 1 ? "s" : ""}`;

  return (
    <section>
      <SectionHeader
        icon={<Users className="size-4" />}
        title="Span of Control"
        summary={summary}
      />
      {rows.length === 0 ? (
        <EmptyState message="Set 'Reports To' on positions to see span of control." />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs font-semibold text-muted-foreground">
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3 hidden sm:table-cell">Department</th>
                <th className="px-4 py-3 hidden sm:table-cell">Status</th>
                <th className="px-4 py-3 text-right">Direct Reports</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((p) => (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{p.title}</td>
                  <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                    {p.department?.name ?? <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <StatusPill status={p.status} />
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">
                    {p.directReports}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ─── Section 2: Vacancies ─────────────────────────────────────────────────────

function VacancySection({ positions }: { positions: OrgPosition[] }) {
  const today = useMemo(() => new Date(), []);

  const vacancies = useMemo(() => {
    return positions
      .filter(
        (p) =>
          (p.status === "open" || p.status === "planned") &&
          !p.assignments.some((a) => a.isActive && a.assignmentType === "primary")
      )
      .sort((a, b) => {
        // Soonest target hire date first; nulls last
        if (!a.targetHireDate && !b.targetHireDate) return 0;
        if (!a.targetHireDate) return 1;
        if (!b.targetHireDate) return -1;
        return new Date(a.targetHireDate).getTime() - new Date(b.targetHireDate).getTime();
      });
  }, [positions]);

  function hireDateChip(iso: string | null) {
    if (!iso) return <span className="text-muted-foreground/40 text-xs">No date</span>;
    const d = new Date(iso);
    const daysOut = Math.round((d.getTime() - today.getTime()) / 86400000);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    const cls =
      daysOut < 0
        ? "bg-rose-100 text-rose-700"
        : daysOut <= 30
        ? "bg-amber-100 text-amber-700"
        : "bg-muted text-muted-foreground";
    return (
      <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", cls)}>
        {daysOut < 0 ? `Overdue · ` : ""}{label}
      </span>
    );
  }

  return (
    <section>
      <SectionHeader
        icon={<AlertCircle className="size-4" />}
        title="Vacancies"
        summary={
          vacancies.length === 0
            ? "No open or planned positions"
            : `${vacancies.length} unfilled position${vacancies.length !== 1 ? "s" : ""}`
        }
      />
      {vacancies.length === 0 ? (
        <EmptyState message="All positions are filled." />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs font-semibold text-muted-foreground">
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3 hidden md:table-cell">Department</th>
                <th className="px-4 py-3 hidden lg:table-cell">Location</th>
                <th className="px-4 py-3 hidden sm:table-cell">Status</th>
                <th className="px-4 py-3">Target Hire</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {vacancies.map((p) => (
                <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{p.title}</td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {p.department?.name ?? <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {p.location?.name ?? <span className="text-muted-foreground/40">—</span>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <StatusPill status={p.status} />
                  </td>
                  <td className="px-4 py-3">{hireDateChip(p.targetHireDate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ─── Section 3: By Department ─────────────────────────────────────────────────

function DepartmentSection({
  positions,
  departments,
}: {
  positions: OrgPosition[];
  departments: OrgDepartment[];
}) {
  const rows = useMemo(() => {
    const byDept = (deptId: string | null) =>
      positions.filter((p) => p.departmentId === deptId);

    const deptRows = departments.map((d) => {
      const ps = byDept(d.id);
      return {
        label: d.name,
        total: ps.length,
        filled: ps.filter((p) => p.status === "filled").length,
        open: ps.filter((p) => p.status === "open").length,
        planned: ps.filter((p) => p.status === "planned").length,
      };
    });

    const unassigned = byDept(null);
    if (unassigned.length > 0) {
      deptRows.push({
        label: "Unassigned",
        total: unassigned.length,
        filled: unassigned.filter((p) => p.status === "filled").length,
        open: unassigned.filter((p) => p.status === "open").length,
        planned: unassigned.filter((p) => p.status === "planned").length,
      });
    }

    return deptRows.filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
  }, [positions, departments]);

  return (
    <section>
      <SectionHeader
        icon={<Building2 className="size-4" />}
        title="By Department"
        summary={`${rows.length} department${rows.length !== 1 ? "s" : ""} · ${positions.length} total positions`}
      />
      {rows.length === 0 ? (
        <EmptyState message="No positions with department assignments yet." />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs font-semibold text-muted-foreground">
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Filled</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Open</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Planned</th>
                <th className="px-4 py-3 hidden md:table-cell">Fill Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.label} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">
                    {r.label === "Unassigned" ? (
                      <span className="italic text-muted-foreground">{r.label}</span>
                    ) : (
                      r.label
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">{r.total}</td>
                  <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell text-emerald-600">
                    {r.filled}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell text-amber-600">
                    {r.open}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell text-muted-foreground">
                    {r.planned}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <FillBar filled={r.filled} total={r.total} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ─── Section 4: By Location ───────────────────────────────────────────────────

function LocationSection({
  positions,
  locations,
}: {
  positions: OrgPosition[];
  locations: OrgLocation[];
}) {
  const rows = useMemo(() => {
    const byLoc = (locId: string | null) =>
      positions.filter((p) => p.locationId === locId);

    const locRows = locations.map((l) => {
      const ps = byLoc(l.id);
      const city = [l.city, l.state].filter(Boolean).join(", ");
      return {
        label: l.name,
        sub: city || null,
        total: ps.length,
        filled: ps.filter((p) => p.status === "filled").length,
        open: ps.filter((p) => p.status === "open").length,
        planned: ps.filter((p) => p.status === "planned").length,
      };
    });

    const unassigned = byLoc(null);
    if (unassigned.length > 0) {
      locRows.push({
        label: "Unassigned",
        sub: null,
        total: unassigned.length,
        filled: unassigned.filter((p) => p.status === "filled").length,
        open: unassigned.filter((p) => p.status === "open").length,
        planned: unassigned.filter((p) => p.status === "planned").length,
      });
    }

    return locRows.filter((r) => r.total > 0).sort((a, b) => b.total - a.total);
  }, [positions, locations]);

  return (
    <section>
      <SectionHeader
        icon={<MapPin className="size-4" />}
        title="By Location"
        summary={`${rows.length} location${rows.length !== 1 ? "s" : ""} · ${positions.length} total positions`}
      />
      {rows.length === 0 ? (
        <EmptyState message="No positions with location assignments yet." />
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs font-semibold text-muted-foreground">
                <th className="px-4 py-3">Location</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Filled</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Open</th>
                <th className="px-4 py-3 text-right hidden sm:table-cell">Planned</th>
                <th className="px-4 py-3 hidden md:table-cell">Fill Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((r) => (
                <tr key={r.label} className="hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3">
                    {r.label === "Unassigned" ? (
                      <span className="italic text-muted-foreground">{r.label}</span>
                    ) : (
                      <div>
                        <span className="font-medium">{r.label}</span>
                        {r.sub && (
                          <span className="block text-xs text-muted-foreground">{r.sub}</span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold">{r.total}</td>
                  <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell text-emerald-600">
                    {r.filled}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell text-amber-600">
                    {r.open}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums hidden sm:table-cell text-muted-foreground">
                    {r.planned}
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <FillBar filled={r.filled} total={r.total} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// ─── Status pill (shared) ─────────────────────────────────────────────────────

function StatusPill({ status }: { status: string }) {
  const cls: Record<string, string> = {
    filled:   "bg-emerald-100 text-emerald-700",
    open:     "bg-amber-100 text-amber-700",
    planned:  "bg-blue-100 text-blue-700",
    inactive: "bg-muted text-muted-foreground",
  };
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold capitalize", cls[status] ?? "bg-muted text-muted-foreground")}>
      {status}
    </span>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function ReportsPanel({ positions, departments, locations }: ReportsPanelProps) {
  return (
    <div className="space-y-10">
      <SpanOfControlSection positions={positions} />
      <VacancySection positions={positions} />
      <DepartmentSection positions={positions} departments={departments} />
      <LocationSection positions={positions} locations={locations} />
    </div>
  );
}
