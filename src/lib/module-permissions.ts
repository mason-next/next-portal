import type { AccountType, RoleType } from "@/types/user";

// ─── Module definitions ───────────────────────────────────────────────────────

export const MODULE_KEYS = [
  "dashboard",
  "projects",
  "tasks",
  "bom",
  "serviceCalculator",
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
  bom:               "BOM",
  serviceCalculator: "Service Calculator",
  activity:          "Activity / Comments",
  users:             "Users",
  subcontractors:    "Subcontractors",
  templates:         "Templates",
  licenses:          "Licenses",
  adminSettings:     "Admin Settings",
  permissions:       "Permissions",
};

// ─── Action definitions (for enforcement) ─────────────────────────────────────

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
  Sales: {
    dashboard: "member", projects: "viewer", tasks: "member",
    bom: "viewer", serviceCalculator: "member", activity: "member",
    users: "none", subcontractors: "none", templates: "viewer",
    licenses: "none", adminSettings: "none", permissions: "none",
  },
  Engineering: {
    dashboard: "member", projects: "member", tasks: "member",
    bom: "member", serviceCalculator: "member", activity: "member",
    users: "none", subcontractors: "none", templates: "viewer",
    licenses: "none", adminSettings: "none", permissions: "none",
  },
  ProjectManagement: {
    dashboard: "member", projects: "administrator", tasks: "member",
    bom: "member", serviceCalculator: "viewer", activity: "member",
    users: "viewer", subcontractors: "member", templates: "viewer",
    licenses: "viewer", adminSettings: "none", permissions: "none",
  },
  Management: {
    dashboard: "administrator", projects: "administrator", tasks: "member",
    bom: "viewer", serviceCalculator: "viewer", activity: "member",
    users: "member", subcontractors: "member", templates: "member",
    licenses: "member", adminSettings: "none", permissions: "none",
  },
  Installation: {
    dashboard: "viewer", projects: "viewer", tasks: "member",
    bom: "viewer", serviceCalculator: "none", activity: "member",
    users: "none", subcontractors: "none", templates: "viewer",
    licenses: "none", adminSettings: "none", permissions: "none",
  },
  Finance: {
    dashboard: "viewer", projects: "viewer", tasks: "viewer",
    bom: "viewer", serviceCalculator: "none", activity: "viewer",
    users: "none", subcontractors: "none", templates: "none",
    licenses: "viewer", adminSettings: "none", permissions: "none",
  },
  Customer: {
    dashboard: "viewer", projects: "viewer", tasks: "viewer",
    bom: "none", serviceCalculator: "none", activity: "viewer",
    users: "none", subcontractors: "none", templates: "none",
    licenses: "none", adminSettings: "none", permissions: "none",
  },
  Subcontractor: {
    dashboard: "viewer", projects: "viewer", tasks: "viewer",
    bom: "none", serviceCalculator: "none", activity: "viewer",
    users: "none", subcontractors: "none", templates: "none",
    licenses: "none", adminSettings: "none", permissions: "none",
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

export function getEffectiveLevel(
  accountType: AccountType,
  roleType: RoleType,
  module: ModuleKey,
  config?: RolePermissionsConfig
): ModulePermLevel {
  if (accountType === "Administrator") return "administrator";

  const perms = (config ?? DEFAULT_ROLE_PERMISSIONS)[roleType as string];
  const roleLevel: ModulePermLevel = perms?.[module] ?? "none";

  if (accountType === "Viewer") {
    // Viewer cap: never exceed viewer
    if (roleLevel === "administrator" || roleLevel === "member") return "viewer";
  }

  return roleLevel;
}

export function getEffectivePermissions(
  accountType: AccountType,
  roleType: RoleType,
  module: ModuleKey,
  config?: RolePermissionsConfig
): ModuleAction[] {
  return levelToActions(getEffectiveLevel(accountType, roleType, module, config));
}

export function hasModulePermission(
  accountType: AccountType,
  roleType: RoleType,
  module: ModuleKey,
  action: ModuleAction,
  config?: RolePermissionsConfig
): boolean {
  return getEffectivePermissions(accountType, roleType, module, config).includes(action);
}
