"use client";

import { useMemo, useState } from "react";
import { Plus, Search, Building2, MapPin, Pencil, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import { cn } from "@/lib/utils";
import type { OrgPosition } from "../lib/types";

function positionStatusBadge(status: string) {
  switch (status) {
    case "filled":   return <StatusBadge label="Filled"   tone="success" />;
    case "open":     return <StatusBadge label="Open"     tone="warning" />;
    case "planned":  return <StatusBadge label="Planned"  tone="info"    />;
    case "inactive": return <StatusBadge label="Inactive" tone="neutral" />;
    default:         return <StatusBadge label={status}   tone="neutral" />;
  }
}

interface PositionListProps {
  positions: OrgPosition[];
  onAdd?: () => void;
  onEdit?: (p: OrgPosition) => void;
  isAdmin?: boolean;
}

export function PositionList({ positions, onAdd, onEdit, isAdmin = false }: PositionListProps) {
  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deptFilter,   setDeptFilter]   = useState("all");
  const [locFilter,    setLocFilter]    = useState("all");
  const [vacantOnly,   setVacantOnly]   = useState(false);

  // Derive unique departments and locations from position data (only those that appear)
  const departments = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of positions) {
      if (p.department) seen.set(p.department.id, p.department.name);
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [positions]);

  const locations = useMemo(() => {
    const seen = new Map<string, string>();
    for (const p of positions) {
      if (p.location) seen.set(p.location.id, p.location.name);
    }
    return [...seen.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  }, [positions]);

  const filtered = positions.filter((p) => {
    const q = search.toLowerCase();
    const primary = p.assignments.find((a) => a.isActive && a.assignmentType === "primary");

    const matchSearch =
      !search ||
      p.title.toLowerCase().includes(q) ||
      p.department?.name.toLowerCase().includes(q) ||
      p.location?.name.toLowerCase().includes(q) ||
      primary?.user?.name.toLowerCase().includes(q);

    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchDept   = deptFilter   === "all" || p.department?.id === deptFilter;
    const matchLoc    = locFilter    === "all" || p.location?.id   === locFilter;
    const matchVacant = !vacantOnly  || !primary?.user;

    return matchSearch && matchStatus && matchDept && matchLoc && matchVacant;
  });

  const hasActiveFilters =
    search || statusFilter !== "all" || deptFilter !== "all" || locFilter !== "all" || vacantOnly;

  function clearFilters() {
    setSearch("");
    setStatusFilter("all");
    setDeptFilter("all");
    setLocFilter("all");
    setVacantOnly(false);
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search positions, people, departments…"
            className="w-full rounded-md border bg-background pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        >
          <option value="all">All Statuses</option>
          <option value="filled">Filled</option>
          <option value="open">Open</option>
          <option value="planned">Planned</option>
          <option value="inactive">Inactive</option>
        </select>

        {departments.length > 0 && (
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">All Departments</option>
            {departments.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        )}

        {locations.length > 0 && (
          <select
            value={locFilter}
            onChange={(e) => setLocFilter(e.target.value)}
            className="rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="all">All Locations</option>
            {locations.map(([id, name]) => (
              <option key={id} value={id}>{name}</option>
            ))}
          </select>
        )}

        <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={vacantOnly}
            onChange={(e) => setVacantOnly(e.target.checked)}
            className="rounded"
          />
          <Users className="size-3.5" />
          Vacant only
        </label>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Clear filters
          </button>
        )}

        {isAdmin && onAdd && (
          <Button size="sm" onClick={onAdd}>
            <Plus className="mr-1.5 size-3.5" />
            Add Position
          </Button>
        )}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border bg-card py-12 text-center text-sm text-muted-foreground">
          {positions.length === 0
            ? "No positions yet. Create your first position to get started."
            : "No positions match your filters."}
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30 text-left text-xs font-semibold text-muted-foreground">
                <th className="px-4 py-3">Position</th>
                <th className="px-4 py-3 hidden sm:table-cell">Assigned To</th>
                <th className="px-4 py-3 hidden md:table-cell">Department</th>
                <th className="px-4 py-3 hidden lg:table-cell">Location</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 w-8" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((p) => {
                const primary = p.assignments.find(
                  (a) => a.isActive && a.assignmentType === "primary"
                );
                return (
                  <tr
                    key={p.id}
                    className={cn("hover:bg-muted/20 transition-colors", isAdmin && "cursor-pointer")}
                    onClick={() => isAdmin && onEdit?.(p)}
                  >
                    <td className="px-4 py-3 font-medium">{p.title}</td>
                    <td className="px-4 py-3 hidden sm:table-cell text-muted-foreground">
                      {primary?.user ? (
                        <span className="flex items-center gap-2">
                          <UserAvatarImage
                            name={primary.user.name}
                            avatarUrl={primary.user.avatarUrl ?? null}
                            size={24}
                          />
                          {primary.user.name}
                        </span>
                      ) : (
                        <span className="italic text-muted-foreground/60">Vacant</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                      {p.department ? (
                        <span className="flex items-center gap-1.5">
                          <Building2 className="size-3.5 flex-none" />
                          {p.department.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                      {p.location ? (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="size-3.5 flex-none" />
                          {p.location.name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{positionStatusBadge(p.status)}</td>
                    <td className="px-4 py-3">
                      <Pencil className="size-3.5 text-muted-foreground opacity-0 group-hover:opacity-100" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="border-t bg-muted/20 px-4 py-2 text-xs text-muted-foreground">
            {filtered.length} position{filtered.length !== 1 ? "s" : ""}
            {filtered.length !== positions.length && ` of ${positions.length} total`}
          </div>
        </div>
      )}
    </div>
  );
}
