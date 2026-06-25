"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { UserInlineLabel } from "@/components/shared/UserInlineLabel";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { getProjects } from "@/lib/data/projects";
import { getWorkflowStepsWithProgress } from "@/modules/project-command-center/engine/module-progress";
import { NewProjectModal } from "@/components/shared/AppShell/NewProjectModal";
import {
  calculateActualProgress,
  deriveProjectStatus,
  getProjectHealthSummary,
} from "@/modules/project-command-center/engine/workflow-engine";
import { HEALTH_TONE } from "@/modules/project-command-center/lib/project-health";
import { formatCalendarDate, cn } from "@/lib/utils";
import { readGlobal, writeGlobal } from "@/lib/storage/local-store";
import { ProjectsKanbanBoard } from "@/modules/project-command-center/components/ProjectsKanbanBoard";
import { PROJECT_HEALTH } from "@/types/project";
import type { Project } from "@/types/project";
import type { WorkflowStep } from "@/types/workflow";

const VIEW_MODE_KEY = "projects-page:view-mode";
type ViewMode = "list" | "kanban";

const UNASSIGNED_PM = "unassigned";
const FILTER_SELECT_CLASS =
  "h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary";

export default function ProjectsPage() {
  const router = useRouter();
  const { users } = useUsersContext();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [stepsByProject, setStepsByProject] = useState<Record<string, WorkflowStep[]>>({});
  const [showNewProject, setShowNewProject] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [pmFilter, setPmFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [healthFilter, setHealthFilter] = useState("all");

  useEffect(() => {
    queueMicrotask(() => setViewMode(readGlobal<ViewMode>(VIEW_MODE_KEY) ?? "list"));
  }, []);

  function changeViewMode(mode: ViewMode) {
    setViewMode(mode);
    writeGlobal(VIEW_MODE_KEY, mode);
  }

  useEffect(() => {
    getProjects().then(async (loaded) => {
      setProjects(loaded);
      const entries = await Promise.all(
        loaded.map(async (p) => [p.id, (await getWorkflowStepsWithProgress(p.id)).steps] as const)
      );
      setStepsByProject(Object.fromEntries(entries));
    });
  }, []);

  const enriched = (projects ?? []).map((project) => {
    const steps = stepsByProject[project.id] ?? [];
    const status = deriveProjectStatus(steps);
    const { health } = getProjectHealthSummary({
      steps,
      startDate: project.createdAt,
      targetCompletionDate: project.targetCompletionDate,
      now: new Date(),
    });
    const progress = calculateActualProgress(steps);
    const pm = users.find((u) => u.id === project.fieldProjectManagerId) ?? null;
    return { project, status, health, progress, pm };
  });

  const pmOptions = [...new Map(enriched.filter((e) => e.pm).map((e) => [e.pm!.id, e.pm!.name])).entries()].sort(
    (a, b) => a[1].localeCompare(b[1])
  );
  const hasUnassignedPm = enriched.some((e) => !e.pm);
  const statusOptions = [...new Set(enriched.map((e) => e.status.label))].sort((a, b) => a.localeCompare(b));

  const filtered = enriched.filter(({ status, health, pm }) => {
    if (pmFilter === UNASSIGNED_PM && pm) return false;
    if (pmFilter !== "all" && pmFilter !== UNASSIGNED_PM && pm?.id !== pmFilter) return false;
    if (statusFilter !== "all" && status.label !== statusFilter) return false;
    if (healthFilter !== "all" && health !== healthFilter) return false;
    return true;
  });

  const filtersActive = pmFilter !== "all" || statusFilter !== "all" || healthFilter !== "all";

  function clearFilters() {
    setPmFilter("all");
    setStatusFilter("all");
    setHealthFilter("all");
  }

  return (
    <div className={cn("p-8", viewMode === "kanban" ? "w-full" : "mx-auto max-w-5xl")}>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
        <div className="flex items-center gap-2">
          <div className="flex items-center rounded-md border p-0.5">
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
          <Button onClick={() => setShowNewProject(true)}>New Project</Button>
        </div>
      </div>

      {projects !== null && projects.length > 0 ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
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
                  className="block rounded-lg border bg-card p-5 transition-colors hover:bg-accent"
                >
                  <div className="flex items-center justify-between gap-6">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold">{project.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {project.projectNumber} · {project.customerName}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-32">
                        <div className="mb-1 text-right text-xs text-muted-foreground">{Math.round(progress)}%</div>
                        <ProgressBar percent={progress} />
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge label={status.label} tone={status.isComplete ? "success" : "neutral"} />
                        <StatusBadge label={health} tone={HEALTH_TONE[health]} />
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
                    <span>Target Completion: {formatCalendarDate(project.targetCompletionDate)}</span>
                    <UserInlineLabel user={pm} />
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
    </div>
  );
}
