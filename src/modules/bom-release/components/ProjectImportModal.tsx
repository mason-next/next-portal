"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { updateProject } from "@/lib/data/projects";
import { saveBomRows } from "@/lib/data/bom-rows";
import { buildRowsForNewProject, mergeRowsIntoExisting } from "@/modules/bom-release/lib/bom-merge";
import type { ParsedBomRow } from "@/modules/bom-release/lib/csv-parser";
import type { BomRow } from "@/types/bom";
import type { Project } from "@/types/project";

const FIELD_INPUT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary";

interface ProjectImportModalProps {
  project: Project;
  existingRows: BomRow[];
  pendingRows: ParsedBomRow[];
  onClose: () => void;
  onImported: () => void;
}

export function ProjectImportModal({
  project,
  existingRows,
  pendingRows,
  onClose,
  onImported,
}: ProjectImportModalProps) {
  const isFirstImport = existingRows.length === 0;
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(project.name);
  const [projectNumber, setProjectNumber] = useState(project.projectNumber);
  const [customerName, setCustomerName] = useState(project.customerName);
  const [coordinatorGroup, setCoordinatorGroup] = useState(project.coordinatorGroup);

  async function handleConfirm() {
    setSubmitting(true);
    const now = new Date().toISOString();

    if (isFirstImport) {
      await updateProject(project.id, { name, projectNumber, customerName, coordinatorGroup });
      await saveBomRows(project.id, buildRowsForNewProject(pendingRows, now));
    } else {
      await saveBomRows(project.id, mergeRowsIntoExisting(existingRows, pendingRows, now));
    }

    onImported();
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-lg">
        {isFirstImport ? (
          <>
            <h2 className="mb-1 text-lg font-semibold">Set Up Project &amp; Load BOM</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Confirm the project details before loading {pendingRows.length} row
              {pendingRows.length === 1 ? "" : "s"}.
            </p>
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
          </>
        ) : (
          <>
            <h2 className="mb-1 text-lg font-semibold">Update This Project&apos;s BOM</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              {pendingRows.length} imported row{pendingRows.length === 1 ? "" : "s"} will be merged into the
              existing BOM: matched first by sequence, then by part number. Unmatched rows are added as new
              lines. Matched rows are overwritten with the imported values.
            </p>
          </>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={submitting || (isFirstImport && !name)}>
            {submitting ? "Loading…" : "Load BOM"}
          </Button>
        </div>
      </div>
    </div>
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
