"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { createWarehouse, deleteWarehouse, updateWarehouse } from "@/lib/data/warehouses";
import type { Warehouse, WarehouseInput } from "@/types/warehouse";

const FIELD_INPUT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary";

const BLANK: WarehouseInput = {
  name: "", address: "", city: "", state: "", zip: "",
  country: "US", contact: "", phone: "", email: "", notes: "", isActive: true,
};

interface WarehouseFormModalProps {
  warehouse: Warehouse | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function WarehouseFormModal({ warehouse, onClose, onSaved, onDeleted }: WarehouseFormModalProps) {
  const [form, setForm] = useState<WarehouseInput>(
    warehouse
      ? {
          name: warehouse.name,
          address: warehouse.address,
          city: warehouse.city,
          state: warehouse.state,
          zip: warehouse.zip,
          country: warehouse.country,
          contact: warehouse.contact,
          phone: warehouse.phone,
          email: warehouse.email,
          notes: warehouse.notes,
          isActive: warehouse.isActive,
        }
      : BLANK
  );
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState<string | null>(null);

  function set<K extends keyof WarehouseInput>(key: K, value: WarehouseInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      if (warehouse) {
        await updateWarehouse(warehouse.id, form);
      } else {
        await createWarehouse(form);
      }
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!warehouse) return;
    setSubmitting(true);
    try {
      const result = await deleteWarehouse(warehouse.id);
      if (result === "deactivated") {
        setDeleteMsg("This warehouse is referenced by existing releases and has been deactivated instead of deleted.");
        setTimeout(onDeleted, 2000);
      } else {
        onDeleted();
      }
    } finally {
      setSubmitting(false);
    }
  }

  const mapsUrl = [form.address, form.city, form.state, form.zip].filter(Boolean).join(", ");

  return (
    <Modal open onClose={onClose}>
      <h2 className="mb-1 text-lg font-semibold">
        {warehouse ? "Edit Warehouse" : "New Warehouse"}
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Warehouses appear as shipping destinations in the BOM Release workflow.
      </p>

      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Warehouse Name *">
            <input
              className={FIELD_INPUT_CLASS}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              autoFocus
              placeholder="e.g. NY Warehouse"
            />
          </Field>
          <Field label="Country">
            <input
              className={FIELD_INPUT_CLASS}
              value={form.country}
              onChange={(e) => set("country", e.target.value)}
            />
          </Field>
        </div>

        <Field label="Street Address">
          <input
            className={FIELD_INPUT_CLASS}
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="123 Warehouse Blvd"
          />
        </Field>

        <div className="grid grid-cols-3 gap-3">
          <Field label="City">
            <input
              className={FIELD_INPUT_CLASS}
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </Field>
          <Field label="State">
            <input
              className={FIELD_INPUT_CLASS}
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
              placeholder="NY"
            />
          </Field>
          <Field label="ZIP">
            <input
              className={FIELD_INPUT_CLASS}
              value={form.zip}
              onChange={(e) => set("zip", e.target.value)}
            />
          </Field>
        </div>

        {mapsUrl && (
          <a
            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsUrl)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary underline-offset-2 hover:underline"
          >
            View on Google Maps →
          </a>
        )}

        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">
          Contact
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contact Name">
            <input
              className={FIELD_INPUT_CLASS}
              value={form.contact}
              onChange={(e) => set("contact", e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              className={FIELD_INPUT_CLASS}
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Email">
          <input
            type="email"
            className={FIELD_INPUT_CLASS}
            value={form.email}
            onChange={(e) => set("email", e.target.value)}
          />
        </Field>

        <Field label="Notes">
          <textarea
            rows={2}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-none"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={form.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
          />
          Active (appears in release Ship To options)
        </label>
      </div>

      {deleteMsg && (
        <p className="mt-3 text-sm text-amber-600">{deleteMsg}</p>
      )}

      <div className="mt-6 flex justify-end gap-2">
        {warehouse ? (
          confirmDelete ? (
            <div className="mr-auto flex items-center gap-2">
              <span className="text-sm text-destructive font-medium">Delete this warehouse?</span>
              <Button variant="destructive" size="sm" onClick={handleDelete} disabled={submitting}>
                Confirm
              </Button>
              <Button variant="outline" size="sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <Button
              variant="destructive"
              onClick={() => setConfirmDelete(true)}
              disabled={submitting}
              className="mr-auto"
            >
              Delete
            </Button>
          )
        ) : null}
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={submitting || !form.name.trim()}>
          {submitting ? "Saving…" : "Save"}
        </Button>
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
