"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/shared/Skeleton";
import {
  DEFAULT_ROLE_PERMISSIONS,
  MODULE_KEYS,
  MODULE_LABELS,
  PERM_LEVELS,
  PERM_LEVEL_LABELS,
  type ModuleKey,
  type ModulePermLevel,
  type RolePermissionsConfig,
} from "@/lib/module-permissions";
import { ROLE_TYPES, ROLE_TYPE_LABELS, type RoleType } from "@/types/user";
import { cn } from "@/lib/utils";

// ─── Account Type explanation cards ───────────────────────────────────────────

const ACCOUNT_TYPE_INFO = [
  {
    type: "Viewer",
    color: "bg-muted/50 border-muted-foreground/20",
    badge: "bg-muted text-muted-foreground",
    description: "Can see content they have access to. Cannot create, edit, or delete anything.",
  },
  {
    type: "Member",
    color: "bg-blue-50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-800/30",
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    description: "Can see and edit items they own or are assigned to. Access is shaped by their Role.",
  },
  {
    type: "Administrator",
    color: "bg-primary/5 border-primary/20",
    badge: "bg-primary/10 text-primary",
    description: "Full access to everything on the platform. Overrides all Role permissions.",
  },
];

// ─── Level button colors ───────────────────────────────────────────────────────

const LEVEL_STYLES: Record<ModulePermLevel, { active: string; idle: string }> = {
  none:          { active: "bg-muted text-foreground border-border",                                idle: "hover:bg-muted/50" },
  viewer:        { active: "bg-sky-100 text-sky-700 border-sky-300 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700",   idle: "hover:bg-sky-50 dark:hover:bg-sky-900/10" },
  member:        { active: "bg-emerald-100 text-emerald-700 border-emerald-300 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-700", idle: "hover:bg-emerald-50 dark:hover:bg-emerald-900/10" },
  administrator: { active: "bg-primary/10 text-primary border-primary/30",                         idle: "hover:bg-primary/5" },
};

// ─── Main component ───────────────────────────────────────────────────────────

export function PermissionsTab() {
  const [config, setConfig] = useState<RolePermissionsConfig | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleType>("Sales");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/role-permissions")
      .then((r) => r.json())
      .then((data: RolePermissionsConfig) => {
        // Merge defaults with loaded config so all roles/modules have a value
        const merged: RolePermissionsConfig = {};
        for (const role of ROLE_TYPES) {
          merged[role] = { ...DEFAULT_ROLE_PERMISSIONS[role as string], ...(data[role] ?? {}) } as Record<ModuleKey, ModulePermLevel>;
        }
        setConfig(merged);
      })
      .catch(() => setConfig({ ...DEFAULT_ROLE_PERMISSIONS } as RolePermissionsConfig));
  }, []);

  function setLevel(role: RoleType, module: ModuleKey, level: ModulePermLevel) {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [role]: { ...prev[role], [module]: level },
      };
    });
    setSaved(false);
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    try {
      await fetch("/api/admin/role-permissions", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setConfig({ ...DEFAULT_ROLE_PERMISSIONS } as RolePermissionsConfig);
    setSaved(false);
  }

  const rolePerms = config?.[selectedRole];

  return (
    <div className="space-y-10">

      {/* ── Section 1: Account Type explanation ── */}
      <section>
        <h2 className="mb-1 text-lg font-semibold tracking-tight">Account Types</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Account Type is the broad access cap. Administrators always have full access regardless of Role.
        </p>
        <div className="grid gap-3 sm:grid-cols-3">
          {ACCOUNT_TYPE_INFO.map(({ type, color, badge, description }) => (
            <div key={type} className={cn("rounded-xl border p-4", color)}>
              <span className={cn("mb-2 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold", badge)}>
                {type}
              </span>
              <p className="mt-2 text-sm text-foreground/80">{description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Section 2: Role permissions matrix ── */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Role Permissions</h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Configure what each Role can do per feature. Account Type caps take precedence.
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

        {/* Role tabs */}
        <div className="mb-4 flex flex-wrap gap-1.5">
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

        {/* Module × level matrix */}
        {!config ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-12 rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border bg-card">
            {/* Header */}
            <div className="grid grid-cols-[1fr_repeat(4,auto)] items-center gap-2 border-b bg-muted/30 px-5 py-2.5">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Feature / Module
              </span>
              {PERM_LEVELS.map((lvl) => (
                <span
                  key={lvl}
                  className="w-24 text-center text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {PERM_LEVEL_LABELS[lvl]}
                </span>
              ))}
            </div>

            {MODULE_KEYS.map((mod) => {
              const current: ModulePermLevel = (rolePerms?.[mod] ?? "none") as ModulePermLevel;
              return (
                <div
                  key={mod}
                  className="grid grid-cols-[1fr_repeat(4,auto)] items-center gap-2 border-b px-5 py-3 last:border-0 hover:bg-accent/30 transition-colors"
                >
                  <span className="text-sm font-medium">{MODULE_LABELS[mod]}</span>
                  {PERM_LEVELS.map((lvl) => {
                    const isActive = current === lvl;
                    return (
                      <div key={lvl} className="flex w-24 justify-center">
                        <button
                          type="button"
                          onClick={() => setLevel(selectedRole, mod, lvl)}
                          className={cn(
                            "rounded-md border px-3 py-1 text-xs font-medium transition-colors",
                            isActive
                              ? LEVEL_STYLES[lvl].active
                              : cn("border-transparent text-muted-foreground", LEVEL_STYLES[lvl].idle)
                          )}
                        >
                          {PERM_LEVEL_LABELS[lvl]}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-3 text-xs text-muted-foreground">
          <strong>None</strong> — no access.&nbsp;
          <strong>Viewer</strong> — read + comment.&nbsp;
          <strong>Member</strong> — full use of the feature.&nbsp;
          <strong>Administrator</strong> — full use + manage settings.
        </p>
      </section>
    </div>
  );
}
