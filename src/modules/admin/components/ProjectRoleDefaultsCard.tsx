"use client";

import { useEffect, useState } from "react";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import {
  getProjectRoleDefaults,
  setProjectRoleDefaults,
} from "@/lib/data/system-defaults";
import { AssigneeTargetSelector } from "@/modules/admin/components/AssigneeTargetSelector";
import type { AssigneeTarget, ProjectRoleDefaults, ProjectRoleKey } from "@/lib/data/system-defaults";

const ROLE_LABELS: Record<ProjectRoleKey, string> = {
  seniorInsideId: "Senior Inside",
  insidePMId: "Inside PM",
  fieldProjectManagerId: "Field Project Manager",
  solutionsEngineerId: "Solutions Engineer",
  solutionsExecutiveId: "Solutions Executive",
};

const ROLE_ORDER: ProjectRoleKey[] = [
  "seniorInsideId",
  "insidePMId",
  "fieldProjectManagerId",
  "solutionsEngineerId",
  "solutionsExecutiveId",
];

export function ProjectRoleDefaultsCard() {
  const { users } = useUsersContext();
  const [defaults, setDefaults] = useState<ProjectRoleDefaults | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getProjectRoleDefaults().then((d) => {
      if (active) setDefaults(d);
    });
    return () => {
      active = false;
    };
  }, []);

  function handleChange(role: ProjectRoleKey, target: AssigneeTarget | null) {
    const next: ProjectRoleDefaults = { ...defaults };
    if (target) {
      next[role] = target;
    } else {
      delete next[role];
    }
    setDefaults(next);
    setSaving(true);
    setProjectRoleDefaults(next).finally(() => setSaving(false));
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-sm font-semibold">New Project Role Defaults</div>
        {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Pre-fill these project roles when a new project is created. Choose a specific person or any
        user with a matching role type.
      </p>
      {defaults === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-3">
          {ROLE_ORDER.map((role) => (
            <div key={role} className="flex items-center gap-3">
              <div className="w-44 shrink-0 text-sm text-muted-foreground">{ROLE_LABELS[role]}</div>
              <AssigneeTargetSelector
                value={defaults[role] ?? null}
                onChange={(t) => handleChange(role, t)}
                users={users}
                className="flex-1"
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
