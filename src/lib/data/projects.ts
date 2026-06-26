"use server";

import { db } from "@/lib/db";
import { logProjectActivity } from "@/lib/data/activity";
import { deleteNotificationsForProject } from "@/lib/data/notifications";
import { getUser } from "@/lib/data/users";
import { removeProjectScoped } from "@/lib/storage/local-store";
import { CURRENT_USER } from "@/lib/current-user";
import type { Project, NewProjectInput } from "@/types/project";
import type { Project as PrismaProject } from "@prisma/client";

// ─── Type mapping ─────────────────────────────────────────────────────────────

// Converts a Prisma Project row to the app's Project shape.
// Dates are always stored as Date in Postgres and returned as ISO strings to clients.
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
    leadTechnicianId: p.leadTechnicianId,
    fieldProjectManagerId: p.fieldProjectManagerId,
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
  leadTechnicianId: "Lead Technician",
  fieldProjectManagerId: "Field Project Manager",
  targetCompletionDate: "Target Completion",
};

const USER_ID_FIELDS = new Set<keyof Project>([
  "solutionsExecutiveId",
  "solutionsEngineerId",
  "leadTechnicianId",
  "fieldProjectManagerId",
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

export async function getProjects(): Promise<Project[]> {
  const rows = await db.project.findMany({ orderBy: { createdAt: "asc" } });
  return rows.map(toProject);
}

export async function getProject(id: string): Promise<Project | null> {
  const row = await db.project.findUnique({ where: { id } });
  return row ? toProject(row) : null;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createProject(input: NewProjectInput): Promise<Project> {
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
    },
  });
  return toProject(row);
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<Project> {
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
  if ("leadTechnicianId" in patch)      data.leadTechnicianId = patch.leadTechnicianId;
  if ("fieldProjectManagerId" in patch) data.fieldProjectManagerId = patch.fieldProjectManagerId;
  if ("targetCompletionDate" in patch) {
    data.targetCompletionDate = patch.targetCompletionDate
      ? new Date(patch.targetCompletionDate)
      : null;
  }

  const updated = await db.project.update({ where: { id }, data });
  const result = toProject(updated);

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
      userName: CURRENT_USER,
      message: `${FIELD_LABELS[field]} changed from ${oldValue} to ${newValue}`,
    });
  }

  return result;
}

export async function deleteProject(id: string): Promise<void> {
  // Cascade deletes in Postgres handle any already-migrated child records.
  // removeProjectScoped calls below are no-ops on the server (localStorage is
  // browser-only); the localStorage sub-keys become orphaned but harmless until
  // each module is migrated to Postgres and localStorage usage is removed.
  await db.project.delete({ where: { id } });

  removeProjectScoped(id, "bom-rows");
  removeProjectScoped(id, "releases");
  removeProjectScoped(id, "workflow-steps");
  removeProjectScoped(id, "welcome-letter");
  removeProjectScoped(id, "audit-trail");
  removeProjectScoped(id, "comments");
  removeProjectScoped(id, "equipment-rows");
  removeProjectScoped(id, "equipment-uploads");
  removeProjectScoped(id, "internal-kickoff");
  removeProjectScoped(id, "activity");
  removeProjectScoped(id, "activity-last-viewed");

  await deleteNotificationsForProject(id);
}
