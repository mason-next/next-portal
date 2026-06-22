"use client";

import { useState } from "react";
import type { jsPDF } from "jspdf";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";

interface EmailPreviewModalProps {
  subject: string;
  recipients: string;
  html: string;
  plainText: string;
  pdf: jsPDF;
  pdfFilename: string;
  onClose: () => void;
}

export function EmailPreviewModal({
  subject,
  recipients,
  html,
  plainText,
  pdf,
  pdfFilename,
  onClose,
}: EmailPreviewModalProps) {
  const [toast, setToast] = useState<string | null>(null);

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 1800);
  }

  async function copyPlainText() {
    await navigator.clipboard.writeText(plainText);
    showToast("Copied plain-text email");
  }

  async function copyFormatted() {
    try {
      const htmlBlob = new Blob([html], { type: "text/html" });
      const textBlob = new Blob([plainText], { type: "text/plain" });
      await navigator.clipboard.write([new ClipboardItem({ "text/html": htmlBlob, "text/plain": textBlob })]);
      showToast("Copied formatted email");
    } catch {
      await navigator.clipboard.writeText(plainText);
      showToast("Formatted copy unavailable — copied plain text");
    }
  }

  function downloadPdf() {
    pdf.save(pdfFilename);
    showToast("Release PDF downloaded");
  }

  // mailto: bodies are plain text only — the protocol has no way to carry HTML, so the
  // same header + table from the preview can't be injected into the draft automatically.
  // Best effort: put the formatted HTML on the clipboard (same as Copy Formatted Email) so
  // pasting into the open draft reproduces the preview exactly, and download the PDF since
  // mailto also has no attachment mechanism.
  async function openMailto() {
    try {
      const htmlBlob = new Blob([html], { type: "text/html" });
      const textBlob = new Blob([plainText], { type: "text/plain" });
      await navigator.clipboard.write([new ClipboardItem({ "text/html": htmlBlob, "text/plain": textBlob })]);
    } catch {
      // Clipboard access denied — the plain-text fallback already in the mailto body below
      // still gives the draft useful content.
    }
    pdf.save(pdfFilename);
    const body = plainText.split("\n\n").slice(1).join("\n\n");
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    showToast(`Draft opened — paste (Ctrl+V) into the body for the formatted email, and attach ${pdfFilename}`);
  }

  return (
    <>
      <Modal open onClose={onClose} className="max-w-3xl">
        <h2 className="mb-1 text-lg font-semibold">Release Email Preview</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Formatted HTML preview. The mailto draft can&apos;t carry HTML or attachments
          automatically — opening it also copies this formatted email to your clipboard and
          downloads the release PDF, so paste (Ctrl+V) into the draft body for the same header
          and table shown here, then attach the PDF.
        </p>
        <div className="mb-4 grid grid-cols-[70px_1fr] gap-1.5 text-sm">
          <b>To</b>
          <span>{recipients}</span>
          <b>Subject</b>
          <span>{subject}</span>
        </div>
        <div
          className="max-h-[420px] overflow-auto rounded-lg border"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button variant="outline" onClick={copyPlainText}>
            Copy Plain Text
          </Button>
          <Button variant="outline" onClick={copyFormatted}>
            Copy Formatted Email
          </Button>
          <Button variant="outline" onClick={downloadPdf}>
            Download Release PDF
          </Button>
          <Button onClick={openMailto}>Open Outlook Draft</Button>
        </div>
      </Modal>
      {toast ? (
        <div className="fixed bottom-6 right-6 rounded-md bg-foreground px-3.5 py-2.5 text-sm text-background shadow-lg">
          {toast}
        </div>
      ) : null}
    </>
  );
}
