"use client";

import { useState, useMemo, type ReactNode } from "react";
import { CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { createProject } from "@/lib/data/projects";
import {
  PROJECT_TYPES,
  WORKFLOW_STEP_TEMPLATE,
  DEFAULT_PROJECT_TYPE_CONFIG,
  getSectionLabelForTypes,
  shouldIncludeStepForTypesWithConfig,
} from "@/modules/project-command-center/lib/workflow-steps";
import { PROJECT_SECTION_KEYS } from "@/types/workflow";
import { cn } from "@/lib/utils";
import type { Project } from "@/types/project";

const FIELD_INPUT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary";

// These two are auto-completed milestones at project creation — always included.
const NON_DESELECTABLE = new Set(["opportunityWon", "projectCreated"]);

type ModalStep = "form" | "preview";

interface NewProjectModalProps {
  onClose: () => void;
  onCreated: (project: Project) => void;
}

export function NewProjectModal({ onClose, onCreated }: NewProjectModalProps) {
  const [modalStep, setModalStep] = useState<ModalStep>("form");
  const [name, setName] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [coordinatorGroup, setCoordinatorGroup] = useState("Project Coordination Team");
  const [projectTypes, setProjectTypes] = useState<string[]>([]);
  const [excludedKeys, setExcludedKeys] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  function toggleType(type: string) {
    setProjectTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    // Reset exclusions when types change so the preview rebuilds cleanly
    setExcludedKeys(new Set());
  }

  // Workflow steps that will be shown in the preview, filtered by project type
  const previewSteps = useMemo(
    () =>
      WORKFLOW_STEP_TEMPLATE.filter((e) =>
        shouldIncludeStepForTypesWithConfig(e.key, projectTypes, DEFAULT_PROJECT_TYPE_CONFIG)
      ),
    [projectTypes]
  );

  // Steps grouped by section for the preview UI
  const previewBySectionEntry = useMemo(
    () =>
      PROJECT_SECTION_KEYS.map((section) => ({
        section,
        label: getSectionLabelForTypes(section, projectTypes, DEFAULT_PROJECT_TYPE_CONFIG),
        steps: previewSteps.filter((e) => e.section === section),
      })).filter((g) => g.steps.length > 0),
    [previewSteps, projectTypes]
  );

  function toggleStep(key: string) {
    if (NON_DESELECTABLE.has(key)) return;
    setExcludedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function toggleSection(section: string) {
    const sectionSteps = previewSteps.filter(
      (e) => e.section === section && !NON_DESELECTABLE.has(e.key)
    );
    const allSelected = sectionSteps.every((e) => !excludedKeys.has(e.key));
    setExcludedKeys((prev) => {
      const next = new Set(prev);
      for (const e of sectionSteps) {
        if (allSelected) next.add(e.key);
        else next.delete(e.key);
      }
      return next;
    });
  }

  const selectedCount = previewSteps.filter((e) => !excludedKeys.has(e.key)).length;

  const canProceedToPreview = name.trim() && projectTypes.length > 0;

  async function handleCreate() {
    if (!canProceedToPreview) return;
    setSubmitting(true);
    try {
      const project = await createProject({
        name: name.trim(),
        projectNumber,
        customerName,
        siteAddress,
        coordinatorGroup,
        projectTypes,
        excludedStepKeys: [...excludedKeys],
      });
      onCreated(project);
    } catch (err) {
      console.error("[NewProjectModal] createProject failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Details form ─────────────────────────────────────────────────────────────
  if (modalStep === "form") {
    return (
      <Modal open onClose={onClose}>
        <h2 className="mb-1 text-lg font-semibold">New Project</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Enter the project details before reviewing its workflow.
        </p>

        <div className="grid gap-3">
          <Field label="Project Name">
            <input
              className={FIELD_INPUT_CLASS}
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </Field>
          <Field label="Project Number">
            <input
              className={FIELD_INPUT_CLASS}
              value={projectNumber}
              onChange={(e) => setProjectNumber(e.target.value)}
            />
          </Field>
          <Field label="Customer">
            <input
              className={FIELD_INPUT_CLASS}
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
            />
          </Field>
          <Field label="Site Address">
            <input
              className={FIELD_INPUT_CLASS}
              value={siteAddress}
              onChange={(e) => setSiteAddress(e.target.value)}
            />
          </Field>
          <Field label="Coordinator Group">
            <select
              className={FIELD_INPUT_CLASS}
              value={coordinatorGroup}
              onChange={(e) => setCoordinatorGroup(e.target.value)}
            >
              <option>Project Coordination Team</option>
              <option>Procurement Team</option>
              <option>NEXT Operations</option>
            </select>
          </Field>
          <div>
            <div className="mb-1.5 text-xs font-semibold text-muted-foreground">
              Project Type <span className="text-destructive">*</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {PROJECT_TYPES.map((type) => (
                <label
                  key={type}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                    projectTypes.includes(type)
                      ? "border-primary bg-primary/5 text-foreground"
                      : "border-input text-muted-foreground hover:border-muted-foreground"
                  )}
                >
                  <input
                    type="checkbox"
                    className="size-3.5 accent-primary"
                    checked={projectTypes.includes(type)}
                    onChange={() => toggleType(type)}
                  />
                  {type}
                </label>
              ))}
            </div>
            {projectTypes.length === 0 && (
              <p className="mt-1 text-xs text-destructive">Select at least one project type.</p>
            )}
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => setModalStep("preview")}
            disabled={!canProceedToPreview}
          >
            Review Workflow →
          </Button>
        </div>
      </Modal>
    );
  }

  // ── Workflow preview ──────────────────────────────────────────────────────────
  return (
    <Modal open onClose={onClose} className="flex flex-col max-h-[90vh]">
      {/* Fixed header */}
      <div className="shrink-0">
        <h2 className="mb-1 text-lg font-semibold">Review Workflow</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          These workflow steps will be added to <strong>{name}</strong>. Deselect any steps you
          don&apos;t need before creating the project.
        </p>
      </div>

      {/* Scrollable steps list — fills all remaining vertical space */}
      <div className="flex-1 min-h-0 overflow-y-auto space-y-3 pr-1 -mr-1">
        {previewBySectionEntry.map(({ section, label, steps }) => {
          const selectableSteps = steps.filter((e) => !NON_DESELECTABLE.has(e.key));
          const allSelected = selectableSteps.every((e) => !excludedKeys.has(e.key));

          return (
            <div key={section} className="rounded-lg border bg-card">
              {/* Section header */}
              <div className="flex items-center justify-between border-b bg-muted/10 px-3 py-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {label}
                </span>
                {selectableSteps.length > 0 && (
                  <button
                    type="button"
                    onClick={() => toggleSection(section)}
                    className="text-xs text-primary hover:underline underline-offset-2"
                  >
                    {allSelected ? "Deselect all" : "Select all"}
                  </button>
                )}
              </div>

              {/* Steps */}
              <div className="divide-y">
                {steps.map((entry) => {
                  const locked = NON_DESELECTABLE.has(entry.key);
                  const selected = locked || !excludedKeys.has(entry.key);
                  return (
                    <div
                      key={entry.key}
                      className={cn(
                        "flex items-center gap-2.5 px-3 py-2.5",
                        !locked && "cursor-pointer hover:bg-muted/10 transition-colors",
                        !selected && "opacity-50"
                      )}
                      onClick={() => !locked && toggleStep(entry.key)}
                    >
                      <span
                        className={cn(
                          "flex-none",
                          selected ? "text-primary" : "text-muted-foreground/40",
                          locked && "text-muted-foreground/30"
                        )}
                      >
                        {selected ? (
                          <CheckSquare className="size-4" />
                        ) : (
                          <Square className="size-4" />
                        )}
                      </span>
                      <span
                        className={cn(
                          "flex-1 text-sm",
                          !selected && "line-through text-muted-foreground"
                        )}
                      >
                        {entry.name}
                      </span>
                      {locked && (
                        <span className="text-xs text-muted-foreground">auto-completed</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Fixed footer */}
      <div className="mt-4 shrink-0 flex items-center justify-between border-t pt-4">
        <span className="text-sm text-muted-foreground">
          {selectedCount} step{selectedCount !== 1 ? "s" : ""} selected
        </span>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setModalStep("form")} disabled={submitting}>
            ← Back
          </Button>
          <Button
            onClick={handleCreate}
            disabled={submitting || selectedCount === 0}
          >
            {submitting ? "Creating…" : "Create Project"}
          </Button>
        </div>
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
