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

export type PermissionMap = Record<PermissionFeature, boolean>;
export type PermissionsConfig = Record<AccountType, PermissionMap>;

// Defaults: Administrators and Members can access everything; Viewers can only see Dashboard and Reports.
export const DEFAULT_PERMISSIONS: PermissionsConfig = {
  Administrator: { dashboard: true, projects: true, tasks: true, sales: true, reports: true, tools: true },
  Member:        { dashboard: true, projects: true, tasks: true, sales: true, reports: true, tools: true },
  Viewer:        { dashboard: true, projects: false, tasks: false, sales: false, reports: true, tools: false },
};

export const SETTINGS_KEY = "permissions";

export function canAccess(
  config: PermissionsConfig,
  accountType: AccountType,
  feature: PermissionFeature
): boolean {
  // Administrators always have full access regardless of config.
  if (accountType === "Administrator") return true;
  return config[accountType]?.[feature] ?? DEFAULT_PERMISSIONS[accountType][feature];
}
