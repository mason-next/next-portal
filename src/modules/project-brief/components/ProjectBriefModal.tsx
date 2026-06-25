"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { buildProjectBriefEmail } from "@/modules/email-templates/templates/project-brief";
import { buildProjectBriefData } from "@/modules/project-brief/lib/build-project-brief";
import type { Project } from "@/types/project";
import type { AppUser } from "@/types/user";
import type { WorkflowStep } from "@/types/workflow";

interface ProjectBriefModalProps {
  project: Project;
  steps: WorkflowStep[];
  users: AppUser[];
  onClose: () => void;
}

export function ProjectBriefModal({ project, steps, users, onClose }: ProjectBriefModalProps) {
  const [toast, setToast] = useState<string | null>(null);

  const data = buildProjectBriefData({ project, steps, users, now: new Date() });
  const email = buildProjectBriefEmail(data);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 1800);
  }

  async function copyHtml() {
    await navigator.clipboard.writeText(email.html);
    showToast("Copied HTML to clipboard");
  }

  async function openMailto() {
    try {
      const htmlBlob = new Blob([email.html], { type: "text/html" });
      const textBlob = new Blob([email.plainText], { type: "text/plain" });
      await navigator.clipboard.write([new ClipboardItem({ "text/html": htmlBlob, "text/plain": textBlob })]);
    } catch {
      // Clipboard access denied — the draft will just open blank with nothing to paste.
    }
    window.location.href = `mailto:?subject=${encodeURIComponent(email.subject)}`;
    showToast("Draft opened — paste (Ctrl+V) into the body for the formatted email");
  }

  function printReport() {
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      showToast("Couldn't open print preview — check your browser's popup blocker");
      return;
    }
    printWindow.document.write(email.html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  return (
    <>
      <Modal open onClose={onClose} className="max-w-3xl">
        <h2 className="mb-1 text-lg font-semibold">Project Brief Report</h2>
        <div className="mb-4 grid grid-cols-[70px_1fr] gap-1.5 text-sm">
          <b>To</b>
          <span>{project.customerName}</span>
          <b>Subject</b>
          <span>{email.subject}</span>
        </div>
        <iframe srcDoc={email.html} title="Project brief report preview" className="h-[480px] w-full rounded-lg border" />
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={printReport}>
            Print / Save as PDF
          </Button>
          <Button variant="outline" onClick={copyHtml}>
            Copy HTML
          </Button>
          <Button variant="outline" onClick={openMailto}>
            Open Outlook Draft
          </Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </Modal>

      {toast ? (
        <div className="fixed bottom-6 right-6 z-30 rounded-md bg-foreground px-3.5 py-2.5 text-sm text-background shadow-lg">
          {toast}
        </div>
      ) : null}
    </>
  );
}
