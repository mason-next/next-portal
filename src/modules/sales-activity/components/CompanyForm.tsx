"use client";

import { useState } from "react";
import type { SalesCompany } from "@/types/sales";

interface CompanyFormProps {
  initial?: Partial<SalesCompany>;
  onSave: (data: Omit<SalesCompany, "id" | "createdAt" | "updatedAt" | "opportunities"> & { id?: string }) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export function CompanyForm({ initial, onSave, onDelete, onCancel }: CompanyFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [domain, setDomain] = useState(initial?.domain ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      ...(initial?.id ? { id: initial.id } : {}),
      name: name.trim(),
      domain: domain.trim().toLowerCase(),
      notes,
      dealDeskId: initial?.dealDeskId ?? null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Company Name *</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="City of Coral Gables"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Website Domain</span>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="coralgables.com"
          />
          <p className="text-xs text-muted-foreground">Used to auto-load the company logo</p>
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Background, key contacts, context…"
          />
        </label>
      </div>
      <div className="flex items-center justify-between pt-1">
        {onDelete ? (
          <button
            type="button"
            onClick={() => confirm(`Remove ${initial?.name ?? "this company"} and all its opportunities?`) && onDelete()}
            className="text-xs text-destructive hover:underline"
          >
            Delete company
          </button>
        ) : <span />}
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            {initial?.id ? "Save Changes" : "Add Company"}
          </button>
        </div>
      </div>
    </form>
  );
}
