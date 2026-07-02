"use client";

import { useState } from "react";
import {
  DEFAULT_ROLE_MODULE_PERMISSIONS,
  MODULE_LABELS,
  type ModuleKey,
  type ModuleAction,
} from "@/lib/module-permissions";
import { ROLE_TYPES, ROLE_TYPE_LABELS, type RoleType } from "@/types/user";
import { cn } from "@/lib/utils";

// Group modules by category
const MODULE_GROUPS: { label: string; modules: ModuleKey[] }[] = [
  {
    label: "Platform",
    modules: ["dashboard", "reports", "tools"],
  },
  {
    label: "Operations / Project Management",
    modules: ["projects", "tasks", "schedule", "rfis", "submittals", "closeout"],
  },
  {
    label: "Sales",
    modules: ["crm", "opportunities", "quotes", "customers", "salesPulse"],
  },
  {
    label: "Engineering",
    modules: ["designQueue", "drawings", "technicalReviews", "equipmentLists", "programming", "commissioning"],
  },
  {
    label: "Finance",
    modules: ["billing", "invoices", "purchaseOrders", "commissions", "jobCost", "profitability"],
  },
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const ACTION_ABBREV: Record<ModuleAction, string> = {
  view: "V",
  create: "C",
  edit: "E",
  delete: "D",
  comment: "Cm",
  upload: "Up",
  approve: "Ap",
  assign: "As",
  export: "Ex",
  manageSettings: "MS",
};

export function RolesTab() {
  const [selectedRole, setSelectedRole] = useState<RoleType>("ProjectManager");

  const rolePerms = DEFAULT_ROLE_MODULE_PERMISSIONS[selectedRole];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Role Permissions</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Default module permissions for each Role Type. Account Type caps what actions are
          effective: Administrators get full access; Viewers are capped to view + comment only.
        </p>
      </div>

      {/* Role selector */}
      <div className="flex flex-wrap gap-2">
        {ROLE_TYPES.map((role) => (
          <button
            key={role}
            type="button"
            onClick={() => setSelectedRole(role)}
            className={cn(
              "rounded-full border px-3 py-1 text-sm font-medium transition-colors",
              selectedRole === role
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            )}
          >
            {ROLE_TYPE_LABELS[role]}
          </button>
        ))}
      </div>

      {/* Module permission table for selected role */}
      <div className="space-y-4">
        {MODULE_GROUPS.map(({ label, modules }) => {
          const groupModules = modules.filter((m) => rolePerms[m] && rolePerms[m]!.length > 0);
          if (groupModules.length === 0) return null;
          return (
            <div key={label} className="overflow-hidden rounded-lg border">
              <div className="border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {label}
              </div>
              <table className="w-full text-sm">
                <tbody>
                  {groupModules.map((mod) => {
                    const actions = rolePerms[mod] ?? [];
                    return (
                      <tr key={mod} className="border-b last:border-0 hover:bg-muted/10">
                        <td className="px-4 py-3 font-medium">{MODULE_LABELS[mod]}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1.5">
                            {actions.map((action) => (
                              <span
                                key={action}
                                className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
                              >
                                {action}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          );
        })}

        {Object.values(rolePerms).every((v) => !v || v.length === 0) && (
          <p className="text-sm text-muted-foreground">
            No module permissions defined for this role.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800/30 dark:bg-blue-900/10 dark:text-blue-300">
        <strong>How it works:</strong> Role Type sets which modules a user can access and what
        actions they can take. Account Type caps those permissions — Administrators always get
        full access, Viewers are always limited to view + comment regardless of Role Type.
      </div>
    </div>
  );
}
