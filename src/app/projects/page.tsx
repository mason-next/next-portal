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
import type { Project } from "@/types/project";
import type { WorkflowStep } from "@/types/workflow";

const VIEW_MODE_KEY = "projects-page:view-mode";
type ViewMode = "list" | "kanban";

export default function ProjectsPage() {
  const router = useRouter();
  const { users } = useUsersContext();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [stepsByProject, setStepsByProject] = useState<Record<string, WorkflowStep[]>>({});
  const [showNewProject, setShowNewProject] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");

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

      {projects === null ? (
        <p className="text-sm text-muted-foreground">Loading projects…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects yet.</p>
      ) : viewMode === "kanban" ? (
        <ProjectsKanbanBoard projects={projects} stepsByProject={stepsByProject} users={users} />
      ) : (
        <ul className="grid gap-3">
          {projects.map((project) => {
            const steps = stepsByProject[project.id] ?? [];
            const status = deriveProjectStatus(steps);
            const { health } = getProjectHealthSummary({
              steps,
              startDate: project.kickoffDate,
              targetCompletionDate: project.targetCompletionDate,
              now: new Date(),
            });
            const progress = calculateActualProgress(steps);
            const pm = users.find((u) => u.id === project.fieldProjectManagerId) ?? null;
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
