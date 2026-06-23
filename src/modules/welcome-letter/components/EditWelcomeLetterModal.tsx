"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import type { WelcomeLetterOverrides } from "@/modules/email-templates/templates/welcome-letter";

const FIELD_INPUT_CLASS =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary";

interface EditWelcomeLetterModalProps {
  greeting: string;
  intro: string[];
  closing: string[];
  onClose: () => void;
  onSave: (overrides: WelcomeLetterOverrides) => void;
}

function toParagraphs(value: string): string[] {
  return value
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function EditWelcomeLetterModal({
  greeting,
  intro,
  closing,
  onClose,
  onSave,
}: EditWelcomeLetterModalProps) {
  const [greetingText, setGreetingText] = useState(greeting);
  const [introText, setIntroText] = useState(intro.join("\n\n"));
  const [closingText, setClosingText] = useState(closing.join("\n\n"));

  function handleSave() {
    onSave({
      greeting: greetingText,
      intro: toParagraphs(introText),
      closing: toParagraphs(closingText),
    });
    onClose();
  }

  return (
    <Modal open onClose={onClose} className="max-w-2xl">
      <h2 className="mb-1 text-lg font-semibold">Edit Email</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Adjust the headline and the opening/closing copy. The project team section stays generated from the
        Project Overview assignments.
      </p>

      <div className="grid gap-3">
        <Field label="Headline">
          <input className={FIELD_INPUT_CLASS} value={greetingText} onChange={(e) => setGreetingText(e.target.value)} />
        </Field>
        <Field label="Intro (separate paragraphs with a blank line)">
          <textarea
            className={FIELD_INPUT_CLASS}
            rows={5}
            value={introText}
            onChange={(e) => setIntroText(e.target.value)}
          />
        </Field>
        <Field label="Closing (separate paragraphs with a blank line)">
          <textarea
            className={FIELD_INPUT_CLASS}
            rows={5}
            value={closingText}
            onChange={(e) => setClosingText(e.target.value)}
          />
        </Field>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Changes</Button>
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
