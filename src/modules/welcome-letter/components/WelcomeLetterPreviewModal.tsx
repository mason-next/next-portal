"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";

interface WelcomeLetterPreviewModalProps {
  subject: string;
  customerName: string;
  html: string;
  onClose: () => void;
}

export function WelcomeLetterPreviewModal({ subject, customerName, html, onClose }: WelcomeLetterPreviewModalProps) {
  return (
    <Modal open onClose={onClose} className="max-w-3xl">
      <h2 className="mb-1 text-lg font-semibold">Welcome Letter Preview</h2>
      <div className="mb-4 grid grid-cols-[70px_1fr] gap-1.5 text-sm">
        <b>To</b>
        <span>{customerName}</span>
        <b>Subject</b>
        <span>{subject}</span>
      </div>
      <iframe srcDoc={html} title="Welcome letter preview" className="h-[480px] w-full rounded-lg border" />
      <div className="mt-6 flex justify-end">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  );
}
