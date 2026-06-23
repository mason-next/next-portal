import type { ProjectSectionKey, WorkflowStep } from "@/types/workflow";
import { logProjectActivity } from "@/lib/data/activity";
import { CURRENT_USER } from "@/lib/current-user";
import { SAMPLE_PROJECT } from "@/lib/mock/projects.mock";
import { defaultWorkflowSteps, SAMPLE_WORKFLOW_STEPS } from "@/lib/mock/workflow.mock";
import { readProjectScoped, writeProjectScoped } from "@/lib/storage/local-store";
import { redistributeWeights, WORKFLOW_STEP_TEMPLATE } from "@/modules/project-command-center/lib/workflow-steps";

const WORKFLOW_STEPS_KEY = "workflow-steps";

// Backfills fields saved before they existed — section in particular, since steps used to
// derive it from a static key→section map instead of carrying it directly. Any step saved
// before this had a fixed template key, so the template lookup is always safe here.
function withStepDefaults(step: WorkflowStep): WorkflowStep {
  const template = WORKFLOW_STEP_TEMPLATE.find((entry) => entry.key === step.key);
  return {
    ...step,
    section: step.section ?? template?.section ?? "setup",
    statusOverridden: step.statusOverridden ?? false,
    weightOverridden: step.weightOverridden ?? false,
    isCustom: step.isCustom ?? false,
  };
}

export async function getWorkflowSteps(projectId: string): Promise<WorkflowStep[]> {
  const stored = readProjectScoped<WorkflowStep[]>(projectId, WORKFLOW_STEPS_KEY);
  if (stored) return stored.map(withStepDefaults);
  const seeded =
    projectId === SAMPLE_PROJECT.id
      ? SAMPLE_WORKFLOW_STEPS
      : defaultWorkflowSteps(projectId, new Date().toISOString());
  writeProjectScoped(projectId, WORKFLOW_STEPS_KEY, seeded);
  return seeded;
}

// completedDate is never set directly by callers — it's purely derived from status
// transitions: stamped the moment a step enters Complete/Not Needed, cleared the moment it leaves.
function resolveCompletedDate(current: WorkflowStep, patch: Partial<WorkflowStep>): string | null {
  if (!("status" in patch) || patch.status === current.status) return current.completedDate;
  const isDone = patch.status === "Complete" || patch.status === "Not Needed";
  return isDone ? new Date().toISOString() : null;
}

export async function updateWorkflowStep(
  projectId: string,
  key: string,
  patch: Partial<WorkflowStep>
): Promise<WorkflowStep> {
  const all = await getWorkflowSteps(projectId);
  const index = all.findIndex((s) => s.key === key);
  if (index === -1) throw new Error(`Workflow step not found: ${key}`);

  const current = all[index];
  const updated: WorkflowStep = {
    ...current,
    ...patch,
    projectId,
    key,
    completedDate: resolveCompletedDate(current, patch),
    updatedAt: new Date().toISOString(),
  };
  const next = [...all];
  next[index] = updated;
  // Editing a step's weight pins it (weightOverridden, set by the caller) — rebalance the
  // rest of its section so the phase's total weight budget stays constant.
  const reconciled = "weight" in patch ? redistributeWeights(next, current.section) : next;
  writeProjectScoped(projectId, WORKFLOW_STEPS_KEY, reconciled);

  if ("status" in patch && patch.status !== current.status) {
    await logProjectActivity(projectId, {
      category: "workflow",
      activityType: "step_status_changed",
      userName: CURRENT_USER,
      message: `"${current.name}" status changed from ${current.status} to ${patch.status}`,
    });
  }

  return reconciled.find((s) => s.key === key) ?? updated;
}

export async function addWorkflowStep(
  projectId: string,
  section: ProjectSectionKey,
  name: string,
  dueDate: string | null = null
): Promise<WorkflowStep> {
  const all = await getWorkflowSteps(projectId);
  const maxSortOrder = all.reduce((max, s) => Math.max(max, s.sortOrder), 0);
  const now = new Date().toISOString();
  const newStep: WorkflowStep = {
    id: `${projectId}:custom-${crypto.randomUUID()}`,
    projectId,
    key: `custom-${crypto.randomUUID()}`,
    name,
    section,
    weight: 0,
    status: "Not Started",
    ownerId: null,
    dueDate,
    completedDate: null,
    sortOrder: maxSortOrder + 1,
    updatedAt: now,
    statusOverridden: false,
    weightOverridden: false,
    isCustom: true,
  };
  const next = redistributeWeights([...all, newStep], section);
  writeProjectScoped(projectId, WORKFLOW_STEPS_KEY, next);
  return next.find((s) => s.key === newStep.key) ?? newStep;
}

export async function removeWorkflowStep(projectId: string, key: string): Promise<void> {
  const all = await getWorkflowSteps(projectId);
  const target = all.find((s) => s.key === key);
  if (!target) return;
  if (!target.isCustom) throw new Error("Only custom steps can be removed");
  const remaining = redistributeWeights(all.filter((s) => s.key !== key), target.section);
  writeProjectScoped(projectId, WORKFLOW_STEPS_KEY, remaining);
}
