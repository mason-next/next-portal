"use client";

import { useEffect, useState } from "react";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import {
  getWorkflowStepDefaults,
  setWorkflowStepDefaults,
} from "@/lib/data/system-defaults";
import { WORKFLOW_STEP_TEMPLATE } from "@/modules/project-command-center/lib/workflow-steps";
import { AssigneeTargetSelector } from "@/modules/admin/components/AssigneeTargetSelector";
import type { AssigneeTarget, WorkflowStepDefaults } from "@/lib/data/system-defaults";

const SECTION_LABELS: Record<string, string> = {
  setup: "Setup",
  engineering: "Engineering",
  procurement: "Procurement",
  implementation: "Implementation",
  closeout: "Closeout",
  serviceWarranty: "Service & Warranty",
};

const PROJECT_ROLE_LABELS: Record<string, string> = {
  seniorInsideId: "Senior Inside",
  insidePMId: "Inside PM",
  fieldProjectManagerId: "Field PM",
  solutionsEngineerId: "Solutions Engineer",
  solutionsExecutiveId: "Solutions Executive",
};

// Only show steps that have a hardcoded defaultOwnerRole — those are the meaningful ones to override.
const STEPS_WITH_ROLE = WORKFLOW_STEP_TEMPLATE.filter((s) => s.defaultOwnerRole);
const SECTIONS_IN_ORDER = [...new Set(STEPS_WITH_ROLE.map((s) => s.section))];

export function WorkflowStepDefaultsCard() {
  const { users } = useUsersContext();
  const [defaults, setDefaults] = useState<WorkflowStepDefaults | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    getWorkflowStepDefaults().then((d) => {
      if (active) setDefaults(d);
    });
    return () => {
      active = false;
    };
  }, []);

  function handleChange(stepKey: string, target: AssigneeTarget | null) {
    const next: WorkflowStepDefaults = { ...defaults };
    if (target) {
      next[stepKey] = target;
    } else {
      delete next[stepKey];
    }
    setDefaults(next);
    setSaving(true);
    setWorkflowStepDefaults(next).finally(() => setSaving(false));
  }

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-1 flex items-center justify-between">
        <div className="text-sm font-semibold">Workflow Step Defaults</div>
        {saving && <span className="text-xs text-muted-foreground">Saving…</span>}
      </div>
      <p className="mb-4 text-sm text-muted-foreground">
        Override the default owner for each workflow step when a new project is created. If not set,
        the step falls back to whoever holds the project&apos;s corresponding role.
      </p>
      {defaults === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : (
        <div className="space-y-6">
          {SECTIONS_IN_ORDER.map((section) => (
            <div key={section}>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                {SECTION_LABELS[section] ?? section}
              </div>
              <div className="space-y-3">
                {STEPS_WITH_ROLE.filter((s) => s.section === section).map((step) => (
                  <div key={step.key} className="flex items-start gap-3">
                    <div className="w-52 shrink-0 pt-0.5">
                      <div className="text-sm">{step.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Default role:{" "}
                        {step.defaultOwnerRole
                          ? (PROJECT_ROLE_LABELS[step.defaultOwnerRole] ?? step.defaultOwnerRole)
                          : "—"}
                      </div>
                    </div>
                    <AssigneeTargetSelector
                      value={defaults[step.key] ?? null}
                      onChange={(t) => handleChange(step.key, t)}
                      users={users}
                      placeholder="Use project role"
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
