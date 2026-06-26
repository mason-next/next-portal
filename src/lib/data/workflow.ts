"use server";

import {
  WorkflowSection,
  WorkflowStepStatus as WfStatus,
  type WorkflowStep as PrismaStep,
} from "@prisma/client";
import { db } from "@/lib/db";
import { logProjectActivity } from "@/lib/data/activity";
import { CURRENT_USER } from "@/lib/current-user";
import { defaultWorkflowSteps } from "@/lib/mock/workflow.mock";
import {
  redistributeWeights,
  WORKFLOW_STEP_TEMPLATE,
} from "@/modules/project-command-center/lib/workflow-steps";
import type { ProjectSectionKey, WorkflowStep, WorkflowStepStatus } from "@/types/workflow";

// ─── Enum converters ──────────────────────────────────────────────────────────

// WfStatus enum values are the TypeScript identifiers (e.g. "NotStarted"); the @map
// values ("Not Started") only affect what PostgreSQL stores, not what the client sees.
const STATUS_FROM_DB: Record<WfStatus, WorkflowStepStatus> = {
  [WfStatus.NotStarted]: "Not Started",
  [WfStatus.InProgress]: "In Progress",
  [WfStatus.Complete]: "Complete",
  [WfStatus.NotNeeded]: "Not Needed",
};

const STATUS_TO_DB: Record<WorkflowStepStatus, WfStatus> = {
  "Not Started": WfStatus.NotStarted,
  "In Progress": WfStatus.InProgress,
  "Complete": WfStatus.Complete,
  "Not Needed": WfStatus.NotNeeded,
};

// WorkflowSection enum values are lowercase strings identical to ProjectSectionKey —
// the cast below is always safe.
const SECTION_TO_DB: Record<ProjectSectionKey, WorkflowSection> = {
  setup: WorkflowSection.setup,
  engineering: WorkflowSection.engineering,
  procurement: WorkflowSection.procurement,
  implementation: WorkflowSection.implementation,
  closeout: WorkflowSection.closeout,
};

// ─── Type mapper ──────────────────────────────────────────────────────────────

function toStep(p: PrismaStep): WorkflowStep {
  return {
    id: p.id,
    projectId: p.projectId,
    key: p.key,
    name: p.name,
    section: p.section as unknown as ProjectSectionKey,
    weight: p.weight,
    status: STATUS_FROM_DB[p.status] ?? "Not Started",
    ownerId: p.ownerId,
    dueDate: p.dueDate?.toISOString() ?? null,
    completedDate: p.completedDate?.toISOString() ?? null,
    sortOrder: p.sortOrder,
    statusOverridden: p.statusOverridden,
    weightOverridden: p.weightOverridden,
    isCustom: p.isCustom,
    updatedAt: p.updatedAt.toISOString(),
  };
}

function toDbCreate(s: WorkflowStep) {
  return {
    id: s.id,
    projectId: s.projectId,
    key: s.key,
    name: s.name,
    section: SECTION_TO_DB[s.section],
    weight: s.weight,
    status: STATUS_TO_DB[s.status],
    ownerId: s.ownerId ?? null,
    dueDate: s.dueDate ? new Date(s.dueDate) : null,
    completedDate: s.completedDate ? new Date(s.completedDate) : null,
    sortOrder: s.sortOrder,
    statusOverridden: s.statusOverridden,
    weightOverridden: s.weightOverridden,
    isCustom: s.isCustom,
    updatedAt: new Date(s.updatedAt),
  };
}

// ─── Weight redistribution ────────────────────────────────────────────────────

// Recomputes the even-split weight budget for non-overridden steps in the section
// and persists the new values. Called after any add/remove/weight-change.
async function redistributeWeightsDb(projectId: string, section: ProjectSectionKey): Promise<void> {
  const dbSteps = await db.workflowStep.findMany({
    where: { projectId, section: SECTION_TO_DB[section] },
  });
  const appSteps = dbSteps.map(toStep);
  const redistributed = redistributeWeights(appSteps, section);

  await Promise.all(
    redistributed
      .filter((s) => !s.weightOverridden)
      .map((s) =>
        db.workflowStep.update({
          where: { projectId_key: { projectId, key: s.key } },
          data: { weight: s.weight },
        })
      )
  );
}

// ─── Template reconciliation ──────────────────────────────────────────────────

// Adds built-in template steps missing from the project (added to the template after the
// project was created) and removes template steps deleted from the template. Custom steps
// are never touched. Persists changes to the DB and returns the updated step list.
async function reconcileTemplateStepsDb(
  projectId: string,
  steps: WorkflowStep[]
): Promise<WorkflowStep[]> {
  const templateKeys = new Set<string>(WORKFLOW_STEP_TEMPLATE.map((e) => e.key));
  const toRemove = steps.filter((s) => !s.isCustom && !templateKeys.has(s.key));

  const existingKeys = new Set(steps.map((s) => s.key));
  const toAdd = WORKFLOW_STEP_TEMPLATE.filter((e) => !existingKeys.has(e.key));

  if (toRemove.length === 0 && toAdd.length === 0) return steps;

  if (toRemove.length > 0) {
    await db.workflowStep.deleteMany({
      where: { projectId, key: { in: toRemove.map((s) => s.key) } },
    });
  }

  const now = new Date().toISOString();
  const newSteps: WorkflowStep[] = toAdd.map((entry) => ({
    id: `${projectId}:${entry.key}`,
    projectId,
    key: entry.key,
    name: entry.name,
    section: entry.section,
    weight: 0,
    sortOrder: entry.sortOrder,
    status: "Not Started" as WorkflowStepStatus,
    ownerId: null,
    dueDate: null,
    completedDate: null,
    updatedAt: now,
    statusOverridden: false,
    weightOverridden: false,
    isCustom: false,
  }));

  if (newSteps.length > 0) {
    await db.workflowStep.createMany({ data: newSteps.map(toDbCreate) });
  }

  const affectedSections = new Set([
    ...toRemove.map((s) => s.section),
    ...newSteps.map((s) => s.section),
  ]);
  for (const section of affectedSections) {
    await redistributeWeightsDb(projectId, section as ProjectSectionKey);
  }

  const refreshed = await db.workflowStep.findMany({
    where: { projectId },
    orderBy: { sortOrder: "asc" },
  });
  return refreshed.map(toStep);
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getWorkflowSteps(projectId: string): Promise<WorkflowStep[]> {
  const dbSteps = await db.workflowStep.findMany({
    where: { projectId },
    orderBy: { sortOrder: "asc" },
  });

  // Auto-seed template steps for new projects that have none in the DB.
  if (dbSteps.length === 0) {
    const project = await db.project.findUnique({
      where: { id: projectId },
      select: { createdAt: true },
    });
    if (!project) throw new Error(`Project not found: ${projectId}`);
    const defaults = defaultWorkflowSteps(projectId, project.createdAt.toISOString());
    await db.workflowStep.createMany({ data: defaults.map(toDbCreate) });
    return defaults;
  }

  return reconcileTemplateStepsDb(projectId, dbSteps.map(toStep));
}

// ─── Mutations ────────────────────────────────────────────────────────────────

// completedDate is purely derived from status transitions — never set directly by callers.
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
  const current = await db.workflowStep.findUnique({
    where: { projectId_key: { projectId, key } },
  });
  if (!current) throw new Error(`Workflow step not found: ${key}`);

  const currentApp = toStep(current);
  const completedDate = resolveCompletedDate(currentApp, patch);

  const data: Parameters<typeof db.workflowStep.update>[0]["data"] = {};
  if ("name" in patch)             data.name = patch.name;
  if ("status" in patch)           data.status = STATUS_TO_DB[patch.status!];
  if ("ownerId" in patch)          data.ownerId = patch.ownerId ?? null;
  if ("dueDate" in patch)          data.dueDate = patch.dueDate ? new Date(patch.dueDate) : null;
  if ("weight" in patch)           data.weight = patch.weight;
  if ("weightOverridden" in patch) data.weightOverridden = patch.weightOverridden;
  if ("statusOverridden" in patch) data.statusOverridden = patch.statusOverridden;
  if ("sortOrder" in patch)        data.sortOrder = patch.sortOrder;
  if (completedDate !== currentApp.completedDate) {
    data.completedDate = completedDate ? new Date(completedDate) : null;
  }

  await db.workflowStep.update({ where: { projectId_key: { projectId, key } }, data });

  // Rebalance section weights when this step's weight was explicitly set.
  if ("weight" in patch) {
    await redistributeWeightsDb(projectId, currentApp.section);
  }

  if ("status" in patch && patch.status !== currentApp.status) {
    await logProjectActivity(projectId, {
      category: "workflow",
      activityType: "step_status_changed",
      userName: CURRENT_USER,
      message: `"${currentApp.name}" status changed from ${currentApp.status} to ${patch.status}`,
    });
  }

  // Re-fetch to return post-redistribution weight if it changed.
  const final = await db.workflowStep.findUnique({
    where: { projectId_key: { projectId, key } },
  });
  return toStep(final ?? current);
}

export async function addWorkflowStep(
  projectId: string,
  section: ProjectSectionKey,
  name: string,
  dueDate: string | null = null
): Promise<WorkflowStep> {
  const maxResult = await db.workflowStep.aggregate({
    where: { projectId },
    _max: { sortOrder: true },
  });
  const maxSortOrder = maxResult._max.sortOrder ?? 0;

  const customKey = `custom-${crypto.randomUUID()}`;
  const newStep = await db.workflowStep.create({
    data: {
      id: `${projectId}:${customKey}`,
      projectId,
      key: customKey,
      name,
      section: SECTION_TO_DB[section],
      weight: 0,
      status: WfStatus.NotStarted,
      ownerId: null,
      dueDate: dueDate ? new Date(dueDate) : null,
      completedDate: null,
      sortOrder: maxSortOrder + 1,
      statusOverridden: false,
      weightOverridden: false,
      isCustom: true,
    },
  });

  await redistributeWeightsDb(projectId, section);

  const final = await db.workflowStep.findUnique({
    where: { projectId_key: { projectId, key: customKey } },
  });
  return toStep(final ?? newStep);
}

export async function removeWorkflowStep(projectId: string, key: string): Promise<void> {
  const step = await db.workflowStep.findUnique({
    where: { projectId_key: { projectId, key } },
  });
  if (!step) return;
  if (!step.isCustom) throw new Error("Only custom steps can be removed");

  const section = step.section as unknown as ProjectSectionKey;

  await db.workflowStep.delete({
    where: { projectId_key: { projectId, key } },
  });

  await redistributeWeightsDb(projectId, section);
}
