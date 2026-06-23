import { PHASE_WEIGHT } from "@/modules/project-command-center/lib/workflow-steps";
import type { ProjectHealth } from "@/types/project";
import type { ProjectSectionKey, WorkflowStep } from "@/types/workflow";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isDoneStatus(status: WorkflowStep["status"]): boolean {
  return status === "Complete" || status === "Not Needed";
}

export function calculateActualProgress(steps: WorkflowStep[]): number {
  return steps.filter((s) => isDoneStatus(s.status)).reduce((sum, s) => sum + s.weight, 0);
}

// How complete a single phase is, scaled to that phase's own PHASE_WEIGHT budget rather
// than the whole project's 100 — e.g. Implementation reaching its full 45 weight points
// reads as 100% here, not 45%.
export function calculatePhaseProgress(steps: WorkflowStep[], section: ProjectSectionKey): number {
  const budget = PHASE_WEIGHT[section];
  if (budget <= 0) return 100;
  const completed = steps
    .filter((s) => s.section === section && isDoneStatus(s.status))
    .reduce((sum, s) => sum + s.weight, 0);
  return Math.min((completed / budget) * 100, 100);
}

export function calculateExpectedProgress(params: {
  startDate: string | null;
  targetCompletionDate: string | null;
  now: Date;
}): number | null {
  const { startDate, targetCompletionDate, now } = params;
  if (!startDate || !targetCompletionDate) return null;

  const start = new Date(startDate).getTime();
  const target = new Date(targetCompletionDate).getTime();
  const totalDays = (target - start) / MS_PER_DAY;
  if (totalDays <= 0) return 100;

  const elapsedDays = (now.getTime() - start) / MS_PER_DAY;
  if (elapsedDays <= 0) return 0;

  return Math.min((elapsedDays / totalDays) * 100, 100);
}

export function calculateVariance(actualProgress: number, expectedProgress: number | null): number | null {
  return expectedProgress === null ? null : actualProgress - expectedProgress;
}

export function calculateProjectHealth(variance: number | null): ProjectHealth {
  if (variance === null) return "On Track";
  if (variance >= 10) return "Ahead";
  if (variance > -10) return "On Track";
  if (variance > -25) return "At Risk";
  return "Off Track";
}

export interface ProjectHealthSummary {
  actualProgress: number;
  expectedProgress: number | null;
  variance: number | null;
  health: ProjectHealth;
}

export function getProjectHealthSummary(params: {
  steps: WorkflowStep[];
  startDate: string | null;
  targetCompletionDate: string | null;
  now: Date;
}): ProjectHealthSummary {
  const actualProgress = calculateActualProgress(params.steps);
  const expectedProgress = calculateExpectedProgress(params);
  const variance = calculateVariance(actualProgress, expectedProgress);
  return { actualProgress, expectedProgress, variance, health: calculateProjectHealth(variance) };
}

export interface DerivedStatus {
  label: string;
  isComplete: boolean;
}

// The project's "current step" — the step right after the last completed one in sortOrder.
export function deriveProjectStatus(steps: WorkflowStep[]): DerivedStatus {
  const next = [...steps].sort((a, b) => a.sortOrder - b.sortOrder).find((s) => !isDoneStatus(s.status));
  return next ? { label: next.name, isComplete: false } : { label: "Complete", isComplete: true };
}
