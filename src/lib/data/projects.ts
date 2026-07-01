"use server";

import { db } from "@/lib/db";
import { logProjectActivity } from "@/lib/data/activity-log";
import { deleteNotificationsForProject } from "@/lib/data/notifications";
import { getUser } from "@/lib/data/users";
import { getProjectTechnicians } from "@/lib/data/subcontractors";
import { removeProjectScoped } from "@/lib/storage/local-store";
import { getServerSession } from "@/lib/auth/server";
import { requireEditPermission } from "@/lib/access-control";
import { autoAssignStepsForRoleChange } from "@/lib/data/workflow";
import type { Prisma } from "@prisma/client";
import type { Project, NewProjectInput } from "@/types/project";
import type { Project as PrismaProject } from "@prisma/client";

// ─── Type mapping ─────────────────────────────────────────────────────────────

// Converts a Prisma Project row to the app's Project shape.
// technicians is always [] here — call getProject() with includeTeam:true or
// getProjectTechnicians() separately to load the multi-person technician list.
function toProject(p: PrismaProject): Project {
  return {
    id: p.id,
    name: p.name,
    projectNumber: p.projectNumber,
    customerName: p.customerName,
    siteAddress: p.siteAddress,
    coordinatorGroup: p.coordinatorGroup,
    contractValue: p.contractValue,
    grossProfit: p.grossProfit,
    solutionsExecutiveId: p.solutionsExecutiveId,
    solutionsEngineerId: p.solutionsEngineerId,
    fieldProjectManagerId: p.fieldProjectManagerId,
    seniorInsideId: p.seniorInsideId,
    insidePMId: p.insidePMId,
    technicians: [],
    technicianNotNeeded: p.technicianNotNeeded,
    projectTypes: (p as unknown as { projectTypes: string[] }).projectTypes ?? [],
    targetCompletionDate: p.targetCompletionDate?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// ─── Field change logging ─────────────────────────────────────────────────────

const FIELD_LABELS: Partial<Record<keyof Project, string>> = {
  name: "Project Name",
  projectNumber: "Project Number",
  customerName: "Customer",
  siteAddress: "Site Address",
  coordinatorGroup: "Coordinator Group",
  contractValue: "Contract Value",
  grossProfit: "Gross Profit",
  solutionsExecutiveId: "Solutions Executive",
  solutionsEngineerId: "Solutions Engineer",
  fieldProjectManagerId: "Solution Project Manager",
  seniorInsideId: "Senior Inside Project Manager",
  insidePMId: "Inside Project Manager",
  targetCompletionDate: "Target Completion",
};

const USER_ID_FIELDS = new Set<keyof Project>([
  "solutionsExecutiveId",
  "solutionsEngineerId",
  "fieldProjectManagerId",
  "seniorInsideId",
  "insidePMId",
]);

async function describeFieldValue(field: keyof Project, value: unknown): Promise<string> {
  if (value === null || value === undefined || value === "" || value === "not-needed") return "Not set";
  if (USER_ID_FIELDS.has(field)) {
    const user = await getUser(value as string);
    return user?.name ?? "Not set";
  }
  return String(value);
}

// ─── Queries ──────────────────────────────────────────────────────────────────

// Builds a Prisma WHERE clause scoped to projects where the given userId appears
// in any role field or in the project_technicians join table.
function userAssignmentWhere(userId: string): Prisma.ProjectWhereInput {
  return {
    OR: [
      { fieldProjectManagerId: userId },
      { solutionsExecutiveId: userId },
      { solutionsEngineerId: userId },
      { seniorInsideId: userId },
      { insidePMId: userId },
      { leadTechnicianId: userId },
      { projectManagerId: userId },
      { technicians: { some: { userId } } },
    ],
  };
}

export async function getProjects(options?: { filterUserId?: string }): Promise<Project[]> {
  const session = await getServerSession();

  if (!session || session.accountType !== "Administrator") {
    // Non-admin (Member or Viewer): scope to user's assigned projects
    const userId = session?.id;
    if (!userId) return [];
    const rows = await db.project.findMany({
      where: userAssignmentWhere(userId),
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toProject);
  }

  // Administrator
  const filterUserId = options?.filterUserId;
  if (filterUserId) {
    const rows = await db.project.findMany({
      where: userAssignmentWhere(filterUserId),
      orderBy: { createdAt: "asc" },
    });
    return rows.map(toProject);
  }

  // Admin with no filter: all projects
  const rows = await db.project.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toProject);
}

export async function getProject(id: string): Promise<Project | null> {
  const session = await getServerSession();
  const [row, technicians] = await Promise.all([
    db.project.findUnique({ where: { id } }),
    getProjectTechnicians(id).catch(() => [] as Awaited<ReturnType<typeof getProjectTechnicians>>),
  ]);

  if (!row) return null;

  // Non-admins can only view projects they're assigned to
  if (session && session.accountType !== "Administrator") {
    const userId = session.id;
    const isAssigned =
      row.fieldProjectManagerId === userId ||
      row.solutionsExecutiveId === userId ||
      row.solutionsEngineerId === userId ||
      row.seniorInsideId === userId ||
      row.insidePMId === userId ||
      row.leadTechnicianId === userId ||
      row.projectManagerId === userId ||
      technicians.some((t: { userId: string | null }) => t.userId === userId);
    if (!isAssigned) return null;
  }

  return { ...toProject(row), technicians };
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createProject(input: NewProjectInput): Promise<Project> {
  // Look up default role assignments from AppSetting, then verify each user actually exists
  // before using their ID — app_settings may hold stale IDs from seed/migration data.
  let defaultSeniorInsideId: string | null = null;
  let defaultInsidePMId: string | null = null;
  try {
    const [seniorSetting, insideSetting] = await Promise.all([
      db.appSetting.findUnique({ where: { key: "default_senior_inside_id" } }),
      db.appSetting.findUnique({ where: { key: "default_inside_pm_id" } }),
    ]);
    const seniorId = seniorSetting?.value as string | null;
    const insideId = insideSetting?.value as string | null;
    const [seniorExists, insideExists] = await Promise.all([
      seniorId ? db.user.findUnique({ where: { id: seniorId }, select: { id: true } }) : null,
      insideId ? db.user.findUnique({ where: { id: insideId }, select: { id: true } }) : null,
    ]);
    if (seniorExists) defaultSeniorInsideId = seniorId;
    if (insideExists) defaultInsidePMId = insideId;
  } catch {
    // app_settings unavailable — create without defaults
  }

  const row = await db.project.create({
    data: {
      id: crypto.randomUUID(),
      name: input.name,
      projectNumber: input.projectNumber,
      customerName: input.customerName,
      siteAddress: input.siteAddress,
      coordinatorGroup: input.coordinatorGroup,
      contractValue: 0,
      grossProfit: 0,
      seniorInsideId: defaultSeniorInsideId,
      insidePMId: defaultInsidePMId,
      projectTypes: input.projectTypes ?? [],
    },
  });
  return toProject(row);
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<Project> {
  await requireEditPermission();
  const current = await db.project.findUnique({ where: { id } });
  if (!current) throw new Error(`Project not found: ${id}`);

  // Build the Prisma update payload — only include fields present in the patch.
  // targetCompletionDate arrives as an ISO string or null; convert to Date for Postgres.
  const data: Parameters<typeof db.project.update>[0]["data"] = {};
  if ("name" in patch)                  data.name = patch.name;
  if ("projectNumber" in patch)         data.projectNumber = patch.projectNumber;
  if ("customerName" in patch)          data.customerName = patch.customerName;
  if ("siteAddress" in patch)           data.siteAddress = patch.siteAddress;
  if ("coordinatorGroup" in patch)      data.coordinatorGroup = patch.coordinatorGroup;
  if ("contractValue" in patch)         data.contractValue = patch.contractValue;
  if ("grossProfit" in patch)           data.grossProfit = patch.grossProfit;
  if ("solutionsExecutiveId" in patch)  data.solutionsExecutiveId = patch.solutionsExecutiveId;
  if ("solutionsEngineerId" in patch)   data.solutionsEngineerId = patch.solutionsEngineerId;
  if ("fieldProjectManagerId" in patch) data.fieldProjectManagerId = patch.fieldProjectManagerId;
  if ("seniorInsideId" in patch)        data.seniorInsideId = patch.seniorInsideId;
  if ("insidePMId" in patch)            data.insidePMId = patch.insidePMId;
  if ("technicianNotNeeded" in patch)  data.technicianNotNeeded = patch.technicianNotNeeded;
  if ("targetCompletionDate" in patch) {
    data.targetCompletionDate = patch.targetCompletionDate
      ? new Date(patch.targetCompletionDate)
      : null;
  }

  const updated = await db.project.update({ where: { id }, data });
  const result = toProject(updated);

  // Auto-assign workflow steps when role fields change
  const ROLE_FIELDS = [
    "seniorInsideId",
    "insidePMId",
    "fieldProjectManagerId",
    "solutionsEngineerId",
    "solutionsExecutiveId",
  ] as const;

  for (const field of ROLE_FIELDS) {
    if (field in patch && patch[field as keyof Project] !== current[field as keyof PrismaProject]) {
      const newVal = patch[field as keyof Project] as string | null | undefined;
      await autoAssignStepsForRoleChange(id, field, newVal ?? null).catch(() => null);
    }
  }

  const session = await getServerSession();
  const changedFields = (Object.keys(patch) as (keyof Project)[]).filter(
    (field) => FIELD_LABELS[field] !== undefined && patch[field] !== current[field as keyof PrismaProject]
  );
  for (const field of changedFields) {
    const [oldValue, newValue] = await Promise.all([
      describeFieldValue(field, current[field as keyof PrismaProject]),
      describeFieldValue(field, patch[field]),
    ]);
    await logProjectActivity(id, {
      category: "status_change",
      activityType: "field_changed",
      userName: session?.name ?? "System",
      userId: session?.id,
      message: `${FIELD_LABELS[field]} changed from ${oldValue} to ${newValue}`,
    });
  }

  return result;
}

export async function deleteProject(id: string): Promise<void> {
  await requireEditPermission();
  // Cascade deletes in Postgres handle any already-migrated child records.
  // removeProjectScoped calls below are no-ops on the server (localStorage is
  // browser-only); the localStorage sub-keys become orphaned but harmless until
  // each module is migrated to Postgres and localStorage usage is removed.
  await db.project.delete({ where: { id } });

  removeProjectScoped(id, "workflow-steps");
  removeProjectScoped(id, "welcome-letter");
  removeProjectScoped(id, "audit-trail");
  removeProjectScoped(id, "comments");
  removeProjectScoped(id, "internal-kickoff");
  removeProjectScoped(id, "activity");
  removeProjectScoped(id, "activity-last-viewed");

  await deleteNotificationsForProject(id);
}
