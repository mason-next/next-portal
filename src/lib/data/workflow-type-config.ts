"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/access-control";
import {
  DEFAULT_PROJECT_TYPE_CONFIG,
  type ProjectTypeWorkflowConfig,
} from "@/modules/project-command-center/lib/workflow-steps";

const SETTINGS_KEY = "workflow:project-type-config";

export async function getProjectTypeConfig(): Promise<ProjectTypeWorkflowConfig> {
  const row = await db.appSetting.findUnique({ where: { key: SETTINGS_KEY } });
  if (!row) return DEFAULT_PROJECT_TYPE_CONFIG;
  return row.value as ProjectTypeWorkflowConfig;
}

export async function saveProjectTypeConfig(config: ProjectTypeWorkflowConfig): Promise<void> {
  await requireAdmin();
  await db.appSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: config },
    update: { value: config },
  });
}
