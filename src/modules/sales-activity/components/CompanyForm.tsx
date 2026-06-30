"use client";

import { useState } from "react";
import type { SalesCompany } from "@/types/sales";

type CompanyInput = Omit<SalesCompany, "id" | "createdAt" | "updatedAt" | "opportunities"> & { id?: string };

interface CompanyFormProps {
  initial?: SalesCompany;
  onSave: (data: CompanyInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}

const INPUT_CLASS = "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function CompanyForm({ initial, onSave, onDelete, onCancel }: CompanyFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [domain, setDomain] = useState(initial?.domain ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSave({
        id: initial?.id,
        name: name.trim(),
        domain: domain.trim(),
        notes: notes.trim(),
        dealDeskId: initial?.dealDeskId ?? null,
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!onDelete) return;
    setSubmitting(true);
    try {
      await onDelete();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">Company Name *</span>
        <input
          className={INPUT_CLASS}
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Acme Corp"
          required
          autoFocus
        />
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">Domain</span>
        <input
          className={INPUT_CLASS}
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="acme.com"
        />
        <p className="text-xs text-muted-foreground">Used to show company logo</p>
      </label>

      <label className="block space-y-1.5">
        <span className="text-xs font-semibold text-muted-foreground">Notes</span>
        <textarea
          className={INPUT_CLASS}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Context, key contacts, background…"
        />
      </label>

      <div className="flex justify-between gap-2 pt-2">
        {onDelete && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={submitting}
            className="rounded-md px-3 py-2 text-sm font-medium text-destructive border border-destructive/30 hover:bg-destructive/10 transition-colors disabled:opacity-50"
          >
            Delete
          </button>
        )}
        <div className="flex gap-2 ml-auto">
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !name.trim()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {submitting ? "Saving…" : initial ? "Save Changes" : "Add Company"}
          </button>
        </div>
      </div>
    </form>
  );
}
