import Link from "next/link";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ProgressBar } from "@/components/shared/ProgressBar";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import { HEALTH_TONE } from "@/modules/project-command-center/lib/project-health";
import {
  PROJECT_SECTION_KEYS,
  SECTION_LABEL,
  type ProjectSectionKey,
} from "@/modules/project-command-center/lib/workflow-steps";
import {
  calculateActualProgress,
  getProjectHealthSummary,
  isDoneStatus,
} from "@/modules/project-command-center/engine/workflow-engine";
import { formatCalendarDate } from "@/lib/utils";
import type { Project } from "@/types/project";
import type { AppUser } from "@/types/user";
import type { WorkflowStep } from "@/types/workflow";

type LaneKey = ProjectSectionKey | "complete";

const LANES: { key: LaneKey; label: string }[] = [
  ...PROJECT_SECTION_KEYS.map((key) => ({ key, label: SECTION_LABEL[key] })),
  { key: "complete", label: "Complete" },
];

function laneForProject(steps: WorkflowStep[]): LaneKey {
  const nextStep = [...steps].sort((a, b) => a.sortOrder - b.sortOrder).find((s) => !isDoneStatus(s.status));
  if (!nextStep) return "complete";
  return nextStep.section;
}

interface ProjectsKanbanBoardProps {
  projects: Project[];
  stepsByProject: Record<string, WorkflowStep[]>;
  users: AppUser[];
}

export function ProjectsKanbanBoard({ projects, stepsByProject, users }: ProjectsKanbanBoardProps) {
  const projectsByLane = new Map<LaneKey, Project[]>(LANES.map((lane) => [lane.key, []]));
  for (const project of projects) {
    const lane = laneForProject(stepsByProject[project.id] ?? []);
    projectsByLane.get(lane)?.push(project);
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {LANES.map((lane) => {
        const laneProjects = projectsByLane.get(lane.key) ?? [];
        return (
          <div key={lane.key} className="min-w-64 flex-1">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-semibold">{lane.label}</span>
              <span className="text-xs text-muted-foreground">{laneProjects.length}</span>
            </div>
            <div className="space-y-2 rounded-lg bg-muted/40 p-2 min-h-24">
              {laneProjects.map((project) => {
                const steps = stepsByProject[project.id] ?? [];
                const progress = calculateActualProgress(steps);
                const { health } = getProjectHealthSummary({
                  steps,
                  startDate: project.kickoffDate,
                  targetCompletionDate: project.targetCompletionDate,
                  now: new Date(),
                });
                const pm = users.find((u) => u.id === project.fieldProjectManagerId) ?? null;
                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="block rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
                  >
                    <div className="text-sm font-semibold">{project.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {project.projectNumber} · {project.customerName}
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <ProgressBar percent={progress} />
                      </div>
                      <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
                    </div>
                    <div className="mt-2">
                      <StatusBadge label={health} tone={HEALTH_TONE[health]} />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Target: {formatCalendarDate(project.targetCompletionDate)}</span>
                      {pm ? <UserAvatarImage name={pm.name} avatarUrl={pm.avatarUrl} size={22} /> : null}
                    </div>
                  </Link>
                );
              })}
              {laneProjects.length === 0 ? (
                <p className="px-1 py-2 text-xs text-muted-foreground">No projects</p>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
