"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { UserSelect } from "@/components/shared/UserSelect";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { updateProject } from "@/lib/data/projects";
import type { Project } from "@/types/project";

const FIELD_INPUT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary";

interface EditProjectOverviewModalProps {
  project: Project;
  onClose: () => void;
  onSaved: (project: Project) => void;
}

export function EditProjectOverviewModal({ project, onClose, onSaved }: EditProjectOverviewModalProps) {
  const { users } = useUsersContext();
  const [contractValue, setContractValue] = useState(String(project.contractValue));
  const [grossProfit, setGrossProfit] = useState(String(project.grossProfit));
  const [fieldProjectManagerId, setFieldProjectManagerId] = useState(project.fieldProjectManagerId);
  const [solutionsEngineerId, setSolutionsEngineerId] = useState(project.solutionsEngineerId);
  const [solutionsExecutiveId, setSolutionsExecutiveId] = useState(project.solutionsExecutiveId);
  const [leadTechnicianId, setLeadTechnicianId] = useState(project.leadTechnicianId);
  const [targetCompletionDate, setTargetCompletionDate] = useState(
    project.targetCompletionDate ? project.targetCompletionDate.slice(0, 10) : ""
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    setSubmitting(true);
    const updated = await updateProject(project.id, {
      contractValue: Number(contractValue) || 0,
      grossProfit: Number(grossProfit) || 0,
      fieldProjectManagerId,
      solutionsEngineerId,
      solutionsExecutiveId,
      leadTechnicianId,
      targetCompletionDate: targetCompletionDate || null,
    });
    onSaved(updated);
  }

  return (
    <Modal open onClose={onClose} className="max-w-2xl">
      <h2 className="mb-1 text-lg font-semibold">Edit Project Overview</h2>
      <p className="mb-4 text-sm text-muted-foreground">Update contract, team, and key dates.</p>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Contract Value">
          <input
            type="number"
            min={0}
            className={FIELD_INPUT_CLASS}
            value={contractValue}
            onChange={(e) => setContractValue(e.target.value)}
          />
        </Field>
        <Field label="Gross Profit">
          <input
            type="number"
            min={0}
            className={FIELD_INPUT_CLASS}
            value={grossProfit}
            onChange={(e) => setGrossProfit(e.target.value)}
          />
        </Field>
        <Field label="Field Project Manager">
          <UserSelect users={users} value={fieldProjectManagerId} onChange={setFieldProjectManagerId} />
        </Field>
        <Field label="Solutions Engineer">
          <UserSelect users={users} value={solutionsEngineerId} onChange={setSolutionsEngineerId} allowNotNeeded />
        </Field>
        <Field label="Solutions Executive">
          <UserSelect users={users} value={solutionsExecutiveId} onChange={setSolutionsExecutiveId} allowNotNeeded />
        </Field>
        <Field label="Lead Technician">
          <UserSelect users={users} value={leadTechnicianId} onChange={setLeadTechnicianId} allowNotNeeded />
        </Field>
        <Field label="Target Completion">
          <input
            type="date"
            className={FIELD_INPUT_CLASS}
            value={targetCompletionDate}
            onChange={(e) => setTargetCompletionDate(e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={submitting}>
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
