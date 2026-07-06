"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { AddWorkflowStepModal } from "./AddWorkflowStepModal";
import type { AddWorkflowStepInput } from "@/lib/data/workflow";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserInlineLabel } from "@/components/shared/UserInlineLabel";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { UserSelect } from "@/components/shared/UserSelect";
import { EditProjectOverviewModal } from "@/components/shared/AppShell/EditProjectOverviewModal";
import { useProjectContext } from "@/modules/project-command-center/hooks/ProjectContext";
import { useWorkflowStepsContext } from "@/modules/project-command-center/hooks/WorkflowStepsContext";
import { useSession } from "@/lib/auth/client";
import { formatCalendarDate, formatDate } from "@/lib/utils";
import { readGlobal, writeGlobal } from "@/lib/storage/local-store";
import { StepDetailModal } from "./StepDetailModal";
import {
  WORKFLOW_STATUS_TONE,
  isModuleManagedStep,
  stepActionHref,
  stepHasAction,
  stepPhaseLabel,
} from "@/modules/project-command-center/lib/workflow-steps";
import { PROJECT_SECTION_KEYS, WORKFLOW_STEP_STATUSES, type ProjectSectionKey, type WorkflowStep } from "@/types/workflow";

const SHOW_WEIGHT_KEY = "workflow-checklist:show-weight";

interface WorkflowChecklistProps {
  projectId: string;
  // When omitted, the "+ Add step" affordance is hidden (e.g. on the all-sections dashboard).
  section?: ProjectSectionKey;
  steps: WorkflowStep[];
  onUpdateStep: (key: string, patch: Partial<WorkflowStep>) => void;
  onAddStep?: (input: AddWorkflowStepInput) => void;
  onDeleteStep: (key: string) => void;
  percentByKey?: Partial<Record<string, number>>;
}

export function WorkflowChecklist({
  projectId,
  section,
  steps,
  onUpdateStep,
  onAddStep,
  onDeleteStep,
  percentByKey,
}: WorkflowChecklistProps) {
  const session = useSession();
  const canEdit = session.roleTypes.includes("Administrator") ||
    session.roleTypes.some((r) => !["Customer", "Subcontractor"].includes(r));
  const { users } = useUsersContext();
  const { project, setProject } = useProjectContext();
  const { refetch: refetchWorkflowSteps } = useWorkflowStepsContext();
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [showWeight, setShowWeight] = useState(false);
  const [showAssignTeam, setShowAssignTeam] = useState(false);
  const [editingDueDateKey, setEditingDueDateKey] = useState<string | null>(null);
  const [draftDueDate, setDraftDueDate] = useState("");
  const [editingStatusKey, setEditingStatusKey] = useState<string | null>(null);
  const [editingOwnerKey, setEditingOwnerKey] = useState<string | null>(null);
  const [editingWeightKey, setEditingWeightKey] = useState<string | null>(null);
  const [draftWeight, setDraftWeight] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  // Group by phase first (Setup, Engineering, Procurement, Implementation, Closeout), then
  // by sortOrder within the phase — sortOrder alone isn't reliable across phases, since
  // custom steps are appended with a global max+1 value regardless of which section they
  // belong to (see addWorkflowStep), which could otherwise sort a Setup step after Closeout.
  const orderedSteps = [...steps].sort((a, b) => {
    const phaseDiff = PROJECT_SECTION_KEYS.indexOf(a.section) - PROJECT_SECTION_KEYS.indexOf(b.section);
    return phaseDiff !== 0 ? phaseDiff : a.sortOrder - b.sortOrder;
  });
  const activeStep = activeKey ? orderedSteps.find((s) => s.key === activeKey) ?? null : null;

  useEffect(() => {
    queueMicrotask(() => setShowWeight(readGlobal<boolean>(SHOW_WEIGHT_KEY) ?? false));
  }, []);

  function toggleShowWeight() {
    setShowWeight((prev) => {
      const next = !prev;
      writeGlobal(SHOW_WEIGHT_KEY, next);
      return next;
    });
  }

  function startEditingDueDate(e: SyntheticEvent, step: WorkflowStep) {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    setEditingDueDateKey(step.key);
    setDraftDueDate(step.dueDate ?? "");
  }

  function commitDueDate(step: WorkflowStep) {
    onUpdateStep(step.key, { dueDate: draftDueDate || null });
    setEditingDueDateKey(null);
  }

  function startEditingStatus(e: SyntheticEvent, step: WorkflowStep) {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    setEditingStatusKey(step.key);
  }

  function commitStatus(step: WorkflowStep, status: WorkflowStep["status"]) {
    onUpdateStep(step.key, {
      status,
      ...(isModuleManagedStep(step.key) ? { statusOverridden: true } : {}),
    });
    setEditingStatusKey(null);
  }

  function startEditingOwner(e: SyntheticEvent, step: WorkflowStep) {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    setEditingOwnerKey(step.key);
  }

  function commitOwner(step: WorkflowStep, ownerId: string | null) {
    onUpdateStep(step.key, { ownerId });
    setEditingOwnerKey(null);
  }

  function startEditingWeight(e: SyntheticEvent, step: WorkflowStep) {
    if (!canEdit) return;
    e.preventDefault();
    e.stopPropagation();
    setEditingWeightKey(step.key);
    setDraftWeight(String(step.weight));
  }

  function commitWeight(step: WorkflowStep) {
    const parsed = Number(draftWeight);
    if (Number.isFinite(parsed) && parsed >= 0) {
      onUpdateStep(step.key, { weight: parsed, weightOverridden: true });
    }
    setEditingWeightKey(null);
  }

  const canAddStep = Boolean(onAddStep);

  return (
    <>
      <div className="mb-2 flex justify-end gap-3">
        {canEdit && canAddStep ? (
          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            + Add step
          </button>
        ) : null}
        <button
          type="button"
          onClick={toggleShowWeight}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          {showWeight ? "Hide weight column" : "Show weight column"}
        </button>
      </div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="bg-muted text-left text-muted-foreground">
              <th className="h-9 px-3 font-semibold">Step</th>
              <th className="h-9 px-3 font-semibold">Status</th>
              {showWeight ? <th className="h-9 px-3 font-semibold">Weight</th> : null}
              <th className="h-9 px-3 font-semibold">Phase</th>
              <th className="h-9 px-3 font-semibold">Owner</th>
              <th className="h-9 px-3 font-semibold">Due Date</th>
              <th className="h-9 px-3 font-semibold">Completed Date</th>
              <th className="h-9 px-3 font-semibold">Last Updated</th>
              <th className="h-9 px-3 font-semibold">Action</th>
            </tr>
          </thead>
          <tbody>
            {orderedSteps.map((step) => {
              const percent = percentByKey?.[step.key];
              const label = percent !== undefined ? `${step.status} ${percent}%` : step.status;
              const isEditingDueDate = editingDueDateKey === step.key;
              return (
                <tr
                  key={step.key}
                  onClick={() => setActiveKey(step.key)}
                  className="cursor-pointer border-b last:border-b-0 hover:bg-accent"
                >
                  <td className="h-11 px-3 font-medium">{step.name}</td>
                  <td className="h-11 px-3">
                    {editingStatusKey === step.key ? (
                      <select
                        autoFocus
                        className="h-7 rounded-md border border-input bg-background px-1.5 text-xs outline-none focus:border-primary"
                        value={step.status}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => commitStatus(step, e.target.value as WorkflowStep["status"])}
                        onBlur={() => setEditingStatusKey(null)}
                      >
                        {WORKFLOW_STEP_STATUSES.map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5"
                        onClick={(e) => startEditingStatus(e, step)}
                        onContextMenu={(e) => startEditingStatus(e, step)}
                        title="Click to quickly change the status"
                      >
                        <StatusBadge label={label} tone={WORKFLOW_STATUS_TONE[step.status]} />
                        {step.statusOverridden ? (
                          <span className="text-xs text-muted-foreground">(manual)</span>
                        ) : null}
                      </span>
                    )}
                  </td>
                  {showWeight ? (
                    <td className="h-11 px-3 text-muted-foreground">
                      {editingWeightKey === step.key ? (
                        <input
                          type="number"
                          min={0}
                          step="0.1"
                          autoFocus
                          className="h-7 w-20 rounded-md border border-input bg-background px-1.5 text-xs outline-none focus:border-primary"
                          value={draftWeight}
                          onClick={(e) => e.stopPropagation()}
                          onChange={(e) => setDraftWeight(e.target.value)}
                          onBlur={() => commitWeight(step)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") commitWeight(step);
                            if (e.key === "Escape") setEditingWeightKey(null);
                          }}
                        />
                      ) : (
                        <span
                          className="inline-flex items-center gap-1.5 rounded px-1 -mx-1 hover:bg-muted"
                          onClick={(e) => startEditingWeight(e, step)}
                          onContextMenu={(e) => startEditingWeight(e, step)}
                          title="Click to manually set this step's weight"
                        >
                          {step.weight}%{step.weightOverridden ? " (manual)" : ""}
                        </span>
                      )}
                    </td>
                  ) : null}
                  <td className="h-11 px-3 text-muted-foreground">{stepPhaseLabel(step.section)}</td>
                  <td className="h-11 px-3 text-muted-foreground">
                    {editingOwnerKey === step.key ? (
                      <div className="w-48" onClick={(e) => e.stopPropagation()}>
                        <UserSelect
                          users={users}
                          value={step.ownerId}
                          onChange={(ownerId) => commitOwner(step, ownerId)}
                        />
                      </div>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 rounded px-1 -mx-1 hover:bg-muted"
                        onClick={(e) => startEditingOwner(e, step)}
                        onContextMenu={(e) => startEditingOwner(e, step)}
                        title="Click to quickly change the owner"
                      >
                        <UserInlineLabel user={users.find((u) => u.id === step.ownerId) ?? null} />
                      </span>
                    )}
                  </td>
                  <td className="h-11 px-3 text-muted-foreground">
                    {isEditingDueDate ? (
                      <input
                        type="date"
                        autoFocus
                        className="h-7 rounded-md border border-input bg-background px-1.5 text-xs outline-none focus:border-primary"
                        value={draftDueDate}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => setDraftDueDate(e.target.value)}
                        onBlur={() => commitDueDate(step)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") commitDueDate(step);
                          if (e.key === "Escape") setEditingDueDateKey(null);
                        }}
                      />
                    ) : (
                      <span
                        className="rounded px-1 -mx-1 hover:bg-muted"
                        onClick={(e) => startEditingDueDate(e, step)}
                        onContextMenu={(e) => startEditingDueDate(e, step)}
                        title="Click to quickly change the due date"
                      >
                        {formatCalendarDate(step.dueDate)}
                      </span>
                    )}
                  </td>
                  <td className="h-11 px-3 text-muted-foreground">{formatDate(step.completedDate)}</td>
                  <td className="h-11 px-3 text-muted-foreground">{formatDate(step.updatedAt)}</td>
                  <td className="h-11 px-3" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      {step.key === "assignTeam" ? (
                        <Button variant="outline" size="xs" onClick={() => setShowAssignTeam(true)}>
                          Open
                        </Button>
                      ) : stepHasAction(step.key) ? (
                        <Link
                          href={stepActionHref(projectId, step)}
                          className={buttonVariants({ variant: "outline", size: "xs" })}
                        >
                          Open
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                      {canEdit ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (!window.confirm(`Remove "${step.name}"? This cannot be undone.`)) return;
                            onDeleteStep(step.key);
                          }}
                          className="text-xs text-muted-foreground hover:text-destructive"
                          title="Remove this step"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {activeStep ? (
        <StepDetailModal
          projectId={projectId}
          step={activeStep}
          onClose={() => setActiveKey(null)}
          onUpdateStep={onUpdateStep}
        />
      ) : null}

      {showAddModal && onAddStep ? (
        <AddWorkflowStepModal
          defaultSection={section}
          existingSteps={orderedSteps}
          onClose={() => setShowAddModal(false)}
          onAdd={async (input) => {
            await onAddStep(input);
            setShowAddModal(false);
          }}
        />
      ) : null}

      {showAssignTeam && project ? (
        <EditProjectOverviewModal
          project={project}
          onClose={() => setShowAssignTeam(false)}
          onSaved={(updated) => {
            setProject(updated);
            refetchWorkflowSteps();
            setShowAssignTeam(false);
          }}
        />
      ) : null}
    </>
  );
}
