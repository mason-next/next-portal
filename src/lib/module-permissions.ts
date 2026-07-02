import type { AccountType, RoleType } from "@/types/user";

// ─── Module & Action definitions ─────────────────────────────────────────────

export const MODULE_KEYS = [
  // Platform
  "dashboard", "reports", "tools",
  // Operations / PM
  "projects", "tasks", "schedule", "rfis", "submittals", "closeout",
  // Sales
  "crm", "opportunities", "quotes", "customers", "salesPulse",
  // Engineering
  "designQueue", "drawings", "technicalReviews", "equipmentLists", "programming", "commissioning",
  // Finance
  "billing", "invoices", "purchaseOrders", "commissions", "jobCost", "profitability",
] as const;

export type ModuleKey = (typeof MODULE_KEYS)[number];

export const MODULE_ACTIONS = [
  "view", "create", "edit", "delete", "comment",
  "upload", "approve", "assign", "export", "manageSettings",
] as const;

export type ModuleAction = (typeof MODULE_ACTIONS)[number];

export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: "Dashboard",
  reports: "Reports",
  tools: "Tools & Process",
  projects: "Projects",
  tasks: "Tasks",
  schedule: "Schedule",
  rfis: "RFIs",
  submittals: "Submittals",
  closeout: "Closeout",
  crm: "CRM",
  opportunities: "Opportunities",
  quotes: "Quotes",
  customers: "Customers",
  salesPulse: "Sales Pulse",
  designQueue: "Design Queue",
  drawings: "Drawings",
  technicalReviews: "Technical Reviews",
  equipmentLists: "Equipment Lists",
  programming: "Programming",
  commissioning: "Commissioning",
  billing: "Billing",
  invoices: "Invoices",
  purchaseOrders: "Purchase Orders",
  commissions: "Commissions",
  jobCost: "Job Cost",
  profitability: "Profitability",
};

// ─── Default permissions by role ─────────────────────────────────────────────

type RolePerms = Partial<Record<ModuleKey, ModuleAction[]>>;

export const DEFAULT_ROLE_MODULE_PERMISSIONS: Record<RoleType, RolePerms> = {
  Executive: {
    dashboard: ["view", "export"],
    reports: ["view", "export"],
    tools: ["view"],
    projects: ["view", "comment", "export"],
    tasks: ["view", "comment"],
    schedule: ["view"],
    rfis: ["view", "comment"],
    submittals: ["view", "comment"],
    closeout: ["view", "comment"],
    crm: ["view", "export"],
    opportunities: ["view", "comment", "export"],
    quotes: ["view", "approve", "export"],
    customers: ["view", "comment"],
    salesPulse: ["view", "export"],
    designQueue: ["view"],
    drawings: ["view"],
    technicalReviews: ["view", "approve"],
    equipmentLists: ["view"],
    programming: ["view"],
    commissioning: ["view", "approve"],
    billing: ["view", "approve", "export"],
    invoices: ["view", "approve", "export"],
    purchaseOrders: ["view", "approve"],
    commissions: ["view", "approve", "export"],
    jobCost: ["view", "export"],
    profitability: ["view", "export"],
  },
  Salesperson: {
    dashboard: ["view"],
    reports: ["view", "export"],
    tools: ["view"],
    crm: ["view", "create", "edit", "comment"],
    opportunities: ["view", "create", "edit", "comment", "assign"],
    quotes: ["view", "create", "edit", "approve"],
    customers: ["view", "create", "edit", "comment"],
    salesPulse: ["view", "comment"],
  },
  Engineer: {
    dashboard: ["view"],
    reports: ["view"],
    projects: ["view", "comment"],
    tasks: ["view", "create", "edit", "comment", "assign"],
    designQueue: ["view", "create", "edit", "assign", "comment"],
    drawings: ["view", "upload", "edit", "comment"],
    technicalReviews: ["view", "create", "edit", "approve", "comment"],
    equipmentLists: ["view", "create", "edit", "comment"],
    programming: ["view", "create", "edit", "comment"],
    commissioning: ["view", "create", "edit", "approve", "comment"],
  },
  ProjectManager: {
    dashboard: ["view"],
    reports: ["view", "export"],
    tools: ["view"],
    projects: ["view", "create", "edit", "assign", "comment"],
    tasks: ["view", "create", "edit", "assign", "comment"],
    schedule: ["view", "create", "edit", "comment"],
    rfis: ["view", "create", "edit", "comment"],
    submittals: ["view", "create", "edit", "approve", "comment"],
    closeout: ["view", "create", "edit", "upload", "comment"],
    equipmentLists: ["view", "comment"],
  },
  Operations: {
    dashboard: ["view"],
    reports: ["view"],
    projects: ["view", "edit", "comment"],
    tasks: ["view", "create", "edit", "assign", "comment"],
    schedule: ["view", "create", "edit"],
    equipmentLists: ["view", "edit"],
    tools: ["view"],
  },
  Finance: {
    dashboard: ["view"],
    reports: ["view", "export"],
    billing: ["view", "create", "edit", "approve"],
    invoices: ["view", "create", "edit", "approve", "export"],
    purchaseOrders: ["view", "create", "edit", "approve"],
    commissions: ["view", "create", "edit", "approve"],
    jobCost: ["view", "edit", "export"],
    profitability: ["view", "export"],
    projects: ["view"],
  },
  HR: {
    dashboard: ["view"],
    reports: ["view"],
  },
  Technician: {
    dashboard: ["view"],
    projects: ["view", "comment"],
    tasks: ["view", "create", "edit", "comment"],
    programming: ["view", "create", "edit", "comment"],
    commissioning: ["view", "create", "edit", "comment"],
  },
  FieldTechnician: {
    dashboard: ["view"],
    projects: ["view", "comment"],
    tasks: ["view", "create", "edit", "comment"],
    programming: ["view", "create", "edit", "comment"],
    commissioning: ["view", "create", "edit", "comment"],
  },
  Customer: {
    dashboard: ["view"],
    projects: ["view", "comment"],
    reports: ["view"],
    submittals: ["view", "comment"],
  },
  Vendor: {
    dashboard: ["view"],
    projects: ["view"],
    equipmentLists: ["view"],
  },
  Subcontractor: {
    dashboard: ["view"],
    projects: ["view", "comment"],
    tasks: ["view", "comment"],
    schedule: ["view"],
  },
  Other: {
    dashboard: ["view"],
    projects: ["view", "comment"],
    tasks: ["view", "comment"],
  },
};

// ─── Permission resolution ────────────────────────────────────────────────────

// Viewer account type caps all permissions to view + comment only.
const VIEWER_ALLOWED_ACTIONS = new Set<ModuleAction>(["view", "comment"]);

export function getEffectivePermissions(
  accountType: AccountType,
  roleType: RoleType,
  module: ModuleKey
): ModuleAction[] {
  // Administrators get all actions on all modules
  if (accountType === "Administrator") return [...MODULE_ACTIONS];

  const rolePerms = DEFAULT_ROLE_MODULE_PERMISSIONS[roleType]?.[module] ?? [];

  // Viewer cap: strip anything not in the allowed set
  if (accountType === "Viewer") {
    return rolePerms.filter((a) => VIEWER_ALLOWED_ACTIONS.has(a));
  }

  return rolePerms;
}

export function hasModulePermission(
  accountType: AccountType,
  roleType: RoleType,
  module: ModuleKey,
  action: ModuleAction
): boolean {
  return getEffectivePermissions(accountType, roleType, module).includes(action);
}
