"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { deleteProject } from "@/lib/data/projects";
import type { Project } from "@/types/project";

interface DeleteProjectModalProps {
  project: Project;
  onClose: () => void;
  onDeleted: () => void;
}

export function DeleteProjectModal({ project, onClose, onDeleted }: DeleteProjectModalProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleDelete() {
    setSubmitting(true);
    await deleteProject(project.id);
    onDeleted();
  }

  return (
    <Modal open onClose={onClose}>
      <h2 className="mb-1 text-lg font-semibold">Delete Project</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        This will permanently delete <span className="font-semibold text-foreground">{project.name}</span>,
        including its BOM and any releases. This cannot be undone.
      </p>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button variant="destructive" onClick={handleDelete} disabled={submitting}>
          {submitting ? "Deleting…" : "Delete Project"}
        </Button>
      </div>
    </Modal>
  );
}
