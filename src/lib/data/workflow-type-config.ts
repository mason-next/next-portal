"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/access-control";
import {
  DEFAULT_PROJECT_TYPE_CONFIG,
  type ProjectTypeWorkflowConfig,
} from "@/modules/project-command-center/lib/workflow-steps";

const SETTINGS_KEY = "workflow:project-type-config";

function isProjectTypeWorkflowConfig(value: unknown): value is ProjectTypeWorkflowConfig {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  if (!v.exclusions || typeof v.exclusions !== "object" || Array.isArray(v.exclusions)) return false;
  const excl = v.exclusions as Record<string, unknown>;
  return Object.values(excl).every(
    (arr) => Array.isArray(arr) && arr.every((item) => typeof item === "string")
  );
}

export async function getProjectTypeConfig(): Promise<ProjectTypeWorkflowConfig> {
  const row = await db.appSetting.findUnique({ where: { key: SETTINGS_KEY } });
  if (!row) return DEFAULT_PROJECT_TYPE_CONFIG;
  const parsed: unknown = row.value;
  return isProjectTypeWorkflowConfig(parsed) ? parsed : DEFAULT_PROJECT_TYPE_CONFIG;
}

export async function saveProjectTypeConfig(config: ProjectTypeWorkflowConfig): Promise<void> {
  await requireAdmin();
  await db.appSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: config },
    update: { value: config },
  });
}
