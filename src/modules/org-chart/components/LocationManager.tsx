"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Check, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { OrgLocation, CreateLocationInput } from "../lib/types";
import {
  createOrgLocation,
  updateOrgLocation,
  deleteOrgLocation,
} from "../lib/actions";

interface LocationManagerProps {
  locations: OrgLocation[];
}

const EMPTY_FORM = { name: "", address: "", city: "", state: "", region: "" };

export function LocationManager({ locations }: LocationManagerProps) {
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [addingNew, setAddingNew] = useState(false);
  const [newForm, setNewForm] = useState(EMPTY_FORM);
  const [editForm, setEditForm] = useState(EMPTY_FORM);

  function startEdit(loc: OrgLocation) {
    setEditingId(loc.id);
    setEditForm({
      name: loc.name,
      address: loc.address ?? "",
      city: loc.city ?? "",
      state: loc.state ?? "",
      region: loc.region ?? "",
    });
  }

  function handleCreate() {
    if (!newForm.name.trim()) return;
    startTransition(async () => {
      const input: CreateLocationInput = {
        name: newForm.name.trim(),
        address: newForm.address.trim() || null,
        city: newForm.city.trim() || null,
        state: newForm.state.trim() || null,
        region: newForm.region.trim() || null,
      };
      await createOrgLocation(input);
      setNewForm(EMPTY_FORM);
      setAddingNew(false);
    });
  }

  function handleUpdate(id: string) {
    if (!editForm.name.trim()) return;
    startTransition(async () => {
      await updateOrgLocation(id, {
        name: editForm.name.trim(),
        address: editForm.address.trim() || null,
        city: editForm.city.trim() || null,
        state: editForm.state.trim() || null,
        region: editForm.region.trim() || null,
      });
      setEditingId(null);
    });
  }

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete location "${name}"? Positions linked to it will become unlinked.`)) return;
    startTransition(async () => {
      await deleteOrgLocation(id);
    });
  }

  function locationSummary(loc: OrgLocation) {
    const parts = [loc.city, loc.state].filter(Boolean).join(", ");
    return parts || loc.address || null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Locations</h3>
        {!addingNew && (
          <Button size="sm" variant="ghost" onClick={() => setAddingNew(true)}>
            <Plus className="mr-1 size-3.5" />
            Add Location
          </Button>
        )}
      </div>

      {addingNew && (
        <LocationForm
          form={newForm}
          onChange={setNewForm}
          onSave={handleCreate}
          onCancel={() => { setAddingNew(false); setNewForm(EMPTY_FORM); }}
          isPending={isPending}
          saveLabel="Create"
        />
      )}

      {locations.length === 0 && !addingNew ? (
        <div className="rounded-xl border bg-card py-8 text-center text-sm text-muted-foreground">
          No locations yet.
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden shadow-sm divide-y">
          {locations.map((loc) => (
            <div key={loc.id} className="px-4 py-3">
              {editingId === loc.id ? (
                <LocationForm
                  form={editForm}
                  onChange={setEditForm}
                  onSave={() => handleUpdate(loc.id)}
                  onCancel={() => setEditingId(null)}
                  isPending={isPending}
                  saveLabel="Save"
                />
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <MapPin className="size-3.5 text-muted-foreground flex-none" />
                    <div>
                      <span className="text-sm font-medium">{loc.name}</span>
                      {locationSummary(loc) && (
                        <p className="text-xs text-muted-foreground mt-0.5">{locationSummary(loc)}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 flex-none">
                    <button
                      type="button"
                      onClick={() => startEdit(loc)}
                      className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Pencil className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(loc.id, loc.name)}
                      disabled={isPending}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Reusable form rows ───────────────────────────────────────────────────────

type FormState = typeof EMPTY_FORM;

function LocationForm({
  form,
  onChange,
  onSave,
  onCancel,
  isPending,
  saveLabel,
}: {
  form: FormState;
  onChange: (f: FormState) => void;
  onSave: () => void;
  onCancel: () => void;
  isPending: boolean;
  saveLabel: string;
}) {
  function set(field: keyof FormState, value: string) {
    onChange({ ...form, [field]: value });
  }

  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <input
        type="text"
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
        placeholder="Location name *"
        autoFocus
        className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={form.city}
          onChange={(e) => set("city", e.target.value)}
          placeholder="City"
          className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <input
          type="text"
          value={form.state}
          onChange={(e) => set("state", e.target.value)}
          placeholder="State"
          className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <input
        type="text"
        value={form.region}
        onChange={(e) => set("region", e.target.value)}
        placeholder="Region (optional)"
        className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={onSave} disabled={isPending || !form.name.trim()}>
          <Check className="mr-1 size-3.5" />
          {saveLabel}
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
