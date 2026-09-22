"use client";

import { useState } from "react";
import type { SalesCompany, AccountStatus } from "@/types/sales";
import { ACCOUNT_STATUSES } from "@/types/sales";
import { Field, TextInput, Select, TextArea, OwnerSelect, PrimaryButton, SecondaryButton } from "./ui";

export type AccountInput = Omit<SalesCompany, "id" | "createdAt" | "updatedAt" | "opportunities"> & { id?: string };

export function AccountForm({
  initial, canAssignOwner, currentUser, territories, verticals, onSave, onCancel, onDelete,
}: {
  initial?: SalesCompany;
  /** Managers can pick any owner; reps can only take the account or leave it unassigned. */
  canAssignOwner: boolean;
  currentUser: string;
  territories: string[];
  verticals: string[];
  onSave: (data: AccountInput) => Promise<unknown>;
  onCancel: () => void;
  onDelete?: () => Promise<unknown>;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [domain, setDomain] = useState(initial?.domain ?? "");
  const [ownerName, setOwnerName] = useState(initial ? (initial.ownerName ?? "") : currentUser);
  const [ownerId, setOwnerId] = useState<string | null>(initial?.ownerId ?? null);
  const [status, setStatus] = useState<AccountStatus>(initial?.accountStatus ?? "Prospect");
  const [territory, setTerritory] = useState(initial?.territory ?? "");
  const [vertical, setVertical] = useState(initial?.vertical ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ownedBySomeoneElse = !!initial?.ownerName && initial.ownerName !== currentUser;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({
        ...(initial?.id ? { id: initial.id } : {}),
        name: name.trim(),
        domain,
        notes: initial?.notes ?? "",
        dealDeskId: initial?.dealDeskId ?? null,
        ownerName,
        ownerId,
        accountStatus: status,
        territory,
        vertical,
        phone,
        address,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-base font-semibold">{initial ? "Edit Account" : "New Account"}</h2>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Account name *" className="col-span-2">
          <TextInput value={name} onChange={(e) => setName(e.target.value)} required autoFocus placeholder="Acme Corp" />
        </Field>
        <Field label="Website domain">
          <TextInput value={domain} onChange={(e) => setDomain(e.target.value)} placeholder="acme.com" />
        </Field>
        <Field label="Status">
          <Select value={status} onChange={(e) => setStatus(e.target.value as AccountStatus)}>
            {ACCOUNT_STATUSES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Account owner">
          {canAssignOwner ? (
            <OwnerSelect value={ownerName} onChange={(n, id) => { setOwnerName(n); setOwnerId(id); }} />
          ) : (
            <Select
              value={ownerName}
              disabled={ownedBySomeoneElse}
              onChange={(e) => { setOwnerName(e.target.value); setOwnerId(null); }}
            >
              <option value="">Unassigned</option>
              {ownedBySomeoneElse && <option value={initial!.ownerName}>{initial!.ownerName}</option>}
              <option value={currentUser}>{currentUser}</option>
            </Select>
          )}
        </Field>
        <Field label="Phone">
          <TextInput value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(555) 555-5555" />
        </Field>
        <Field label="Territory">
          <TextInput list="crm-territories" value={territory} onChange={(e) => setTerritory(e.target.value)} placeholder="e.g. Southeast" />
          <datalist id="crm-territories">{territories.map((t) => <option key={t} value={t} />)}</datalist>
        </Field>
        <Field label="Vertical">
          <TextInput list="crm-verticals" value={vertical} onChange={(e) => setVertical(e.target.value)} placeholder="e.g. Healthcare" />
          <datalist id="crm-verticals">{verticals.map((v) => <option key={v} value={v} />)}</datalist>
        </Field>
        <Field label="Address" className="col-span-2">
          <TextArea rows={2} value={address} onChange={(e) => setAddress(e.target.value)} />
        </Field>
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <div className="flex items-center justify-between">
        {onDelete ? (
          <button type="button" className="text-xs text-destructive hover:underline"
            onClick={() => confirm(`Delete "${initial?.name}" and ALL its opportunities, notes and tasks?`) && onDelete()}>
            Delete account
          </button>
        ) : <span />}
        <div className="flex gap-2">
          <SecondaryButton type="button" onClick={onCancel}>Cancel</SecondaryButton>
          <PrimaryButton type="submit" disabled={saving}>{saving ? "Saving…" : initial ? "Save" : "Create account"}</PrimaryButton>
        </div>
      </div>
    </form>
  );
}
