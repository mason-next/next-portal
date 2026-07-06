import { PHASE_WEIGHT } from "@/modules/project-command-center/lib/workflow-steps";
import type { ProjectHealth } from "@/types/project";
import type { ProjectSectionKey, WorkflowStep } from "@/types/workflow";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export function isDoneStatus(status: WorkflowStep["status"]): boolean {
  return status === "Complete" || status === "Not Needed";
}

// Normalizes per-section so DB weight drift (e.g. when a section's budget changes but
// existing rows aren't migrated) never pushes the total above 100.
// Each section contributes up to PHASE_WEIGHT[section] points; within a section the
// individual step weights only determine relative contribution among siblings.
export function calculateActualProgress(steps: WorkflowStep[]): number {
  const sections = [...new Set(steps.map((s) => s.section))] as ProjectSectionKey[];
  return sections.reduce((total, section) => {
    const sectionSteps = steps.filter((s) => s.section === section);
    const sectionTotal = sectionSteps.reduce((sum, s) => sum + s.weight, 0);
    if (sectionTotal === 0) return total;
    const sectionDone = sectionSteps
      .filter((s) => isDoneStatus(s.status))
      .reduce((sum, s) => sum + s.weight, 0);
    return total + (sectionDone / sectionTotal) * (PHASE_WEIGHT[section] ?? 0);
  }, 0);
}

// How complete a single phase is as a 0-100% value.
// Normalizes against actual step weights so the result is correct even if the DB weights
// don't exactly match the PHASE_WEIGHT budget (e.g. after a budget rebalance).
export function calculatePhaseProgress(steps: WorkflowStep[], section: ProjectSectionKey): number {
  const sectionSteps = steps.filter((s) => s.section === section);
  if (sectionSteps.length === 0) return 100;
  const sectionTotal = sectionSteps.reduce((sum, s) => sum + s.weight, 0);
  if (sectionTotal === 0) return 100;
  const completed = sectionSteps
    .filter((s) => isDoneStatus(s.status))
    .reduce((sum, s) => sum + s.weight, 0);
  return Math.min((completed / sectionTotal) * 100, 100);
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
