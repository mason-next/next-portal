"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { saveEquipmentRows } from "@/lib/data/equipment";
import { buildRowsForNewProject, mergeRowsIntoExisting, replaceAllRows } from "@/modules/equipment-tracking/lib/equipment-merge";
import type { ParsedEquipmentRow } from "@/modules/equipment-tracking/lib/csv-parser";
import type { EquipmentRow } from "@/types/equipment";
import type { Project } from "@/types/project";
import { cn } from "@/lib/utils";

type ImportMode = "merge" | "replace";

interface EquipmentImportModalProps {
  project: Project;
  existingRows: EquipmentRow[];
  pendingRows: ParsedEquipmentRow[];
  fileName: string;
  onClose: () => void;
  onImported: (result: { rowCount: number; newCount: number; updatedCount: number; removedCount: number }) => void;
}

export function EquipmentImportModal({
  project,
  existingRows,
  pendingRows,
  fileName,
  onClose,
  onImported,
}: EquipmentImportModalProps) {
  const isFirstImport = existingRows.length === 0;
  const [mode, setMode] = useState<ImportMode>("merge");
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    setSubmitting(true);
    const now = new Date().toISOString();

    if (isFirstImport) {
      const rows = buildRowsForNewProject(pendingRows, now);
      await saveEquipmentRows(project.id, rows);
      onImported({ rowCount: pendingRows.length, newCount: rows.length, updatedCount: 0, removedCount: 0 });
      return;
    }

    const result =
      mode === "replace"
        ? replaceAllRows(existingRows, pendingRows, now)
        : mergeRowsIntoExisting(existingRows, pendingRows, now);
    await saveEquipmentRows(project.id, result.rows);
    onImported({
      rowCount: pendingRows.length,
      newCount: result.newCount,
      updatedCount: result.updatedCount,
      removedCount: result.removedCount,
    });
  }

  return (
    <Modal open onClose={onClose}>
      {isFirstImport ? (
        <>
          <h2 className="mb-1 text-lg font-semibold">Load Equipment List</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Load {pendingRows.length} row{pendingRows.length === 1 ? "" : "s"} from{" "}
            <span className="font-semibold text-foreground">{fileName}</span> into the equipment tracker for{" "}
            <span className="font-semibold text-foreground">{project.name}</span>.
          </p>
        </>
      ) : (
        <>
          <h2 className="mb-1 text-lg font-semibold">Update Equipment Tracking</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            {pendingRows.length} imported row{pendingRows.length === 1 ? "" : "s"} from{" "}
            <span className="font-semibold text-foreground">{fileName}</span>. Choose how to apply it to the
            existing {existingRows.length} row{existingRows.length === 1 ? "" : "s"}.
          </p>

          <div className="space-y-2">
            <label
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3",
                mode === "merge" && "border-primary bg-primary/5"
              )}
            >
              <input
                type="radio"
                name="import-mode"
                checked={mode === "merge"}
                onChange={() => setMode("merge")}
                className="mt-0.5 size-4 accent-primary"
              />
              <span>
                <span className="block text-sm font-semibold">Merge with existing list</span>
                <span className="block text-sm text-muted-foreground">
                  Matched by manufacturer + product: matched rows are overwritten with the imported values and
                  their status recalculated. Unmatched rows are added as new lines. Nothing is deleted.
                </span>
              </span>
            </label>

            <label
              className={cn(
                "flex cursor-pointer items-start gap-2.5 rounded-lg border p-3",
                mode === "replace" && "border-destructive bg-destructive/5"
              )}
            >
              <input
                type="radio"
                name="import-mode"
                checked={mode === "replace"}
                onChange={() => setMode("replace")}
                className="mt-0.5 size-4 accent-destructive"
              />
              <span>
                <span className="block text-sm font-semibold">Replace existing list</span>
                <span className="block text-sm text-muted-foreground">
                  Permanently deletes all {existingRows.length} existing row{existingRows.length === 1 ? "" : "s"}
                  {" "}(and their audit history) and replaces them with only the rows from this file. This cannot
                  be undone.
                </span>
              </span>
            </label>
          </div>
        </>
      )}

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant={mode === "replace" ? "destructive" : "default"} onClick={handleConfirm} disabled={submitting}>
          {submitting ? "Loading…" : mode === "replace" ? "Replace All" : "Load Equipment List"}
        </Button>
      </div>
    </Modal>
  );
}
