"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowUp, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { UserInlineLabel } from "@/components/shared/UserInlineLabel";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { useSession } from "@/lib/auth/client";
import { getProjects } from "@/lib/data/projects";
import { getWorkflowStepsForProjects } from "@/lib/data/workflow";
import { NewProjectModal } from "@/components/shared/AppShell/NewProjectModal";
import { BulkImportModal } from "@/components/shared/AppShell/BulkImportModal";
import {
  calculateActualProgress,
  deriveProjectStatus,
  getProjectHealthSummary,
} from "@/modules/project-command-center/engine/workflow-engine";
import { HEALTH_TONE } from "@/modules/project-command-center/lib/project-health";
import { formatCalendarDate, cn } from "@/lib/utils";
import { readGlobal, writeGlobal } from "@/lib/storage/local-store";
import { usePersistentFilter } from "@/lib/storage/use-persistent-filter";
import { ProjectsKanbanBoard } from "@/modules/project-command-center/components/ProjectsKanbanBoard";
import { PROJECT_HEALTH } from "@/types/project";
import type { Project } from "@/types/project";
import type { WorkflowStep } from "@/types/workflow";

const VIEW_MODE_KEY = "projects-page:view-mode";
type ViewMode = "list" | "kanban";

const UNASSIGNED_PM = "unassigned";

// ─── Sort ─────────────────────────────────────────────────────────────────────

type SortField = "name" | "projectNumber" | "customer" | "pm" | "targetDate" | "progress" | "health";
type SortDir   = "asc" | "desc";

const SORT_LABELS: Record<SortField, string> = {
  name:          "Project Name",
  projectNumber: "Project #",
  customer:      "Customer",
  pm:            "Project Manager",
  targetDate:    "Target Date",
  progress:      "Progress",
  health:        "Health",
};

const HEALTH_ORDER: Record<string, number> = {
  "Ahead": 0, "On Track": 1, "At Risk": 2, "Off Track": 3,
};

// ─── Date filter helpers ──────────────────────────────────────────────────────

type DateFilterKey =
  | "all"
  | "this-week"
  | "next-week"
  | "this-month"
  | "next-month"
  | "this-quarter"
  | "next-quarter"
  | "this-year"
  | "overdue"
  | "no-date";

const DATE_FILTER_LABELS: Record<DateFilterKey, string> = {
  "all":          "All Dates",
  "this-week":    "This Week",
  "next-week":    "Next Week",
  "this-month":   "This Month",
  "next-month":   "Next Month",
  "this-quarter": "This Quarter",
  "next-quarter": "Next Quarter",
  "this-year":    "This Year",
  "overdue":      "Overdue",
  "no-date":      "No Target Date",
};

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function matchesDateFilter(targetDate: string | null, key: DateFilterKey): boolean {
  if (key === "all") return true;
  if (key === "no-date") return targetDate === null;
  if (targetDate === null) return false;

  const now = new Date();
  const today = startOfDay(now);
  const target = startOfDay(new Date(targetDate));

  const weekday = today.getDay(); // 0=Sun
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((weekday + 6) % 7));

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthEnd   = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const quarter = Math.floor(today.getMonth() / 3);
  const quarterStart = new Date(today.getFullYear(), quarter * 3, 1);
  const quarterEnd   = new Date(today.getFullYear(), quarter * 3 + 3, 0);

  const yearStart = new Date(today.getFullYear(), 0, 1);
  const yearEnd   = new Date(today.getFullYear(), 11, 31);

  const inRange = (start: Date, end: Date) => target >= start && target <= end;

  switch (key) {
    case "this-week": {
      const sun = new Date(monday); sun.setDate(monday.getDate() + 6);
      return inRange(monday, sun);
    }
    case "next-week": {
      const nextMon = new Date(monday); nextMon.setDate(monday.getDate() + 7);
      const nextSun = new Date(nextMon); nextSun.setDate(nextMon.getDate() + 6);
      return inRange(nextMon, nextSun);
    }
    case "this-month":   return inRange(monthStart, monthEnd);
    case "next-month": {
      const nm = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const nme = new Date(today.getFullYear(), today.getMonth() + 2, 0);
      return inRange(nm, nme);
    }
    case "this-quarter":  return inRange(quarterStart, quarterEnd);
    case "next-quarter": {
      const nqs = new Date(today.getFullYear(), (quarter + 1) * 3, 1);
      const nqe = new Date(today.getFullYear(), (quarter + 1) * 3 + 3, 0);
      return inRange(nqs, nqe);
    }
    case "this-year":  return inRange(yearStart, yearEnd);
    case "overdue":    return target < today;
    default:           return true;
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProjectsPage() {
  const router = useRouter();
  const session = useSession();
  const { users } = useUsersContext();
  const isAdmin = session.roleTypes.includes("Administrator");
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [stepsByProject, setStepsByProject] = useState<Record<string, WorkflowStep[]>>({});
  const [showNewProject, setShowNewProject] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [pmFilter, setPmFilter] = usePersistentFilter<string[]>("projects:pmFilter.v2", []);
  const [statusFilter, setStatusFilter] = usePersistentFilter<string[]>("projects:statusFilter.v2", []);
  const [healthFilter, setHealthFilter] = usePersistentFilter<string[]>("projects:healthFilter.v2", []);
  const [dateFilter, setDateFilter] = usePersistentFilter<DateFilterKey>("projects:dateFilter", "all");
  const [adminFilterUserId, setAdminFilterUserId] = usePersistentFilter<string | null>("projects:adminFilterUserId", null);
  const [sortField, setSortField] = usePersistentFilter<SortField>("projects:sortField", "name");
  const [sortDir, setSortDir]     = usePersistentFilter<SortDir>("projects:sortDir", "asc");

  useEffect(() => {
    queueMicrotask(() => setViewMode(readGlobal<ViewMode>(VIEW_MODE_KEY) ?? "list"));
  }, []);

  // Performance: load projects + all their steps in 2 parallel queries instead of N+1.
  const loadProjects = useCallback(async () => {
    setProjects(null);
    const opts = isAdmin && adminFilterUserId ? { filterUserId: adminFilterUserId } : undefined;
    const loaded = await getProjects(opts);
    setProjects(loaded);
    const byProject = await getWorkflowStepsForProjects(loaded.map((p) => p.id));
    setStepsByProject(byProject);
  }, [adminFilterUserId, isAdmin]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode);
    writeGlobal(VIEW_MODE_KEY, mode);
  }

  // Memoize expensive derivations so they don't recompute on filter-state changes.
  const userById = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);

  const enriched = useMemo(
    () =>
      (projects ?? []).map((project) => {
        const steps = stepsByProject[project.id] ?? [];
        const status = deriveProjectStatus(steps);
        const { health } = getProjectHealthSummary({
          steps,
          startDate: project.createdAt,
          targetCompletionDate: project.targetCompletionDate,
          now: new Date(),
        });
        const progress = calculateActualProgress(steps);
        const pm = userById.get(project.fieldProjectManagerId ?? "") ?? null;
        return { project, status, health, progress, pm };
      }),
    [projects, stepsByProject, userById]
  );

  const pmOptions = useMemo(
    () =>
      [...new Map(enriched.filter((e) => e.pm).map((e) => [e.pm!.id, e.pm!.name])).entries()].sort(
        (a, b) => a[1].localeCompare(b[1])
      ),
    [enriched]
  );
  const hasUnassignedPm = useMemo(() => enriched.some((e) => !e.pm), [enriched]);
  const statusOptions = useMemo(
    () => [...new Set(enriched.map((e) => e.status.label))].sort((a, b) => a.localeCompare(b)),
    [enriched]
  );

  const filtered = useMemo(
    () =>
      enriched.filter(({ project, status, health, pm }) => {
        if (pmFilter.length > 0) {
          const pmId = pm?.id ?? UNASSIGNED_PM;
          if (!pmFilter.includes(pmId)) return false;
        }
        if (statusFilter.length > 0 && !statusFilter.includes(status.label)) return false;
        if (healthFilter.length > 0 && !healthFilter.includes(health)) return false;
        if (!matchesDateFilter(project.targetCompletionDate, dateFilter)) return false;
        return true;
      }),
    [enriched, pmFilter, statusFilter, healthFilter, dateFilter]
  );

  const filtersActive =
    pmFilter.length > 0 || statusFilter.length > 0 || healthFilter.length > 0 || dateFilter !== "all" || adminFilterUserId !== null;

  function clearFilters() {
    setPmFilter([]);
    setStatusFilter([]);
    setHealthFilter([]);
    setDateFilter("all");
    setAdminFilterUserId(null);
  }

  function toggleSortDir() {
    setSortDir(sortDir === "asc" ? "desc" : "asc");
  }

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    return [...filtered].sort((a, b) => {
      switch (sortField) {
        case "name":
          return dir * a.project.name.localeCompare(b.project.name);
        case "projectNumber":
          return dir * a.project.projectNumber.localeCompare(b.project.projectNumber);
        case "customer":
          return dir * a.project.customerName.localeCompare(b.project.customerName);
        case "pm": {
          const pA = a.pm?.name ?? "";
          const pB = b.pm?.name ?? "";
          return dir * pA.localeCompare(pB);
        }
        case "targetDate": {
          const dA = a.project.targetCompletionDate ? new Date(a.project.targetCompletionDate).getTime() : Infinity;
          const dB = b.project.targetCompletionDate ? new Date(b.project.targetCompletionDate).getTime() : Infinity;
          return dir * (dA - dB);
        }
        case "progress":
          return dir * (a.progress - b.progress);
        case "health": {
          const hA = HEALTH_ORDER[a.health] ?? 99;
          const hB = HEALTH_ORDER[b.health] ?? 99;
          return dir * (hA - hB);
        }
        default:
          return 0;
      }
    });
  }, [filtered, sortField, sortDir]);

  return (
    <div className={cn("p-4 sm:p-8", viewMode === "kanban" ? "w-full" : "mx-auto max-w-5xl")}>
      <div className="mb-4 sm:mb-6 flex items-center justify-between gap-2">
        <h1 className="text-lg sm:text-xl font-semibold tracking-tight">Projects</h1>
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center rounded-md border p-0.5">
            <button
              type="button"
              onClick={() => changeViewMode("list")}
              className={cn(
                "rounded-sm px-2.5 py-1 text-sm",
                viewMode === "list" ? "bg-muted font-semibold" : "text-muted-foreground"
              )}
            >
              List
            </button>
            <button
              type="button"
              onClick={() => changeViewMode("kanban")}
              className={cn(
                "rounded-sm px-2.5 py-1 text-sm",
                viewMode === "kanban" ? "bg-muted font-semibold" : "text-muted-foreground"
              )}
            >
              Kanban
            </button>
          </div>
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={() => setShowBulkImport(true)}>
              Bulk Import
            </Button>
          )}
          <Button onClick={() => setShowNewProject(true)} size="sm">New Project</Button>
        </div>
      </div>

      {projects !== null && projects.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {isAdmin ? (
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              value={adminFilterUserId ?? ""}
              onChange={(e) => setAdminFilterUserId(e.target.value || null)}
            >
              <option value="">All projects</option>
              {users.filter((u) => u.isActive).map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          ) : null}
          <MultiSelectFilter
            label="Project Manager"
            options={[
              ...(hasUnassignedPm ? [{ value: UNASSIGNED_PM, label: "Unassigned" }] : []),
              ...pmOptions.map(([id, name]) => ({ value: id, label: name })),
            ]}
            selected={pmFilter}
            onChange={setPmFilter}
          />
          <MultiSelectFilter
            label="Status"
            options={statusOptions.map((label) => ({ value: label, label }))}
            selected={statusFilter}
            onChange={setStatusFilter}
          />
          <MultiSelectFilter
            label="Health"
            options={PROJECT_HEALTH.map((h) => ({ value: h, label: h }))}
            selected={healthFilter}
            onChange={setHealthFilter}
          />
          <select
            className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as DateFilterKey)}
          >
            {(Object.keys(DATE_FILTER_LABELS) as DateFilterKey[]).map((key) => (
              <option key={key} value={key}>
                {DATE_FILTER_LABELS[key]}
              </option>
            ))}
          </select>
          {filtersActive ? (
            <button
              type="button"
              onClick={clearFilters}
              className="text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
            >
              Clear filters
            </button>
          ) : null}

          <div className="ml-auto flex items-center gap-1.5">
            <select
              className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
              value={sortField}
              onChange={(e) => setSortField(e.target.value as SortField)}
              aria-label="Sort by"
            >
              {(Object.keys(SORT_LABELS) as SortField[]).map((key) => (
                <option key={key} value={key}>{SORT_LABELS[key]}</option>
              ))}
            </select>
            <button
              type="button"
              onClick={toggleSortDir}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title={sortDir === "asc" ? "Ascending — click to sort descending" : "Descending — click to sort ascending"}
            >
              {sortDir === "asc" ? <ArrowUp className="size-3.5" /> : <ArrowDown className="size-3.5" />}
            </button>
          </div>
        </div>
      ) : null}

      {projects === null ? (
        <p className="text-sm text-muted-foreground">Loading projects…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects yet.</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects match the selected filters.</p>
      ) : viewMode === "kanban" ? (
        <ProjectsKanbanBoard
          projects={sorted.map((e) => e.project)}
          stepsByProject={stepsByProject}
          users={users}
        />
      ) : (
        <ul className="grid gap-3">
          {sorted.map(({ project, status, health, progress, pm }) => {
            return (
              <li key={project.id}>
                <Link
                  href={`/projects/${project.id}`}
                  className="block rounded-lg border bg-card p-4 sm:p-5 transition-colors hover:bg-accent"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold leading-snug">{project.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {project.projectNumber} · {project.customerName}
                        </div>
                        {project.projectTypes.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {project.projectTypes.map((type) => (
                              <span key={type} className="inline-flex items-center rounded-full bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
                                {type}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <StatusBadge label={status.label} tone={status.isComplete ? "success" : "neutral"} />
                        <StatusBadge label={health} tone={HEALTH_TONE[health]} />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                          <span><UserInlineLabel user={pm} /></span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                        <ProgressBar percent={progress} />
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Target: {formatCalendarDate(project.targetCompletionDate)}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {showNewProject ? (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={(project) => router.push(`/projects/${project.id}`)}
        />
      ) : null}
      {showBulkImport ? (
        <BulkImportModal
          onClose={() => setShowBulkImport(false)}
          onDone={() => { setShowBulkImport(false); void loadProjects(); }}
        />
      ) : null}
    </div>
  );
}

// ─── Multi-select filter dropdown ─────────────────────────────────────────────

function MultiSelectFilter({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (v: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  function toggle(value: string) {
    onChange(
      selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]
    );
  }

  const allSelected = options.length > 0 && options.every((o) => selected.includes(o.value));

  function toggleAll() {
    onChange(allSelected ? [] : options.map((o) => o.value));
  }

  const buttonLabel =
    selected.length === 0
      ? `All ${label}s`
      : selected.length === 1
        ? (options.find((o) => o.value === selected[0])?.label ?? selected[0])
        : `${label}: ${selected.length} selected`;

  const active = selected.length > 0;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm transition-colors",
          active
            ? "border-primary bg-primary/5 text-primary font-medium"
            : "border-input bg-background text-foreground hover:bg-muted"
        )}
      >
        <span className="max-w-[160px] truncate">{buttonLabel}</span>
        <ChevronDown className={cn("size-3.5 shrink-0 opacity-50 transition-transform", open && "rotate-180")} />
      </button>

      {open && options.length > 0 && (
        <div className="absolute left-0 z-50 mt-1 min-w-[180px] rounded-md border bg-popover py-1 shadow-md">
          <label className="flex cursor-pointer items-center gap-2.5 border-b border-border/50 px-3 py-1.5 text-sm hover:bg-muted">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              className="h-3.5 w-3.5 shrink-0 rounded accent-primary"
            />
            <span className="font-medium text-muted-foreground">Select All</span>
          </label>
          {options.map((opt) => (
            <label
              key={opt.value}
              className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-sm hover:bg-muted"
            >
              <input
                type="checkbox"
                checked={selected.includes(opt.value)}
                onChange={() => toggle(opt.value)}
                className="h-3.5 w-3.5 shrink-0 rounded accent-primary"
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
