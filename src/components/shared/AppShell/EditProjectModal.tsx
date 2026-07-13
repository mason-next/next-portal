"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { updateProject } from "@/lib/data/projects";
import type { Project } from "@/types/project";

const FIELD_INPUT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary";

interface EditProjectModalProps {
  project: Project;
  onClose: () => void;
  onSaved: (project: Project) => void;
}

export function EditProjectModal({ project, onClose, onSaved }: EditProjectModalProps) {
  const [name, setName] = useState(project.name);
  const [projectNumber, setProjectNumber] = useState(project.projectNumber);
  const [customerName, setCustomerName] = useState(project.customerName);
  const [siteAddress, setSiteAddress] = useState(project.siteAddress);
  const [coordinatorGroup, setCoordinatorGroup] = useState(project.coordinatorGroup);
  const [connectwiseUrl, setConnectwiseUrl] = useState(project.connectwiseUrl ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    setSubmitting(true);
    const updated = await updateProject(project.id, {
      name,
      projectNumber,
      customerName,
      siteAddress,
      coordinatorGroup,
      connectwiseUrl: connectwiseUrl.trim() || null,
    });
    onSaved(updated);
  }

  return (
    <Modal open onClose={onClose}>
      <h2 className="mb-1 text-lg font-semibold">Edit Project</h2>
      <p className="mb-4 text-sm text-muted-foreground">Update this project&apos;s details.</p>

      <div className="grid gap-3">
        <Field label="Project Name">
          <input className={FIELD_INPUT_CLASS} value={name} onChange={(e) => setName(e.target.value)} />
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
        <Field label="ConnectWise Project URL">
          <input
            type="url"
            className={FIELD_INPUT_CLASS}
            value={connectwiseUrl}
            onChange={(e) => setConnectwiseUrl(e.target.value)}
            placeholder="https://..."
          />
        </Field>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={submitting || !name}>
          {submitting ? "Saving…" : "Save Changes"}
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
