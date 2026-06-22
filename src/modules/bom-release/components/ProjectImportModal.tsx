"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { saveBomRows } from "@/lib/data/bom-rows";
import { buildRowsForNewProject, mergeRowsIntoExisting } from "@/modules/bom-release/lib/bom-merge";
import type { ParsedBomRow } from "@/modules/bom-release/lib/csv-parser";
import type { BomRow } from "@/types/bom";
import type { Project } from "@/types/project";

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

  async function handleConfirm() {
    setSubmitting(true);
    const now = new Date().toISOString();

    if (isFirstImport) {
      await saveBomRows(project.id, buildRowsForNewProject(pendingRows, now));
    } else {
      await saveBomRows(project.id, mergeRowsIntoExisting(existingRows, pendingRows, now));
    }

    onImported();
  }

  return (
    <Modal open onClose={onClose}>
      {isFirstImport ? (
        <>
          <h2 className="mb-1 text-lg font-semibold">Load BOM</h2>
          <p className="mb-4 text-sm text-muted-foreground">
            Load {pendingRows.length} row{pendingRows.length === 1 ? "" : "s"} into the BOM for{" "}
            <span className="font-semibold text-foreground">{project.name}</span>.
          </p>
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
        <Button onClick={handleConfirm} disabled={submitting}>
          {submitting ? "Loading…" : "Load BOM"}
        </Button>
      </div>
    </Modal>
  );
}
