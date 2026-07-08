"use server";

import { db } from "@/lib/db";

// ─── Shared types ─────────────────────────────────────────────────────────────

export type AssigneeKind = "user" | "roleType";

export interface AssigneeTarget {
  kind: AssigneeKind;
  value: string; // userId for "user"; ROLE_TYPE string for "roleType"
}

// Subset of project FK fields that are eligible for system defaults.
export type ProjectRoleKey =
  | "seniorInsideId"
  | "insidePMId"
  | "fieldProjectManagerId"
  | "solutionsEngineerId"
  | "solutionsExecutiveId";

export type MeetingType = "internal-kickoff" | "technical-kickoff";

export type ProjectRoleDefaults = Partial<Record<ProjectRoleKey, AssigneeTarget>>;

export interface MeetingDefaults {
  standingAttendees: AssigneeTarget[];
}

// stepKey → AssigneeTarget override (overrides the hardcoded defaultOwnerRole in WORKFLOW_STEP_TEMPLATE)
export type WorkflowStepDefaults = Partial<Record<string, AssigneeTarget>>;

// ─── Resolution ───────────────────────────────────────────────────────────────

// Resolves an AssigneeTarget to a concrete userId at runtime.
// Returns null if the user is inactive, not found, or no matching roleType user exists.
export async function resolveAssigneeTarget(target: AssigneeTarget): Promise<string | null> {
  if (target.kind === "user") {
    const user = await db.user.findUnique({
      where: { id: target.value },
      select: { id: true, isActive: true },
    });
    return user?.isActive ? user.id : null;
  }
  // roleType: find first active user with this role type, sorted by name for determinism
  const user = await db.user.findFirst({
    where: { roleTypes: { has: target.value }, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true },
  });
  return user?.id ?? null;
}

// Resolves roleType targets to multiple user IDs (for meeting attendee lists).
export async function resolveAssigneeTargetMulti(target: AssigneeTarget): Promise<string[]> {
  if (target.kind === "user") {
    const id = await resolveAssigneeTarget(target);
    return id ? [id] : [];
  }
  const users = await db.user.findMany({
    where: { roleTypes: { has: target.value }, isActive: true },
    orderBy: { name: "asc" },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

// ─── Project role defaults ────────────────────────────────────────────────────

const PROJECT_ROLE_DEFAULTS_KEY = "defaults:project-roles";

export async function getProjectRoleDefaults(): Promise<ProjectRoleDefaults> {
  const row = await db.appSetting.findUnique({ where: { key: PROJECT_ROLE_DEFAULTS_KEY } });
  if (row?.value && typeof row.value === "object" && !Array.isArray(row.value)) {
    return row.value as ProjectRoleDefaults;
  }
  // Fallback: migrate from legacy per-field keys
  const [seniorRow, insideRow] = await Promise.all([
    db.appSetting.findUnique({ where: { key: "default_senior_inside_id" } }),
    db.appSetting.findUnique({ where: { key: "default_inside_pm_id" } }),
  ]);
  const defaults: ProjectRoleDefaults = {};
  if (seniorRow?.value) defaults.seniorInsideId = { kind: "user", value: seniorRow.value as string };
  if (insideRow?.value) defaults.insidePMId = { kind: "user", value: insideRow.value as string };
  return defaults;
}

export async function setProjectRoleDefaults(defaults: ProjectRoleDefaults): Promise<void> {
  await db.appSetting.upsert({
    where: { key: PROJECT_ROLE_DEFAULTS_KEY },
    update: { value: defaults as object },
    create: { key: PROJECT_ROLE_DEFAULTS_KEY, value: defaults as object },
  });
}

// ─── Meeting defaults ─────────────────────────────────────────────────────────

const FALLBACK_INTERNAL_ATTENDEE_IDS = ["user-sandra-verissimo", "user-alex-behan"];

export async function getMeetingDefaults(type: MeetingType): Promise<MeetingDefaults> {
  const key = `defaults:meeting:${type}`;
  const row = await db.appSetting.findUnique({ where: { key } });
  if (row?.value && typeof row.value === "object" && !Array.isArray(row.value)) {
    const val = row.value as { standingAttendees?: unknown };
    if (Array.isArray(val.standingAttendees)) {
      return { standingAttendees: val.standingAttendees as AssigneeTarget[] };
    }
  }
  if (type === "internal-kickoff") {
    const legacyRow = await db.appSetting.findUnique({ where: { key: "default-kickoff-attendee-ids" } });
    const ids: string[] = Array.isArray(legacyRow?.value)
      ? (legacyRow!.value as string[])
      : FALLBACK_INTERNAL_ATTENDEE_IDS;
    return { standingAttendees: ids.map((id) => ({ kind: "user" as AssigneeKind, value: id })) };
  }
  return { standingAttendees: [] };
}

export async function setMeetingDefaults(type: MeetingType, defaults: MeetingDefaults): Promise<void> {
  const key = `defaults:meeting:${type}`;
  await db.appSetting.upsert({
    where: { key },
    update: { value: defaults as object },
    create: { key, value: defaults as object },
  });
  // Keep legacy internal-kickoff key in sync so the kickoff page still works without a refactor.
  // Only user-kind attendees make it into the legacy format (roleType resolution happens at page load).
  if (type === "internal-kickoff") {
    const userIds = defaults.standingAttendees
      .filter((t) => t.kind === "user")
      .map((t) => t.value);
    await db.appSetting.upsert({
      where: { key: "default-kickoff-attendee-ids" },
      update: { value: userIds },
      create: { key: "default-kickoff-attendee-ids", value: userIds },
    });
  }
}

// ─── Workflow step defaults ────────────────────────────────────────────────────

const WORKFLOW_STEP_DEFAULTS_KEY = "defaults:workflow-steps";

export async function getWorkflowStepDefaults(): Promise<WorkflowStepDefaults> {
  const row = await db.appSetting.findUnique({ where: { key: WORKFLOW_STEP_DEFAULTS_KEY } });
  if (row?.value && typeof row.value === "object" && !Array.isArray(row.value)) {
    return row.value as WorkflowStepDefaults;
  }
  return {};
}

export async function setWorkflowStepDefaults(defaults: WorkflowStepDefaults): Promise<void> {
  await db.appSetting.upsert({
    where: { key: WORKFLOW_STEP_DEFAULTS_KEY },
    update: { value: defaults as object },
    create: { key: WORKFLOW_STEP_DEFAULTS_KEY, value: defaults as object },
  });
}
