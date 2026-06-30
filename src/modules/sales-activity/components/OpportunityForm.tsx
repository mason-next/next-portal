"use client";

import { useEffect, useState } from "react";
import type { SalesCompany, SalesOpportunity, OppStage } from "@/types/sales";
import { OPP_STAGES } from "@/types/sales";
import type { AppUser } from "@/types/user";
import { UserPicker } from "@/components/shared/UserPicker";

type OppInput = Omit<SalesOpportunity, "id" | "createdAt" | "updatedAt" | "company"> & { id?: string };

interface OpportunityFormProps {
  companyId: string;
  companies: SalesCompany[];
  initial?: SalesOpportunity;
  onSave: (data: OppInput) => Promise<void>;
  onDelete?: () => Promise<void>;
  onCancel: () => void;
}

const INPUT_CLASS = "w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

export function OpportunityForm({ companyId, companies, initial, onSave, onDelete, onCancel }: OpportunityFormProps) {
  const [selectedCompanyId, setSelectedCompanyId] = useState(initial?.companyId ?? companyId);
  const [name, setName] = useState(initial?.name ?? "");
  const [stage, setStage] = useState<OppStage>(initial?.stage ?? "Prospecting");
  const [valueDollars, setValueDollars] = useState(initial ? String(Math.round(initial.value / 100)) : "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [closeDate, setCloseDate] = useState(initial?.closeDate?.slice(0, 10) ?? "");
  const [ownerId, setOwnerId] = useState<string>(initial?.ownerId ?? "");
  const [ownerName, setOwnerName] = useState<string>(initial?.ownerName ?? "");
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/users").then((r) => r.json()).then(setAllUsers).catch(() => {});
  }, []);

  function handleOwnerChange(user: AppUser | null) {
    setOwnerId(user?.id ?? "");
    setOwnerName(user?.name ?? "");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onSave({
        id: initial?.id,
        companyId: selectedCompanyId,
        name: name.trim(),
        stage,
        ownerId: ownerId || null,
        ownerName,
        value: Math.round(parseFloat(valueDollars || "0") * 100),
        notes: notes.trim(),
        closeDate: closeDate || null,
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
      <div className="grid grid-cols-2 gap-3">
        <label className="block space-y-1.5 col-span-2">
          <span className="text-xs font-semibold text-muted-foreground">Opportunity Name *</span>
          <input
            className={INPUT_CLASS}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Project ACME – AV System"
            required
            autoFocus
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Company</span>
          <select
            className={INPUT_CLASS}
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
          >
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Stage</span>
          <select
            className={INPUT_CLASS}
            value={stage}
            onChange={(e) => setStage(e.target.value as OppStage)}
          >
            {OPP_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Value ($)</span>
          <input
            type="number"
            min="0"
            step="1000"
            className={INPUT_CLASS}
            value={valueDollars}
            onChange={(e) => setValueDollars(e.target.value)}
            placeholder="0"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-muted-foreground">Close Date</span>
          <input
            type="date"
            className={INPUT_CLASS}
            value={closeDate}
            onChange={(e) => setCloseDate(e.target.value)}
          />
        </label>

        <label className="block space-y-1.5 col-span-2">
          <span className="text-xs font-semibold text-muted-foreground">Owner</span>
          <UserPicker
            value={ownerId}
            onChange={handleOwnerChange}
            users={allUsers}
            placeholder="Assign sales rep…"
          />
        </label>

        <label className="block space-y-1.5 col-span-2">
          <span className="text-xs font-semibold text-muted-foreground">Notes</span>
          <textarea
            className={INPUT_CLASS}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Additional context…"
          />
        </label>
      </div>

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
            {submitting ? "Saving…" : initial ? "Save Changes" : "Add Opportunity"}
          </button>
        </div>
      </div>
    </form>
  );
}
