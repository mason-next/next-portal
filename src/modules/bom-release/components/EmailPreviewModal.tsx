"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface EmailPreviewModalProps {
  subject: string;
  recipients: string;
  html: string;
  plainText: string;
  onClose: () => void;
}

export function EmailPreviewModal({ subject, recipients, html, plainText, onClose }: EmailPreviewModalProps) {
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

  function openMailto() {
    const body = plainText.split("\n\n").slice(1).join("\n\n");
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-3xl rounded-xl border bg-card p-6 shadow-lg">
        <h2 className="mb-1 text-lg font-semibold">Release Email Preview</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Formatted HTML preview. Copy formatted email and paste into Outlook, or use mailto for a
          plain-text draft.
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
          <Button onClick={openMailto}>Open Outlook Draft</Button>
        </div>
      </div>
      {toast ? (
        <div className="fixed bottom-6 right-6 rounded-md bg-foreground px-3.5 py-2.5 text-sm text-background shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
