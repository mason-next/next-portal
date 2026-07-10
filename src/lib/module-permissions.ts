// ─── Module definitions ───────────────────────────────────────────────────────

export const MODULE_KEYS = [
  "dashboard",
  "projects",
  "tasks",
  "sales",
  "bom",
  "serviceCalculator",
  "reports",
  "activity",
  "users",
  "subcontractors",
  "templates",
  "licenses",
  "adminSettings",
  "permissions",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard:         "Dashboard",
  projects:          "Projects",
  tasks:             "Tasks",
  sales:             "Sales",
  bom:               "BOM",
  serviceCalculator: "Service Calculator",
  reports:           "Reports",
  activity:          "Activity / Comments",
  users:             "Users",
  subcontractors:    "Subcontractors",
  templates:         "Templates",
  licenses:          "Licenses",
  adminSettings:     "Admin Settings",
  permissions:       "Permissions",
};

// ─── Action definitions ───────────────────────────────────────────────────────

export const MODULE_ACTIONS = [
  "view", "create", "edit", "delete", "comment",
  "upload", "approve", "assign", "export", "manageSettings",
] as const;

export type ModuleAction = (typeof MODULE_ACTIONS)[number];

// ─── Permission level ─────────────────────────────────────────────────────────

export type ModulePermLevel = "none" | "viewer" | "member" | "administrator";

export const PERM_LEVELS: ModulePermLevel[] = ["none", "viewer", "member", "administrator"];

export const PERM_LEVEL_LABELS: Record<ModulePermLevel, string> = {
  none:          "None",
  viewer:        "Viewer",
  member:        "Member",
  administrator: "Administrator",
};

export type RolePermissionsConfig = Record<string, Record<ModuleKey, ModulePermLevel>>;

// ─── Default permissions by role ──────────────────────────────────────────────

export const DEFAULT_ROLE_PERMISSIONS: RolePermissionsConfig = {
  Administrator: {
    dashboard: "administrator", projects: "administrator", tasks: "administrator",
    sales: "administrator", bom: "administrator", serviceCalculator: "administrator",
    reports: "administrator", activity: "administrator", users: "administrator",
    subcontractors: "administrator", templates: "administrator", licenses: "administrator",
    adminSettings: "administrator", permissions: "administrator",
  },
  Sales: {
    dashboard: "member", projects: "viewer", tasks: "member",
    sales: "administrator", bom: "viewer", serviceCalculator: "member",
    reports: "member", activity: "member", users: "none",
    subcontractors: "none", templates: "viewer", licenses: "none",
    adminSettings: "none", permissions: "none",
  },
  Engineering: {
    dashboard: "member", projects: "member", tasks: "member",
    sales: "viewer", bom: "member", serviceCalculator: "member",
    reports: "viewer", activity: "member", users: "none",
    subcontractors: "none", templates: "viewer", licenses: "none",
    adminSettings: "none", permissions: "none",
  },
  ProjectManagement: {
    dashboard: "member", projects: "administrator", tasks: "member",
    sales: "viewer", bom: "member", serviceCalculator: "viewer",
    reports: "member", activity: "member", users: "viewer",
    subcontractors: "member", templates: "viewer", licenses: "viewer",
    adminSettings: "none", permissions: "none",
  },
  Management: {
    dashboard: "administrator", projects: "administrator", tasks: "member",
    sales: "administrator", bom: "viewer", serviceCalculator: "viewer",
    reports: "administrator", activity: "member", users: "member",
    subcontractors: "member", templates: "member", licenses: "member",
    adminSettings: "none", permissions: "none",
  },
  Installation: {
    dashboard: "viewer", projects: "viewer", tasks: "member",
    sales: "none", bom: "viewer", serviceCalculator: "none",
    reports: "none", activity: "member", users: "none",
    subcontractors: "none", templates: "viewer", licenses: "none",
    adminSettings: "none", permissions: "none",
  },
  Finance: {
    dashboard: "viewer", projects: "viewer", tasks: "viewer",
    sales: "viewer", bom: "viewer", serviceCalculator: "none",
    reports: "administrator", activity: "viewer", users: "none",
    subcontractors: "none", templates: "none", licenses: "viewer",
    adminSettings: "none", permissions: "none",
  },
  Customer: {
    dashboard: "viewer", projects: "viewer", tasks: "viewer",
    sales: "none", bom: "none", serviceCalculator: "none",
    reports: "none", activity: "viewer", users: "none",
    subcontractors: "none", templates: "none", licenses: "none",
    adminSettings: "none", permissions: "none",
  },
  Subcontractor: {
    dashboard: "viewer", projects: "viewer", tasks: "viewer",
    sales: "none", bom: "none", serviceCalculator: "none",
    reports: "none", activity: "viewer", users: "none",
    subcontractors: "none", templates: "none", licenses: "none",
    adminSettings: "none", permissions: "none",
  },
};

// ─── Resolution helpers ───────────────────────────────────────────────────────

export function levelToActions(level: ModulePermLevel): ModuleAction[] {
  switch (level) {
    case "none":          return [];
    case "viewer":        return ["view", "comment"];
    case "member":        return ["view", "create", "edit", "comment", "upload", "assign"];
    case "administrator": return [...MODULE_ACTIONS];
  }
}

/** True if the permission level allows editing (member or higher). */
export function canLevelEdit(level: ModulePermLevel): boolean {
  return level === "member" || level === "administrator";
}

/**
 * Returns the effective permission level for a user with the given role types.
 * Takes the highest level across all assigned roles.
 * The "Administrator" role type always returns "administrator" on every module.
 */
export function getEffectiveLevel(
  roleTypes: string[],
  module: ModuleKey,
  config?: RolePermissionsConfig
): ModulePermLevel {
  if (roleTypes.includes("Administrator")) return "administrator";

  const source = config ?? DEFAULT_ROLE_PERMISSIONS;
  let maxIdx = 0; // "none" at index 0

  for (const role of roleTypes) {
    // Fall back to built-in defaults for roles not explicitly in the custom config.
    const perms = source[role] ?? DEFAULT_ROLE_PERMISSIONS[role];
    if (!perms) continue;
    const level: ModulePermLevel = perms[module] ?? "none";
    const idx = PERM_LEVELS.indexOf(level);
    if (idx > maxIdx) maxIdx = idx;
  }

  return PERM_LEVELS[maxIdx];
}

export function getEffectivePermissions(
  roleTypes: string[],
  module: ModuleKey,
  config?: RolePermissionsConfig
): ModuleAction[] {
  return levelToActions(getEffectiveLevel(roleTypes, module, config));
}

export function hasModulePermission(
  roleTypes: string[],
  module: ModuleKey,
  action: ModuleAction,
  config?: RolePermissionsConfig
): boolean {
  return getEffectivePermissions(roleTypes, module, config).includes(action);
}
