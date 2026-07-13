"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, PlusCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { PROJECT_SECTION_KEYS, SECTION_LABEL, PHASE_WEIGHT } from "@/modules/project-command-center/lib/workflow-steps";
import type { ProjectSectionKey, WorkflowStep } from "@/types/workflow";

interface ManagePhasesModalProps {
  steps: WorkflowStep[];
  onAddPhase: (section: ProjectSectionKey) => Promise<void>;
  onRemovePhase: (section: ProjectSectionKey) => Promise<void>;
  onClose: () => void;
}

export function ManagePhasesModal({ steps, onAddPhase, onRemovePhase, onClose }: ManagePhasesModalProps) {
  const [pending, setPending] = useState<ProjectSectionKey | null>(null);
  const [busy, setBusy] = useState<ProjectSectionKey | null>(null);

  const activeSections = new Set(steps.map((s) => s.section));
  const excludedSections = PROJECT_SECTION_KEYS.filter((k) => !activeSections.has(k));

  // Steps that have made progress in the section being removed
  const pendingSteps = pending ? steps.filter((s) => s.section === pending) : [];
  const hasProgress = pendingSteps.some((s) => s.status !== "Not Started");

  async function handleAdd(section: ProjectSectionKey) {
    setBusy(section);
    try {
      await onAddPhase(section);
    } finally {
      setBusy(null);
    }
  }

  async function handleRemoveConfirm() {
    if (!pending) return;
    setBusy(pending);
    try {
      await onRemovePhase(pending);
      setPending(null);
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal open onClose={onClose}>
      <h2 className="mb-1 text-lg font-semibold">Manage Phases</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Add or remove predefined phases for this project. Phase names cannot be changed.
        Removing a phase hides it from the workflow and progress — all data is preserved and the phase can be re-added.
      </p>

      {/* Confirmation panel for removal */}
      {pending && (
        <div className="mb-5 rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/40 dark:bg-amber-950/20">
          <div className="flex items-start gap-3">
            <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-600 dark:text-amber-400" />
            <div className="space-y-2">
              <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                Remove &ldquo;{SECTION_LABEL[pending]}&rdquo; phase?
              </p>
              {hasProgress ? (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  {pendingSteps.filter((s) => s.status !== "Not Started").length} of {pendingSteps.length} step
                  {pendingSteps.length !== 1 ? "s" : ""} in this phase have recorded progress. That data will be
                  preserved in the database but hidden from the active workflow and progress calculations.
                </p>
              ) : (
                <p className="text-sm text-amber-700 dark:text-amber-400">
                  This phase has {pendingSteps.length} step{pendingSteps.length !== 1 ? "s" : ""} with no recorded
                  progress. They will be hidden but not deleted.
                </p>
              )}
              <p className="text-xs text-amber-600 dark:text-amber-500">
                You can re-add this phase at any time to restore it to the workflow.
              </p>
              <div className="flex gap-2 pt-1">
                <Button size="sm" variant="destructive" onClick={handleRemoveConfirm} disabled={busy === pending}>
                  {busy === pending ? "Removing…" : "Remove Phase"}
                </Button>
                <Button size="sm" variant="outline" onClick={() => setPending(null)} disabled={!!busy}>
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {/* Active phases */}
        {PROJECT_SECTION_KEYS.filter((k) => activeSections.has(k)).map((section) => {
          const sectionSteps = steps.filter((s) => s.section === section);
          return (
            <div
              key={section}
              className="flex items-center justify-between rounded-lg border bg-card px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                <div>
                  <p className="text-sm font-medium">{SECTION_LABEL[section]}</p>
                  <p className="text-xs text-muted-foreground">
                    {sectionSteps.length} step{sectionSteps.length !== 1 ? "s" : ""} · {PHASE_WEIGHT[section]}% of progress
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPending(section)}
                disabled={!!busy || pending === section}
                className="text-muted-foreground hover:text-destructive"
              >
                <XCircle className="size-4 mr-1" />
                Remove
              </Button>
            </div>
          );
        })}

        {/* Excluded phases */}
        {excludedSections.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Excluded Phases
            </p>
            {excludedSections.map((section) => (
              <div
                key={section}
                className="flex items-center justify-between rounded-lg border border-dashed bg-muted/30 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <XCircle className="size-4 shrink-0 text-muted-foreground/40" />
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">{SECTION_LABEL[section]}</p>
                    <p className="text-xs text-muted-foreground/60">
                      Not active · {PHASE_WEIGHT[section]}% weight when included
                    </p>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleAdd(section)}
                  disabled={!!busy || !!pending}
                >
                  {busy === section ? (
                    "Adding…"
                  ) : (
                    <>
                      <PlusCircle className="size-4 mr-1" />
                      Add Phase
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        )}

        {excludedSections.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">All phases are currently active.</p>
        )}
      </div>

      <div className="mt-6 flex justify-end">
        <Button variant="outline" onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
}
