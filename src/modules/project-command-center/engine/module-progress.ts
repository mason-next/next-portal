import { getWorkflowSteps, updateWorkflowStep } from "@/lib/data/workflow";
import { getBomRows } from "@/lib/data/bom-rows";
import { getEquipmentRows } from "@/lib/data/equipment";
import { getProject } from "@/lib/data/projects";
import { bomCompletionPercent, bomReviewStepStatus } from "@/modules/bom-release/lib/bom-progress";
import { computeEquipmentSummary, equipmentTrackingStepStatus } from "@/modules/equipment-tracking/lib/equipment-summary";
import { getInternalKickoffRecord } from "@/modules/internal-kickoff/lib/store";
import { getWelcomeLetterRecord } from "@/modules/welcome-letter/lib/store";
import type { WorkflowStep, WorkflowStepStatus } from "@/types/workflow";

export type ModuleProgressProvider = (
  projectId: string
) => Promise<{ status: WorkflowStepStatus; percent: number } | null>;

// Each entry lets a feature module report its own live status/percent into the workflow
// engine without the engine needing to know anything about that module. Adding a future
// module (Welcome Letter automation, Kickoff automation, etc.) is exactly one new entry.
export const MODULE_PROGRESS_PROVIDERS: Partial<Record<string, ModuleProgressProvider>> = {
  bomReview: async (projectId) => {
    const rows = await getBomRows(projectId);
    return { status: bomReviewStepStatus(rows), percent: rows.length ? bomCompletionPercent(rows) : 0 };
  },
  assignTeam: async (projectId) => {
    const project = await getProject(projectId);
    if (!project) return null;
    const singleRoles = [
      project.fieldProjectManagerId,
      project.solutionsExecutiveId,
      project.solutionsEngineerId,
      project.seniorInsideId,
      project.insidePMId,
    ];
    const singleFilled = singleRoles.filter(Boolean).length;
    const hasTech = project.technicians.length > 0;
    const total = singleRoles.length + 1;
    const assignedCount = singleFilled + (hasTech ? 1 : 0);
    const status: WorkflowStepStatus =
      assignedCount === 0 ? "Not Started" : assignedCount === total ? "Complete" : "In Progress";
    return { status, percent: Math.round((assignedCount / total) * 100) };
  },
  sendWelcomeLetter: async (projectId) => {
    const record = await getWelcomeLetterRecord(projectId);
    return record ? { status: "Complete", percent: 100 } : { status: "Not Started", percent: 0 };
  },
  scheduleInternalKickoff: async (projectId) => {
    const record = await getInternalKickoffRecord(projectId);
    return record ? { status: "Complete", percent: 100 } : { status: "Not Started", percent: 0 };
  },
  equipmentTracking: async (projectId) => {
    const rows = await getEquipmentRows(projectId);
    return {
      status: equipmentTrackingStepStatus(rows),
      percent: rows.length ? computeEquipmentSummary(rows).procurementProgressPercent : 0,
    };
  },
};

// The single read entry point every consumer should use instead of the raw
// lib/data/workflow.ts getWorkflowSteps — reconciles module-driven steps (like bomReview)
// against their live source on every read, so status never goes stale just because a
// particular page wasn't visited. Fixes: a step showing "Not Started" on the Dashboard
// after being completed elsewhere, simply because the Dashboard never re-synced it.
export async function getWorkflowStepsWithProgress(
  projectId: string
): Promise<{ steps: WorkflowStep[]; percentByKey: Partial<Record<string, number>> }> {
  const steps = await getWorkflowSteps(projectId);
  const percentByKey: Partial<Record<string, number>> = {};

  const reconciled = await Promise.all(
    steps.map(async (step) => {
      const provider = MODULE_PROGRESS_PROVIDERS[step.key];
      if (!provider || step.statusOverridden) return step;
      const result = await provider(projectId);
      if (!result) return step;
      percentByKey[step.key] = result.percent;
      if (result.status === step.status) return step;
      return updateWorkflowStep(projectId, step.key, { status: result.status });
    })
  );

  return { steps: reconciled, percentByKey };
}
