"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import type { AddWorkflowStepInput } from "@/lib/data/workflow";
import type { ProjectSectionKey, WorkflowStep } from "@/types/workflow";
import { PROJECT_SECTION_KEYS } from "@/types/workflow";

const SECTION_LABELS: Record<ProjectSectionKey, string> = {
  setup: "Setup",
  engineering: "Engineering",
  procurement: "Procurement",
  implementation: "Implementation",
  closeout: "Closeout",
};

interface AddWorkflowStepModalProps {
  defaultSection?: ProjectSectionKey;
  existingSteps: WorkflowStep[];
  onClose: () => void;
  onAdd: (input: AddWorkflowStepInput) => Promise<void>;
}

export function AddWorkflowStepModal({
  defaultSection,
  existingSteps,
  onClose,
  onAdd,
}: AddWorkflowStepModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [section, setSection] = useState<ProjectSectionKey>(defaultSection ?? "implementation");
  const [dueDate, setDueDate] = useState("");
  const [dependsOnKeys, setDependsOnKeys] = useState<string[]>([]);
  const [completionRule, setCompletionRule] = useState<"manual" | "module">("manual");
  const [submitting, setSubmitting] = useState(false);

  const nameValid = name.trim().length > 0;

  function toggleDep(key: string) {
    setDependsOnKeys((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleAdd() {
    if (!nameValid) return;
    setSubmitting(true);
    try {
      await onAdd({
        section,
        name: name.trim(),
        description: description.trim(),
        dueDate: dueDate || null,
        dependsOnKeys,
        completionRule,
      });
      onClose();
    } finally {
      setSubmitting(false);
    }
  }

  // Steps in other sections that could be dependencies
  const otherSteps = existingSteps.filter((s) => !s.isCustom || s.name);

  return (
    <Modal open onClose={onClose} className="max-w-xl">
      <h2 className="mb-1 text-base font-semibold">Add Workflow Step</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Custom steps are included in the section's completion percentage.
      </p>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Title *</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            placeholder="e.g. Rack installation complete"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        {/* Phase */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Phase</label>
          <select
            value={section}
            onChange={(e) => setSection(e.target.value as ProjectSectionKey)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          >
            {PROJECT_SECTION_KEYS.map((s) => (
              <option key={s} value={s}>{SECTION_LABELS[s]}</option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What does this step entail? (optional)"
            className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        {/* Due date */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Due Date</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </div>

        {/* Completion Rule */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">Completion Rule</label>
          <div className="flex gap-4">
            {(["manual", "module"] as const).map((rule) => (
              <label key={rule} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="completionRule"
                  value={rule}
                  checked={completionRule === rule}
                  onChange={() => setCompletionRule(rule)}
                  className="accent-primary"
                />
                {rule === "manual" ? "Manual — team sets status" : "Auto — computed by module"}
              </label>
            ))}
          </div>
        </div>

        {/* Dependencies */}
        {otherSteps.length > 0 && (
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-muted-foreground">
              Depends On (steps that must be complete first)
            </label>
            <div className="max-h-36 space-y-1 overflow-y-auto rounded-md border border-input bg-background p-2">
              {otherSteps.map((s) => (
                <label key={s.key} className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 hover:bg-accent text-sm">
                  <input
                    type="checkbox"
                    checked={dependsOnKeys.includes(s.key)}
                    onChange={() => toggleDep(s.key)}
                    className="accent-primary"
                  />
                  <span className="text-xs text-muted-foreground mr-1">[{SECTION_LABELS[s.section]}]</span>
                  {s.name}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={submitting}>Cancel</Button>
        <Button onClick={handleAdd} disabled={submitting || !nameValid}>
          {submitting ? "Adding…" : "Add Step"}
        </Button>
      </div>
    </Modal>
  );
}
