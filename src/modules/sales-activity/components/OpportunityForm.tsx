"use client";

import { useState } from "react";
import type { SalesOpportunity, SalesCompany } from "@/types/sales";
import { OPP_STAGES } from "@/types/sales";
import { UserPicker } from "@/components/shared/UserPicker";
import type { AppUser } from "@/types/user";

interface OpportunityFormProps {
  companyId: string;
  companies: SalesCompany[];
  initial?: Partial<SalesOpportunity>;
  onSave: (data: Omit<SalesOpportunity, "id" | "createdAt" | "updatedAt" | "company"> & { id?: string }) => void;
  onDelete?: () => void;
  onCancel: () => void;
}

export function OpportunityForm({ companyId, companies, initial, onSave, onDelete, onCancel }: OpportunityFormProps) {
  const isCW = Boolean(initial?.cwNumber);
  const [selectedCompanyId, setSelectedCompanyId] = useState(initial?.companyId ?? companyId);
  const [name, setName] = useState(initial?.name ?? "");
  const [stage, setStage] = useState<SalesOpportunity["stage"]>(initial?.stage ?? "Prospecting");
  const [owner, setOwner] = useState<AppUser | null>(null);
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [closeDate, setCloseDate] = useState(
    initial?.closeDate ? initial.closeDate.slice(0, 10) : ""
  );

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      ...(initial?.id ? { id: initial.id } : {}),
      companyId: selectedCompanyId,
      name: name.trim(),
      stage,
      ownerId: owner?.id ?? initial?.ownerId ?? null,
      ownerName: owner?.name ?? initial?.ownerName ?? "",
      value: initial?.value ?? 0,
      notes,
      closeDate: closeDate || null,
      cwNumber: initial?.cwNumber ?? null,
      proposalCreatedAt: initial?.proposalCreatedAt ?? null,
      rating: initial?.rating ?? null,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {isCW && (
        <div className="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
          Imported from ConnectWise · CW#{initial?.cwNumber} — name and value are managed by CW
        </div>
      )}
      <div className="space-y-3">
        {companies.length > 1 && (
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Company</span>
            <select
              value={selectedCompanyId}
              onChange={(e) => setSelectedCompanyId(e.target.value)}
              disabled={isCW}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
        )}
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Opportunity Name {!isCW && "*"}</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required={!isCW}
            readOnly={isCW}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring read-only:opacity-60 read-only:cursor-not-allowed"
            placeholder="Network Infrastructure Refresh"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Stage</span>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as SalesOpportunity["stage"])}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {OPP_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </label>
        </div>
        <div className="space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Owner / Rep</span>
          <UserPicker
            value={owner?.id ?? ""}
            onChange={(u) => setOwner(u)}
            placeholder={initial?.ownerName || "Assign to a user…"}
          />
        </div>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Expected / Close Date</span>
          <input
            type="date"
            value={closeDate}
            onChange={(e) => setCloseDate(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-xs font-medium text-muted-foreground">Notes</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            placeholder="Context, next steps, key requirements…"
          />
        </label>
      </div>
      <div className="flex items-center justify-between pt-1">
        {onDelete ? (
          <button
            type="button"
            onClick={() => confirm(`Remove "${initial?.name ?? "this opportunity"}"?`) && onDelete()}
            className="text-xs text-destructive hover:underline"
          >
            Delete opportunity
          </button>
        ) : <span />}
        <div className="flex gap-2">
          <button type="button" onClick={onCancel} className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors">Cancel</button>
          <button type="submit" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
            {initial?.id ? "Save Changes" : "Add Opportunity"}
          </button>
        </div>
      </div>
    </form>
  );
}
