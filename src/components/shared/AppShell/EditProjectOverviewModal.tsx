"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { UserSelect } from "@/components/shared/UserSelect";
import { TechnicianMultiSelect } from "@/components/shared/TechnicianMultiSelect";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { updateProject } from "@/lib/data/projects";
import { setProjectTechnicians } from "@/lib/data/subcontractors";
import type { Project } from "@/types/project";
import type { ProjectTechnicianEntry } from "@/types/subcontractor";

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
  const [seniorInsideId, setSeniorInsideId] = useState(project.seniorInsideId);
  const [insidePMId, setInsidePMId] = useState(project.insidePMId);
  const [solutionsEngineerId, setSolutionsEngineerId] = useState(project.solutionsEngineerId);
  const [solutionsExecutiveId, setSolutionsExecutiveId] = useState(project.solutionsExecutiveId);
  const [technicians, setTechnicians] = useState<ProjectTechnicianEntry[]>(project.technicians);
  const [technicianNotNeeded, setTechnicianNotNeeded] = useState(project.technicianNotNeeded);
  const [targetCompletionDate, setTargetCompletionDate] = useState(
    project.targetCompletionDate ? project.targetCompletionDate.slice(0, 10) : ""
  );
  const [submitting, setSubmitting] = useState(false);

  async function handleSave() {
    setSubmitting(true);
    const [updated] = await Promise.all([
      updateProject(project.id, {
        contractValue: Number(contractValue) || 0,
        grossProfit: Number(grossProfit) || 0,
        fieldProjectManagerId,
        seniorInsideId,
        insidePMId,
        solutionsEngineerId,
        solutionsExecutiveId,
        technicianNotNeeded,
        targetCompletionDate: targetCompletionDate || null,
      }),
      setProjectTechnicians(
        project.id,
        technicians.map((t) => ({ userId: t.userId, subcontractorId: t.subcontractorId }))
      ),
    ]);
    onSaved({ ...updated, technicians, technicianNotNeeded });
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
        <Field label="Solution Project Manager">
          <UserSelect users={users} value={fieldProjectManagerId} onChange={setFieldProjectManagerId} />
        </Field>
        <Field label="Senior Inside Project Manager">
          <UserSelect users={users} value={seniorInsideId} onChange={setSeniorInsideId} allowNotNeeded />
        </Field>
        <Field label="Inside Project Manager">
          <UserSelect users={users} value={insidePMId} onChange={setInsidePMId} allowNotNeeded />
        </Field>
        <Field label="Solutions Engineer">
          <UserSelect users={users} value={solutionsEngineerId} onChange={setSolutionsEngineerId} allowNotNeeded />
        </Field>
        <Field label="Solutions Executive">
          <UserSelect users={users} value={solutionsExecutiveId} onChange={setSolutionsExecutiveId} allowNotNeeded />
        </Field>
        <Field label="Technicians" fullWidth>
          <TechnicianMultiSelect
            users={users}
            value={technicians}
            onChange={(entries) => {
              setTechnicians(entries);
              if (entries.length > 0) setTechnicianNotNeeded(false);
            }}
            notNeeded={technicianNotNeeded}
            onNotNeededChange={setTechnicianNotNeeded}
          />
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

function Field({ label, children, fullWidth }: { label: string; children: ReactNode; fullWidth?: boolean }) {
  return (
    <label className={fullWidth ? "col-span-2 block" : "block"}>
      <div className="mb-1 text-xs font-semibold text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
