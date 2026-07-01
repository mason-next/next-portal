"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { createProject } from "@/lib/data/projects";
import { PROJECT_TYPES } from "@/modules/project-command-center/lib/workflow-steps";
import type { Project } from "@/types/project";

const FIELD_INPUT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary";

interface NewProjectModalProps {
  onClose: () => void;
  onCreated: (project: Project) => void;
}

export function NewProjectModal({ onClose, onCreated }: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [projectNumber, setProjectNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [siteAddress, setSiteAddress] = useState("");
  const [coordinatorGroup, setCoordinatorGroup] = useState("Project Coordination Team");
  const [projectTypes, setProjectTypes] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  function toggleType(type: string) {
    setProjectTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  const canSubmit = name.trim() && projectTypes.length > 0;

  async function handleCreate() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const project = await createProject({
        name: name.trim(),
        projectNumber,
        customerName,
        siteAddress,
        coordinatorGroup,
        projectTypes,
      });
      onCreated(project);
    } catch (err) {
      console.error("[NewProjectModal] createProject failed:", err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose}>
      <h2 className="mb-1 text-lg font-semibold">New Project</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Enter the project details before loading its BOM.
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
                className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                  projectTypes.includes(type)
                    ? "border-primary bg-primary/5 text-foreground"
                    : "border-input text-muted-foreground hover:border-muted-foreground"
                }`}
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
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={submitting || !canSubmit}>
          {submitting ? "Creating…" : "Create Project"}
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
