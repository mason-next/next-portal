"use client";

import { useState, type ReactNode } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { createSubcontractor, deleteSubcontractor, updateSubcontractor } from "@/lib/data/subcontractors";
import { cn } from "@/lib/utils";
import type { NewSubcontractorInput, Subcontractor } from "@/types/subcontractor";

const FIELD_INPUT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary";

const BLANK: NewSubcontractorInput = {
  name: "", trade: "", contactName: "", contactEmail: "", contactPhone: "",
  location: "", manpower: 0, geographicalReach: "", rating: null, notes: "", isActive: true,
};

interface SubcontractorFormModalProps {
  sub: Subcontractor | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}

export function SubcontractorFormModal({ sub, onClose, onSaved, onDeleted }: SubcontractorFormModalProps) {
  const [form, setForm] = useState<NewSubcontractorInput>(
    sub
      ? {
          name: sub.name, trade: sub.trade, contactName: sub.contactName,
          contactEmail: sub.contactEmail, contactPhone: sub.contactPhone,
          location: sub.location, manpower: sub.manpower,
          geographicalReach: sub.geographicalReach, rating: sub.rating,
          notes: sub.notes, isActive: sub.isActive,
        }
      : BLANK
  );
  const [submitting, setSubmitting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  function set<K extends keyof NewSubcontractorInput>(key: K, value: NewSubcontractorInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim()) return;
    setSubmitting(true);
    try {
      if (sub) {
        await updateSubcontractor(sub.id, form);
      } else {
        await createSubcontractor(form);
      }
      onSaved();
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!sub) return;
    setSubmitting(true);
    try {
      await deleteSubcontractor(sub.id);
      onDeleted();
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose}>
      <h2 className="mb-1 text-lg font-semibold">
        {sub ? "Edit Subcontractor" : "New Subcontractor"}
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Subcontractors can be assigned to projects alongside internal team members.
      </p>

      <div className="grid gap-3">
        {/* Company */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Company Name *">
            <input
              className={FIELD_INPUT_CLASS}
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              autoFocus
            />
          </Field>
          <Field label="Trade / Specialty">
            <input
              className={FIELD_INPUT_CLASS}
              value={form.trade}
              onChange={(e) => set("trade", e.target.value)}
              placeholder="e.g. Electrical, HVAC, Cabling"
            />
          </Field>
        </div>

        {/* Contact */}
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">
          Contact
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Contact Name">
            <input
              className={FIELD_INPUT_CLASS}
              value={form.contactName}
              onChange={(e) => set("contactName", e.target.value)}
            />
          </Field>
          <Field label="Contact Phone">
            <input
              type="tel"
              className={FIELD_INPUT_CLASS}
              value={form.contactPhone}
              onChange={(e) => set("contactPhone", e.target.value)}
            />
          </Field>
        </div>
        <Field label="Contact Email">
          <input
            type="email"
            className={FIELD_INPUT_CLASS}
            value={form.contactEmail}
            onChange={(e) => set("contactEmail", e.target.value)}
          />
        </Field>

        {/* Coverage */}
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide pt-1">
          Coverage &amp; Capacity
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Location">
            <input
              className={FIELD_INPUT_CLASS}
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Miami, FL"
            />
          </Field>
          <Field label="Manpower (workers)">
            <input
              type="number"
              min={0}
              className={FIELD_INPUT_CLASS}
              value={form.manpower || ""}
              onChange={(e) => set("manpower", parseInt(e.target.value) || 0)}
            />
          </Field>
        </div>
        <Field label="Geographical Reach">
          <input
            className={FIELD_INPUT_CLASS}
            value={form.geographicalReach}
            onChange={(e) => set("geographicalReach", e.target.value)}
            placeholder="e.g. South Florida, Southeast US, National"
          />
        </Field>

        {/* Rating */}
        <Field label="Rating">
          <StarRatingInput
            value={form.rating}
            onChange={(v) => set("rating", v)}
          />
        </Field>

        {/* Notes */}
        <Field label="Notes">
          <textarea
            rows={3}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary resize-none"
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Insurance info, certifications, past project notes…"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={form.isActive}
            onChange={(e) => set("isActive", e.target.checked)}
          />
          Active (appears in project technician picker)
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        {sub ? (
          confirmDelete ? (
            <div className="mr-auto flex items-center gap-2">
              <span className="text-sm text-destructive font-medium">Delete this subcontractor?</span>
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

function StarRatingInput({ value, onChange }: { value: number | null; onChange: (v: number | null) => void }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value ?? 0;
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => onChange(value === n ? null : n)}
          className="text-muted-foreground hover:text-amber-400 transition-colors"
          title={`${n} star${n !== 1 ? "s" : ""}`}
        >
          <Star
            className={cn(
              "size-5",
              n <= display ? "fill-amber-400 text-amber-400" : "fill-transparent"
            )}
          />
        </button>
      ))}
      {value !== null ? (
        <span className="ml-1.5 text-xs text-muted-foreground">{value}/5</span>
      ) : null}
    </div>
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
