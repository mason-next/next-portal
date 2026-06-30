"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { UserSelect } from "@/components/shared/UserSelect";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { useProjectContext } from "@/modules/project-command-center/hooks/ProjectContext";
import { isModuleManagedStep, stepActionHref } from "@/modules/project-command-center/lib/workflow-steps";
import { useWorkflowStepsContext } from "@/modules/project-command-center/hooks/WorkflowStepsContext";
import { cn, formatDate } from "@/lib/utils";
import { ROLE_NOT_NEEDED } from "@/lib/role-assignment";
import { WORKFLOW_STEP_STATUSES, type WorkflowStep } from "@/types/workflow";

const FIELD_INPUT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary";

interface StepDetailModalProps {
  projectId: string;
  step: WorkflowStep;
  onClose: () => void;
  onUpdateStep: (key: string, patch: Partial<WorkflowStep>) => void;
}

export function StepDetailModal({ projectId, step, onClose, onUpdateStep }: StepDetailModalProps) {
  const isModuleManaged = isModuleManagedStep(step.key);
  const { users } = useUsersContext();
  const { project } = useProjectContext();
  const { refetch: refetchWorkflowSteps } = useWorkflowStepsContext();
  const [status, setStatus] = useState<WorkflowStep["status"]>(step.status);
  const [overrideEnabled, setOverrideEnabled] = useState(step.statusOverridden);
  const [ownerId, setOwnerId] = useState(step.ownerId);
  const [dueDate, setDueDate] = useState(step.dueDate ? step.dueDate.slice(0, 10) : "");
  const [submitting, setSubmitting] = useState(false);

  // Only show users who are already assigned to this project (any role).
  // Falls back to all users if the project has no role assignments yet.
  const memberIds = new Set(
    [
      project?.fieldProjectManagerId,
      project?.solutionsExecutiveId,
      project?.solutionsEngineerId,
      project?.seniorInsideId,
      project?.insidePMId,
      ...(project?.technicians ?? []).map((t) => t.userId),
    ].filter((id): id is string => !!id && id !== ROLE_NOT_NEEDED)
  );
  const projectMembers = memberIds.size > 0 ? users.filter((u) => memberIds.has(u.id)) : users;

  async function handleSave() {
    setSubmitting(true);
    await onUpdateStep(step.key, {
      ...(isModuleManaged ? { statusOverridden: overrideEnabled, ...(overrideEnabled ? { status } : {}) } : { status }),
      ownerId,
      dueDate: dueDate || null,
    });
    if (isModuleManaged) refetchWorkflowSteps();
    onClose();
  }

  return (
    <Modal open onClose={onClose}>
      <h2 className="mb-1 text-lg font-semibold">{step.name}</h2>
      <p className="mb-4 text-sm text-muted-foreground">Last updated {formatDate(step.updatedAt)}.</p>

      <div className="grid gap-3">
        <Field label="Status">
          {isModuleManaged && !overrideEnabled ? (
            <div className="flex items-center gap-2">
              <div className={cn(FIELD_INPUT_CLASS, "flex flex-1 items-center text-muted-foreground")}>
                {step.status} — calculated automatically
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => setOverrideEnabled(true)}>
                Override
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <select
                className={cn(FIELD_INPUT_CLASS, "flex-1")}
                value={status}
                onChange={(e) => setStatus(e.target.value as WorkflowStep["status"])}
              >
                {WORKFLOW_STEP_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
              {isModuleManaged ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setOverrideEnabled(false);
                    setStatus(step.status);
                  }}
                >
                  Reset to automatic
                </Button>
              ) : null}
            </div>
          )}
        </Field>
        <Field label="Owner">
          {memberIds.size === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              Assign team members to this project to set a step owner.
            </p>
          ) : (
            <UserSelect users={projectMembers} value={ownerId} onChange={setOwnerId} />
          )}
        </Field>
        <Field label="Due Date">
          <input
            type="date"
            className={FIELD_INPUT_CLASS}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
          />
        </Field>
        {step.completedDate ? (
          <Field label="Completed">
            <div className={cn(FIELD_INPUT_CLASS, "flex items-center text-muted-foreground")}>
              {formatDate(step.completedDate)}
            </div>
          </Field>
        ) : null}
      </div>

      {isModuleManaged ? null : (
        <p className="mt-4 rounded-md bg-muted px-3 py-2.5 text-sm text-muted-foreground">
          Detailed workflow content for this step is coming soon.
        </p>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        {isModuleManaged ? (
          <Link href={stepActionHref(projectId, step)} className={buttonVariants({ variant: "outline" })}>
            Open {step.name}
          </Link>
        ) : null}
        <Button onClick={handleSave} disabled={submitting}>
          {submitting ? "Saving…" : "Save"}
        </Button>
      </div>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1 text-xs font-semibold text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
