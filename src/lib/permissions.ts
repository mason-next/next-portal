import { getEffectiveLevel, type ModuleKey, type RolePermissionsConfig } from "@/lib/module-permissions";
import type { AccountType } from "@/types/user";

export const PERMISSION_FEATURES = [
  "dashboard",
  "projects",
  "tasks",
  "sales",
  "reports",
  "tools",
] as const;

export type PermissionFeature = (typeof PERMISSION_FEATURES)[number];

export const PERMISSION_FEATURE_LABELS: Record<PermissionFeature, string> = {
  dashboard: "Dashboard",
  projects:  "Projects (Operations)",
  tasks:     "Tasks",
  sales:     "Sales",
  reports:   "Reports",
  tools:     "Tools & Process",
};

// Kept for PermissionsTab UI compatibility — not used for permission enforcement.
export type PermissionMap = Record<PermissionFeature, boolean>;
export type PermissionsConfig = Record<AccountType, PermissionMap>;

export const SETTINGS_KEY = "permissions";

const FEATURE_TO_MODULE: Record<PermissionFeature, ModuleKey> = {
  dashboard: "dashboard",
  projects:  "projects",
  tasks:     "tasks",
  sales:     "sales",
  reports:   "reports",
  tools:     "serviceCalculator",
};

/**
 * Returns true if a user with the given roleTypes can access a nav feature.
 * Derived from module-level permissions: any level above "none" grants nav access.
 */
export function canAccess(
  roleTypes: string[],
  feature: PermissionFeature,
  config?: RolePermissionsConfig
): boolean {
  if (roleTypes.includes("Administrator")) return true;
  const module = FEATURE_TO_MODULE[feature];
  return getEffectiveLevel(roleTypes, module, config) !== "none";
}
