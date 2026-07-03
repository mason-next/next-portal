"use server";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/access-control";
import {
  DEFAULT_ROLE_PERMISSIONS,
  type RolePermissionsConfig,
} from "@/lib/module-permissions";

const SETTINGS_KEY = "role-permissions:config";

export async function getRolePermissions(): Promise<RolePermissionsConfig> {
  const row = await db.appSetting.findUnique({ where: { key: SETTINGS_KEY } });
  if (!row || !row.value || typeof row.value !== "object") {
    return DEFAULT_ROLE_PERMISSIONS;
  }
  return row.value as unknown as RolePermissionsConfig;
}

export async function saveRolePermissions(config: RolePermissionsConfig): Promise<void> {
  await requireAdmin();
  await db.appSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: config as unknown as Parameters<typeof db.appSetting.upsert>[0]["create"]["value"] },
    update: { value: config as unknown as Parameters<typeof db.appSetting.upsert>[0]["update"]["value"] },
  });
}
