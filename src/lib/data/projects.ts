import type { NewProjectInput, Project } from "@/types/project";
import { logProjectActivity } from "@/lib/data/activity";
import { deleteNotificationsForProject } from "@/lib/data/notifications";
import { getUser } from "@/lib/data/users";
import { CURRENT_USER } from "@/lib/current-user";
import { SAMPLE_PROJECT } from "@/lib/mock/projects.mock";
import { readGlobal, removeProjectScoped, writeGlobal } from "@/lib/storage/local-store";

const PROJECTS_KEY = "projects";

const FIELD_LABELS: Partial<Record<keyof Project, string>> = {
  name: "Project Name",
  projectNumber: "Project Number",
  customerName: "Customer",
  siteAddress: "Site Address",
  coordinatorGroup: "Coordinator Group",
  contractValue: "Contract Value",
  grossMarginPercent: "Gross Margin %",
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
  if (value === null || value === undefined || value === "") return "Not set";
  if (USER_ID_FIELDS.has(field)) {
    const user = await getUser(value as string);
    return user?.name ?? "Not set";
  }
  return String(value);
}

// Backfills fields added after a project may have already been saved to localStorage
// under the old shape — without this, older stored projects would have `undefined` for
// these and crash anything that renders them (e.g. formatMoney(contractValue)).
function withProjectDefaults(project: Project): Project {
  return {
    ...project,
    contractValue: project.contractValue ?? 0,
    grossMarginPercent: project.grossMarginPercent ?? 0,
    solutionsExecutiveId: project.solutionsExecutiveId ?? null,
    solutionsEngineerId: project.solutionsEngineerId ?? null,
    leadTechnicianId: project.leadTechnicianId ?? null,
    fieldProjectManagerId: project.fieldProjectManagerId ?? null,
    targetCompletionDate: project.targetCompletionDate ?? null,
  };
}

function loadAll(): Project[] {
  const stored = readGlobal<Project[]>(PROJECTS_KEY);
  if (stored) return stored.map(withProjectDefaults);
  const seeded = [SAMPLE_PROJECT];
  writeGlobal(PROJECTS_KEY, seeded);
  return seeded;
}

export async function getProjects(): Promise<Project[]> {
  return loadAll();
}

export async function getProject(id: string): Promise<Project | null> {
  return loadAll().find((p) => p.id === id) ?? null;
}

export async function createProject(input: NewProjectInput): Promise<Project> {
  const all = loadAll();
  const now = new Date().toISOString();
  const project: Project = {
    id: crypto.randomUUID(),
    name: input.name,
    projectNumber: input.projectNumber,
    customerName: input.customerName,
    siteAddress: input.siteAddress,
    coordinatorGroup: input.coordinatorGroup,
    contractValue: 0,
    grossMarginPercent: 0,
    solutionsExecutiveId: null,
    solutionsEngineerId: null,
    leadTechnicianId: null,
    fieldProjectManagerId: null,
    targetCompletionDate: null,
    createdAt: now,
    updatedAt: now,
  };
  writeGlobal(PROJECTS_KEY, [...all, project]);
  return project;
}

export async function updateProject(id: string, patch: Partial<Project>): Promise<Project> {
  const all = loadAll();
  const index = all.findIndex((p) => p.id === id);
  if (index === -1) throw new Error(`Project not found: ${id}`);
  const current = all[index];
  const updated: Project = { ...current, ...patch, id, updatedAt: new Date().toISOString() };
  const next = [...all];
  next[index] = updated;
  writeGlobal(PROJECTS_KEY, next);

  const changedFields = (Object.keys(patch) as (keyof Project)[]).filter(
    (field) => FIELD_LABELS[field] && patch[field] !== current[field]
  );
  for (const field of changedFields) {
    const [oldValue, newValue] = await Promise.all([
      describeFieldValue(field, current[field]),
      describeFieldValue(field, updated[field]),
    ]);
    await logProjectActivity(id, {
      category: "status_change",
      activityType: "field_changed",
      userName: CURRENT_USER,
      message: `${FIELD_LABELS[field]} changed from ${oldValue} to ${newValue}`,
    });
  }

  return updated;
}

export async function deleteProject(id: string): Promise<void> {
  const all = loadAll();
  writeGlobal(PROJECTS_KEY, all.filter((p) => p.id !== id));
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
  removeProjectScoped(id, "comment-mentions");
  await deleteNotificationsForProject(id);
}
