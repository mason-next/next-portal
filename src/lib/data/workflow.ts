"use server";

import {
  WorkflowSection,
  WorkflowStepStatus as WfStatus,
  type WorkflowStep as PrismaStep,
} from "@prisma/client";
import { db } from "@/lib/db";
import { logProjectActivity } from "@/lib/data/activity-log";
import { getServerSession } from "@/lib/auth/server";
import { requireEditPermission } from "@/lib/access-control";
import { defaultWorkflowSteps } from "@/lib/mock/workflow.mock";
import {
  redistributeWeights,
  shouldIncludeStepForTypes,
  shouldIncludeStepForTypesWithConfig,
  DEFAULT_PROJECT_TYPE_CONFIG,
  WORKFLOW_STEP_TEMPLATE,
} from "@/modules/project-command-center/lib/workflow-steps";
import { getProjectTypeConfig } from "@/lib/data/workflow-type-config";
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
  serviceWarranty: WorkflowSection.serviceWarranty,
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
    isExcluded: (p as unknown as { isExcluded?: boolean }).isExcluded ?? false,
    description: p.description,
    dependsOnKeys: p.dependsOnKeys,
    completionRule: (p.completionRule === "module" ? "module" : "manual") as "manual" | "module",
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
    description: s.description ?? "",
    dependsOnKeys: s.dependsOnKeys ?? [],
    completionRule: s.completionRule ?? "manual",
    updatedAt: new Date(s.updatedAt),
  };
}

// ─── Auto-assign step owners ──────────────────────────────────────────────────

// Maps each template step's defaultOwnerRole to the actual userId from the project,
// only if the step is currently unassigned.
type ProjectRoleSnapshot = {
  seniorInsideId: string | null;
  insidePMId: string | null;
  fieldProjectManagerId: string | null;
  solutionsEngineerId: string | null;
  solutionsExecutiveId: string | null;
};

function autoAssignStepOwners(
  steps: WorkflowStep[],
  roles: ProjectRoleSnapshot
): WorkflowStep[] {
  return steps.map((s) => {
    if (s.ownerId !== null) return s; // already assigned
    const entry = WORKFLOW_STEP_TEMPLATE.find((t) => t.key === s.key);
    if (!entry?.defaultOwnerRole) return s;
    const userId = roles[entry.defaultOwnerRole] ?? null;
    return userId ? { ...s, ownerId: userId } : s;
  });
}

// ─── Weight redistribution ────────────────────────────────────────────────────

// Recomputes the even-split weight budget for non-overridden steps in the section
// and persists the new values. Called after any add/remove/weight-change.
async function redistributeWeightsDb(projectId: string, section: ProjectSectionKey): Promise<void> {
  const allDbSteps = await db.workflowStep.findMany({
    where: { projectId, section: SECTION_TO_DB[section] },
  });
  const dbSteps = allDbSteps.filter((s) => !(s as unknown as { isExcluded?: boolean }).isExcluded);
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
  steps: WorkflowStep[],
  projectTypes: string[] = [],
  config: import("@/modules/project-command-center/lib/workflow-steps").ProjectTypeWorkflowConfig = DEFAULT_PROJECT_TYPE_CONFIG
): Promise<WorkflowStep[]> {
  const templateKeys = new Set<string>(WORKFLOW_STEP_TEMPLATE.map((e) => e.key));
  const toRemove = steps.filter((s) => !s.isCustom && !templateKeys.has(s.key));

  const existingKeys = new Set(steps.map((s) => s.key));
  // Only add template steps that apply to this project's types
  const toAdd = WORKFLOW_STEP_TEMPLATE.filter(
    (e) => !existingKeys.has(e.key) && shouldIncludeStepForTypesWithConfig(e.key, projectTypes, config)
  );

  if (toRemove.length === 0 && toAdd.length === 0) return steps.filter((s) => !s.isExcluded);

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
    description: "",
    dependsOnKeys: [],
    completionRule: "manual" as const,
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
  return refreshed.map(toStep).filter((s) => !s.isExcluded);
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
      select: {
        createdAt: true,
        projectTypes: true,
        seniorInsideId: true,
        insidePMId: true,
        fieldProjectManagerId: true,
        solutionsEngineerId: true,
        solutionsExecutiveId: true,
      },
    });
    if (!project) throw new Error(`Project not found: ${projectId}`);

    const types = (project as unknown as { projectTypes?: string[] }).projectTypes ?? [];
    const defaults = defaultWorkflowSteps(projectId, project.createdAt.toISOString(), types);
    const withOwners = autoAssignStepOwners(defaults, project as unknown as ProjectRoleSnapshot);

    await db.workflowStep.createMany({ data: withOwners.map(toDbCreate) });
    return withOwners;
  }

  // Load project types for reconciliation
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { projectTypes: true },
  });
  const types = (project as unknown as { projectTypes?: string[] } | null)?.projectTypes ?? [];
  const config = await getProjectTypeConfig();

  return reconcileTemplateStepsDb(projectId, dbSteps.map(toStep), types, config);
}

// Batch-loads steps for many projects in 1 query — used by the Projects list page
// to avoid N+1 fetching. Skips module progress reconciliation intentionally: the list
// page only needs last-saved status for health/progress display, not live recalculation.
export async function getWorkflowStepsForProjects(
  projectIds: string[]
): Promise<Record<string, WorkflowStep[]>> {
  if (projectIds.length === 0) return {};
  const rows = await db.workflowStep.findMany({
    where: { projectId: { in: projectIds } },
    orderBy: [{ sortOrder: "asc" }],
  });
  const result: Record<string, WorkflowStep[]> = {};
  for (const row of rows) {
    if (!result[row.projectId]) result[row.projectId] = [];
    result[row.projectId].push(toStep(row));
  }
  return result;
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
  await requireEditPermission();
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
  if ("description" in patch)      data.description = patch.description;
  if ("dependsOnKeys" in patch)    data.dependsOnKeys = patch.dependsOnKeys;
  if ("completionRule" in patch)   data.completionRule = patch.completionRule;
  if (completedDate !== currentApp.completedDate) {
    data.completedDate = completedDate ? new Date(completedDate) : null;
  }

  await db.workflowStep.update({ where: { projectId_key: { projectId, key } }, data });

  // Rebalance section weights when this step's weight was explicitly set.
  if ("weight" in patch) {
    await redistributeWeightsDb(projectId, currentApp.section);
  }

  if ("status" in patch && patch.status !== currentApp.status) {
    const session = await getServerSession();
    await logProjectActivity(projectId, {
      category: "workflow",
      activityType: "step_status_changed",
      userName: session?.name ?? "System",
      userId: session?.id,
      message: `"${currentApp.name}" status changed from ${currentApp.status} to ${patch.status}`,
    });
  }

  // Re-fetch to return post-redistribution weight if it changed.
  const final = await db.workflowStep.findUnique({
    where: { projectId_key: { projectId, key } },
  });
  return toStep(final ?? current);
}

export interface AddWorkflowStepInput {
  section: ProjectSectionKey;
  name: string;
  description?: string;
  dueDate?: string | null;
  dependsOnKeys?: string[];
  completionRule?: "manual" | "module";
}

export async function addWorkflowStep(
  projectId: string,
  input: AddWorkflowStepInput | ProjectSectionKey,
  legacyName?: string,
  legacyDueDate?: string | null
): Promise<WorkflowStep> {
  await requireEditPermission();
  // Support legacy positional call: addWorkflowStep(projectId, section, name, dueDate)
  const normalized: AddWorkflowStepInput =
    typeof input === "string"
      ? { section: input, name: legacyName!, dueDate: legacyDueDate ?? null }
      : input;

  const { section, name, description = "", dueDate = null, dependsOnKeys = [], completionRule = "manual" } = normalized;

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
      description,
      dependsOnKeys,
      completionRule,
    },
  });

  await redistributeWeightsDb(projectId, section);

  const final = await db.workflowStep.findUnique({
    where: { projectId_key: { projectId, key: customKey } },
  });
  return toStep(final ?? newStep);
}

export async function removeWorkflowStep(projectId: string, key: string): Promise<void> {
  await requireEditPermission();
  const step = await db.workflowStep.findUnique({
    where: { projectId_key: { projectId, key } },
  });
  if (!step) return;

  const section = step.section as unknown as ProjectSectionKey;

  if (step.isCustom) {
    // Custom (user-added) steps are truly deleted since they're never re-seeded.
    await db.workflowStep.delete({
      where: { projectId_key: { projectId, key } },
    });
  } else {
    // Template steps are soft-deleted: marked excluded so reconcileTemplateStepsDb
    // won't re-add them on the next fetch.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (db as any).workflowStep.update({
      where: { projectId_key: { projectId, key } },
      data: { isExcluded: true },
    });
  }

  await redistributeWeightsDb(projectId, section);
}

// ─── Bulk auto-assign ─────────────────────────────────────────────────────────

export interface BulkAutoAssignResult {
  assigned: { key: string; name: string; ownerName: string }[];
  skippedAlreadyOwned: { key: string; name: string }[];
  skippedNoRole: { key: string; name: string }[];
}

export async function bulkAutoAssignSteps(
  projectId: string,
  overwriteExisting: boolean
): Promise<BulkAutoAssignResult> {
  await requireEditPermission();

  const [project, dbSteps] = await Promise.all([
    db.project.findUnique({
      where: { id: projectId },
      select: {
        seniorInsideId: true,
        insidePMId: true,
        fieldProjectManagerId: true,
        solutionsEngineerId: true,
        solutionsExecutiveId: true,
      },
    }),
    db.workflowStep.findMany({
      where: { projectId },
      select: { key: true, name: true, ownerId: true },
    }),
  ]);

  if (!project) throw new Error("Project not found");

  // Load user names for the result summary
  const roleUserIds = [
    project.seniorInsideId,
    project.insidePMId,
    project.fieldProjectManagerId,
    project.solutionsEngineerId,
    project.solutionsExecutiveId,
  ].filter((id): id is string => !!id);

  const users: { id: string; name: string | null }[] = roleUserIds.length > 0
    ? await db.user.findMany({
        where: { id: { in: roleUserIds } },
        select: { id: true, name: true },
      })
    : [];
  const userNameById = new Map<string, string>(users.map((u) => [u.id, u.name ?? u.id]));

  const assigned: BulkAutoAssignResult["assigned"] = [];
  const skippedAlreadyOwned: BulkAutoAssignResult["skippedAlreadyOwned"] = [];
  const skippedNoRole: BulkAutoAssignResult["skippedNoRole"] = [];

  for (const step of dbSteps) {
    const entry = WORKFLOW_STEP_TEMPLATE.find((t) => t.key === step.key);
    if (!entry?.defaultOwnerRole) continue;

    const roleField = entry.defaultOwnerRole as keyof typeof project;
    const targetUserId = (project[roleField] as string | null) ?? null;

    if (step.ownerId && !overwriteExisting) {
      skippedAlreadyOwned.push({ key: step.key, name: step.name });
      continue;
    }

    if (!targetUserId) {
      skippedNoRole.push({ key: step.key, name: step.name });
      continue;
    }

    await db.workflowStep.update({
      where: { projectId_key: { projectId, key: step.key } },
      data: { ownerId: targetUserId },
    });
    assigned.push({
      key: step.key,
      name: step.name,
      ownerName: userNameById.get(targetUserId) ?? targetUserId,
    });
  }

  return { assigned, skippedAlreadyOwned, skippedNoRole };
}

// ─── Role change auto-assign ──────────────────────────────────────────────────

// Called from updateProject when a role field changes.
// Assigns any unowned step whose defaultOwnerRole maps to that field.
export async function autoAssignStepsForRoleChange(
  projectId: string,
  roleField: string,
  newUserId: string | null
): Promise<void> {
  // Find steps with this defaultOwnerRole that are currently unassigned
  const matchingKeys = WORKFLOW_STEP_TEMPLATE
    .filter((t) => t.defaultOwnerRole === roleField)
    .map((t) => t.key);

  if (matchingKeys.length === 0) return;

  // Only update steps that are currently unassigned (ownerId is null)
  await db.workflowStep.updateMany({
    where: {
      projectId,
      key: { in: matchingKeys },
      ownerId: null,
    },
    data: { ownerId: newUserId },
  });
}
