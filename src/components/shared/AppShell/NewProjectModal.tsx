"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { createProject } from "@/lib/data/projects";
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
  const [submitting, setSubmitting] = useState(false);

  async function handleCreate() {
    setSubmitting(true);
    try {
      const project = await createProject({ name, projectNumber, customerName, siteAddress, coordinatorGroup });
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
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleCreate} disabled={submitting || !name}>
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
