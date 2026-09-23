"use client";

import { useState } from "react";
import type { SalesLead, LeadStatus } from "@/types/sales";
import { LEAD_STATUSES, LEAD_SOURCES } from "@/types/sales";
import { Field, TextInput, Select, TextArea, OwnerSelect, PrimaryButton, SecondaryButton } from "./ui";

export type LeadInput = Omit<SalesLead, "id" | "createdAt" | "updatedAt" | "convertedCompanyId" | "convertedOpportunityId" | "convertedAt"> & { id?: string };

export function LeadForm({
  initial, isManager, currentUser, territories, verticals, onSave, onCancel, onDelete,
}: {
  initial?: SalesLead;
  isManager: boolean;
  currentUser: string;
  territories: string[];
  verticals: string[];
  onSave: (l: LeadInput) => Promise<unknown>;
  onCancel: () => void;
  onDelete?: () => Promise<unknown>;
}) {
  const [f, setF] = useState<LeadInput>({
    ...(initial?.id ? { id: initial.id } : {}),
    name: initial?.name ?? "",
    companyName: initial?.companyName ?? "",
    title: initial?.title ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    source: initial?.source ?? "",
    status: initial?.status ?? "New",
    ownerId: initial?.ownerId ?? null,
    ownerName: initial ? initial.ownerName : currentUser,
    territory: initial?.territory ?? "",
    vertical: initial?.vertical ?? "",
    estimatedValue: initial?.estimatedValue ?? 0,
    notes: initial?.notes ?? "",
  });
  const [value, setValue] = useState(initial ? String(initial.estimatedValue / 100) : "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof LeadInput>(k: K, v: LeadInput[K]) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...f, estimatedValue: Math.round((parseFloat(value.replace(/[$,]/g, "")) || 0) * 100) });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-base font-semibold">{initial ? "Edit Lead" : "New Lead"}</h2>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Contact name"><TextInput value={f.name} onChange={(e) => set("name", e.target.value)} autoFocus /></Field>
        <Field label="Company"><TextInput value={f.companyName} onChange={(e) => set("companyName", e.target.value)} /></Field>
        <Field label="Title"><TextInput value={f.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Email"><TextInput type="email" value={f.email} onChange={(e) => set("email", e.target.value)} /></Field>
        <Field label="Phone"><TextInput value={f.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
        <Field label="Source">
          <TextInput list="crm-lead-sources-2" value={f.source} onChange={(e) => set("source", e.target.value)} />
          <datalist id="crm-lead-sources-2">{LEAD_SOURCES.map((s) => <option key={s} value={s} />)}</datalist>
        </Field>
        <Field label="Status">
          <Select value={f.status} onChange={(e) => set("status", e.target.value as LeadStatus)}>
            {LEAD_STATUSES.filter((s) => s !== "Converted").map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Owner">
          {isManager ? (
            <OwnerSelect value={f.ownerName} emptyLabel="Unassigned (lead pool)" onChange={(n, id) => setF((p) => ({ ...p, ownerName: n, ownerId: id }))} />
          ) : (
            <Select value={f.ownerName} onChange={(e) => set("ownerName", e.target.value)}>
              <option value="">Unassigned (lead pool)</option>
              <option value={currentUser}>{currentUser}</option>
            </Select>
          )}
        </Field>
        <Field label="Territory">
          <TextInput list="crm-territories-l" value={f.territory} onChange={(e) => set("territory", e.target.value)} />
          <datalist id="crm-territories-l">{territories.map((t) => <option key={t} value={t} />)}</datalist>
        </Field>
        <Field label="Vertical">
          <TextInput list="crm-verticals-l" value={f.vertical} onChange={(e) => set("vertical", e.target.value)} />
          <datalist id="crm-verticals-l">{verticals.map((v) => <option key={v} value={v} />)}</datalist>
        </Field>
        <Field label="Estimated value ($)"><TextInput inputMode="decimal" value={value} onChange={(e) => setValue(e.target.value)} /></Field>
        <Field label="Notes" className="col-span-2"><TextArea rows={3} value={f.notes} onChange={(e) => set("notes", e.target.value)} /></Field>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center justify-between">
        {onDelete ? (
          <button type="button" className="text-xs text-destructive hover:underline" onClick={() => confirm("Delete this lead?") && onDelete()}>Delete lead</button>
        ) : <span />}
        <div className="flex gap-2">
          <SecondaryButton type="button" onClick={onCancel}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving || (!f.name.trim() && !f.companyName.trim())}>{saving ? "Saving…" : initial ? "Save" : "Add lead"}</PrimaryButton>
        </div>
      </div>
    </form>
  );
}
