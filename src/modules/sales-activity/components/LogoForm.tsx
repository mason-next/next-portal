"use client";

import { useState } from "react";
import type { SalesLogo } from "@/types/sales";
import { LOGO_STAGES } from "@/types/sales";
import { UserPicker } from "@/components/shared/UserPicker";
import type { AppUser } from "@/types/user";

interface LogoFormProps {
  initial?: Partial<SalesLogo>;
  onSave: (logo: Partial<SalesLogo> & { company: string }) => void;
  onCancel: () => void;
}

export function LogoForm({ initial, onSave, onCancel }: LogoFormProps) {
  const [company, setCompany] = useState(initial?.company ?? "");
  const [domain, setDomain] = useState(initial?.domain ?? "");
  const [stage, setStage] = useState<string>(initial?.stage ?? "Prospecting");
  const [owner, setOwner] = useState<AppUser | null>(null);
  const [notes, setNotes] = useState(initial?.notes ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!company.trim()) return;
    onSave({
      ...(initial?.id ? { id: initial.id } : {}),
      company: company.trim(),
      domain: domain.trim(),
      stage: stage as SalesLogo["stage"],
      ownerName: owner?.name ?? "",
      notes,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="space-y-1 col-span-2">
          <span className="text-xs font-medium text-muted-foreground">Company Name *</span>
          <input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            required
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="Acme Corporation"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Domain (for logo)</span>
          <input
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            placeholder="acme.com"
          />
        </label>
        <label className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Stage</span>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {LOGO_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <div className="space-y-1 col-span-2">
          <span className="text-xs font-medium text-muted-foreground">Owner / Rep</span>
          <UserPicker
            value={owner?.id ?? ""}
            onChange={(u) => setOwner(u)}
            placeholder="Assign to a user…"
          />
        </div>
        <label className="space-y-1 col-span-2">
          <span className="text-xs font-medium text-muted-foreground">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Context, contacts, next steps…"
          />
        </label>
      </div>
      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
        <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          {initial?.id ? "Save Changes" : "Add Company"}
        </button>
      </div>
    </form>
  );
}
