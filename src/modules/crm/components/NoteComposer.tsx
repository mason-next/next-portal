"use client";

import { useState } from "react";
import type { SalesNote, NoteKind, SalesOpportunity, CompanyContact, NoteAttachment } from "@/types/sales";
import { NOTE_KINDS } from "@/types/sales";
import { CommentAttachmentArea } from "@/components/shared/CommentAttachmentArea";
import { todayInput, toDateInput } from "@/modules/crm/lib/format";
import { Field, TextInput, Select, TextArea, PrimaryButton, SecondaryButton } from "./ui";

export interface NoteInput {
  id?: string;
  companyId: string;
  opportunityId: string | null;
  contactId: string | null;
  noteDate: string;
  kind: NoteKind;
  body: string;
  attachments: NoteAttachment[];
}

/**
 * Log a dated note or customer touchpoint against the account, or against one of
 * its opportunities. The date defaults to today but can be back-dated.
 */
export function NoteComposer({
  companyId, opportunities, contacts, initial, defaultOpportunityId, onSave, onCancel,
}: {
  companyId: string;
  opportunities: Pick<SalesOpportunity, "id" | "name" | "stage">[];
  contacts: Pick<CompanyContact, "id" | "name">[];
  initial?: SalesNote;
  defaultOpportunityId?: string | null;
  onSave: (n: NoteInput) => Promise<unknown>;
  onCancel?: () => void;
}) {
  const [kind, setKind] = useState<NoteKind>(initial?.kind ?? "Note");
  const [noteDate, setNoteDate] = useState(initial ? toDateInput(initial.noteDate) : todayInput());
  const [opportunityId, setOpportunityId] = useState<string>(initial?.opportunityId ?? defaultOpportunityId ?? "");
  const [contactId, setContactId] = useState<string>(initial?.contactId ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [attachments, setAttachments] = useState<NoteAttachment[]>(initial?.attachments ?? []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() && attachments.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...(initial?.id ? { id: initial.id } : {}),
        companyId,
        opportunityId: opportunityId || null,
        contactId: contactId || null,
        noteDate,
        kind,
        body,
        attachments,
      });
      if (!initial) {
        setBody("");
        setAttachments([]);
        setContactId("");
        setKind("Note");
        setNoteDate(todayInput());
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Field label="Type">
          <Select value={kind} onChange={(e) => setKind(e.target.value as NoteKind)}>
            {NOTE_KINDS.map((k) => <option key={k}>{k}</option>)}
          </Select>
        </Field>
        <Field label="Date">
          <TextInput type="date" value={noteDate} onChange={(e) => setNoteDate(e.target.value)} required />
        </Field>
        <Field label="Applies to">
          <Select value={opportunityId} onChange={(e) => setOpportunityId(e.target.value)}>
            <option value="">Company (account-wide)</option>
            {opportunities.map((o) => <option key={o.id} value={o.id}>Opp: {o.name}</option>)}
          </Select>
        </Field>
        <Field label="With contact">
          <Select value={contactId} onChange={(e) => setContactId(e.target.value)}>
            <option value="">—</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </Field>
      </div>
      <TextArea
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What happened? Decisions, concerns, commitments, dates mentioned…"
        aria-label="Note text"
      />
      <CommentAttachmentArea
        attachments={attachments}
        onAdd={(a) => setAttachments((prev) => [...prev, a])}
        onRemove={(i) => setAttachments((prev) => prev.filter((_, idx) => idx !== i))}
        disabled={saving}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        {onCancel && <SecondaryButton type="button" onClick={onCancel}>Cancel</SecondaryButton>}
        <PrimaryButton type="submit" disabled={saving || (!body.trim() && attachments.length === 0)}>
          {saving ? "Saving…" : initial ? "Save note" : "Add note"}
        </PrimaryButton>
      </div>
    </form>
  );
}
