"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
const FILTER_SELECT_CLASS =
  "h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary";

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
  const isAdmin = session.accountType === "Administrator";
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [stepsByProject, setStepsByProject] = useState<Record<string, WorkflowStep[]>>({});
  const [showNewProject, setShowNewProject] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [pmFilter, setPmFilter] = usePersistentFilter("projects:pmFilter", "all");
  const [statusFilter, setStatusFilter] = usePersistentFilter("projects:statusFilter", "all");
  const [healthFilter, setHealthFilter] = usePersistentFilter("projects:healthFilter", "all");
  const [dateFilter, setDateFilter] = usePersistentFilter<DateFilterKey>("projects:dateFilter", "all");
  const [adminFilterUserId, setAdminFilterUserId] = usePersistentFilter<string | null>("projects:adminFilterUserId", null);

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
        if (pmFilter === UNASSIGNED_PM && pm) return false;
        if (pmFilter !== "all" && pmFilter !== UNASSIGNED_PM && pm?.id !== pmFilter) return false;
        if (statusFilter !== "all" && status.label !== statusFilter) return false;
        if (healthFilter !== "all" && health !== healthFilter) return false;
        if (!matchesDateFilter(project.targetCompletionDate, dateFilter)) return false;
        return true;
      }),
    [enriched, pmFilter, statusFilter, healthFilter, dateFilter]
  );

  const filtersActive =
    pmFilter !== "all" || statusFilter !== "all" || healthFilter !== "all" || dateFilter !== "all" || adminFilterUserId !== null;

  function clearFilters() {
    setPmFilter("all");
    setStatusFilter("all");
    setHealthFilter("all");
    setDateFilter("all");
    setAdminFilterUserId(null);
  }

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
              className={FILTER_SELECT_CLASS}
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
          <select className={FILTER_SELECT_CLASS} value={pmFilter} onChange={(e) => setPmFilter(e.target.value)}>
            <option value="all">All Project Managers</option>
            {hasUnassignedPm ? <option value={UNASSIGNED_PM}>Unassigned</option> : null}
            {pmOptions.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
          <select
            className={FILTER_SELECT_CLASS}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            {statusOptions.map((label) => (
              <option key={label} value={label}>
                {label}
              </option>
            ))}
          </select>
          <select
            className={FILTER_SELECT_CLASS}
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
          >
            <option value="all">All Health</option>
            {PROJECT_HEALTH.map((health) => (
              <option key={health} value={health}>
                {health}
              </option>
            ))}
          </select>
          <select
            className={FILTER_SELECT_CLASS}
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
        </div>
      ) : null}

      {projects === null ? (
        <p className="text-sm text-muted-foreground">Loading projects…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects yet.</p>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects match the selected filters.</p>
      ) : viewMode === "kanban" ? (
        <ProjectsKanbanBoard
          projects={filtered.map((e) => e.project)}
          stepsByProject={stepsByProject}
          users={users}
        />
      ) : (
        <ul className="grid gap-3">
          {filtered.map(({ project, status, health, progress, pm }) => {
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
