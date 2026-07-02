"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/shared/Skeleton";
import {
  DEFAULT_PERMISSIONS,
  PERMISSION_FEATURES,
  PERMISSION_FEATURE_LABELS,
  type PermissionsConfig,
} from "@/lib/permissions";
import {
  DEFAULT_ROLE_MODULE_PERMISSIONS,
  MODULE_LABELS,
  type ModuleKey,
} from "@/lib/module-permissions";
import { ROLE_TYPES, ROLE_TYPE_LABELS, type RoleType } from "@/types/user";
import { cn } from "@/lib/utils";

const CONFIGURABLE_ACCOUNT_TYPES = ["Member", "Viewer"] as const;
type ConfigurableType = (typeof CONFIGURABLE_ACCOUNT_TYPES)[number];

// Group modules by category (mirrors RolesTab)
const MODULE_GROUPS: { label: string; modules: ModuleKey[] }[] = [
  { label: "Platform", modules: ["dashboard", "reports", "tools"] },
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

export function PermissionsTab() {
  const [config, setConfig] = useState<PermissionsConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedRole, setSelectedRole] = useState<RoleType>("ProjectManager");

  useEffect(() => {
    fetch("/api/admin/permissions")
      .then((r) => r.json())
      .then(setConfig);
  }, []);

  function toggle(accountType: ConfigurableType, feature: (typeof PERMISSION_FEATURES)[number]) {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [accountType]: {
          ...prev[accountType],
          [feature]: !prev[accountType][feature],
        },
      };
    });
    setSaved(false);
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    await fetch("/api/admin/permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setSaving(false);
    setSaved(true);
  }

  function handleReset() {
    setConfig(DEFAULT_PERMISSIONS);
    setSaved(false);
  }

  const rolePerms = DEFAULT_ROLE_MODULE_PERMISSIONS[selectedRole];

  return (
    <div className="space-y-10">
      {/* ── Section 1: Nav Access by Account Type ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Nav Access by Account Type</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Control which sections each account type can access. Administrators always have full access.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
            >
              Reset defaults
            </button>
            <Button onClick={handleSave} disabled={saving || !config}>
              {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
            </Button>
          </div>
        </div>

        {!config ? (
          <div className="rounded-xl border bg-card divide-y">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <Skeleton className="h-4 w-40" />
                <div className="ml-auto flex gap-12">
                  <Skeleton className="h-5 w-10 rounded-full" />
                  <Skeleton className="h-5 w-10 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-xl border bg-card overflow-hidden">
            {/* Header row */}
            <div className="flex items-center gap-4 px-5 py-3 border-b bg-muted/30">
              <div className="flex-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Feature / Section
              </div>
              {CONFIGURABLE_ACCOUNT_TYPES.map((t) => (
                <div key={t} className="w-24 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  {t}
                </div>
              ))}
              <div className="w-24 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Admin
              </div>
            </div>

            {/* Feature rows */}
            {PERMISSION_FEATURES.map((feature) => (
              <div
                key={feature}
                className="flex items-center gap-4 px-5 py-3.5 border-b last:border-0 hover:bg-accent/30 transition-colors"
              >
                <div className="flex-1 text-sm font-medium">
                  {PERMISSION_FEATURE_LABELS[feature]}
                </div>
                {CONFIGURABLE_ACCOUNT_TYPES.map((accountType) => (
                  <div key={accountType} className="w-24 flex justify-center">
                    <button
                      type="button"
                      onClick={() => toggle(accountType, feature)}
                      aria-label={`Toggle ${feature} for ${accountType}`}
                      className={cn(
                        "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                        config[accountType][feature] ? "bg-primary" : "bg-muted-foreground/30"
                      )}
                    >
                      <span
                        className={cn(
                          "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
                          config[accountType][feature] ? "translate-x-[18px]" : "translate-x-0.5"
                        )}
                      />
                    </button>
                  </div>
                ))}
                {/* Admin always on */}
                <div className="w-24 flex justify-center">
                  <span className="inline-flex h-5 w-9 items-center rounded-full bg-primary/30 cursor-not-allowed">
                    <span className="inline-block h-3.5 w-3.5 translate-x-[18px] transform rounded-full bg-primary/60 shadow" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          Changes take effect on the user&apos;s next page load. Navigation items are hidden for restricted account types.
        </p>
      </section>

      {/* ── Section 2: Module Permissions by Role ── */}
      <section>
        <div className="mb-4">
          <h2 className="text-lg font-semibold tracking-tight">Module Permissions by Role</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Default module permissions for each Role Type. Account Type caps what actions are
            effective: Administrators get full access; Viewers are capped to view + comment only.
          </p>
        </div>

        {/* Role selector */}
        <div className="mb-4 flex flex-wrap gap-2">
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

        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800 dark:border-blue-800/30 dark:bg-blue-900/10 dark:text-blue-300">
          <strong>How it works:</strong> Role Type sets which modules a user can access and what
          actions they can take. Account Type caps those permissions — Administrators always get
          full access, Viewers are always limited to view + comment regardless of Role Type.
        </div>
      </section>
    </div>
  );
}
