"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { Release } from "@/types/release";

const FIELD_INPUT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary";

export interface ReleaseDetails {
  shippingType: string;
  shipTo: string;
  recipients: string;
  notes: string;
}

interface ReleaseModalProps {
  releasableDraftReleases: Release[];
  onClose: () => void;
  onGenerate: (releaseId: string, details: ReleaseDetails) => void;
}

export function ReleaseModal({ releasableDraftReleases, onClose, onGenerate }: ReleaseModalProps) {
  const [releaseId, setReleaseId] = useState(releasableDraftReleases[0]?.id ?? "");
  const [shippingType, setShippingType] = useState("Next Day");
  const [shipTo, setShipTo] = useState("NY Warehouse");
  const [recipients, setRecipients] = useState("Project Coordination Team");
  const [notes, setNotes] = useState("Please release all approved products for procurement.");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!releaseId) return;
    setSubmitting(true);
    await onGenerate(releaseId, { shippingType, shipTo, recipients, notes });
  }

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-lg">
        <h2 className="mb-1 text-lg font-semibold">Create Equipment Release</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Only rows marked Approved and assigned to the selected release number will be included.
        </p>

        {releasableDraftReleases.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No release has any Approved rows assigned yet. Assign rows to a release number in the table
            first.
          </p>
        ) : (
          <div className="grid gap-3">
            <Field label="Release Number">
              <select
                className={FIELD_INPUT_CLASS}
                value={releaseId}
                onChange={(e) => setReleaseId(e.target.value)}
              >
                {releasableDraftReleases.map((release) => (
                  <option key={release.id} value={release.id}>
                    {release.releaseNumber}
                  </option>
                ))}
              </select>
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Shipping Type">
                <select
                  className={FIELD_INPUT_CLASS}
                  value={shippingType}
                  onChange={(e) => setShippingType(e.target.value)}
                >
                  <option>Ground</option>
                  <option>2-Day</option>
                  <option>Next Day</option>
                  <option>Freight</option>
                  <option>Will Call / Pickup</option>
                </select>
              </Field>
              <Field label="Ship To">
                <select className={FIELD_INPUT_CLASS} value={shipTo} onChange={(e) => setShipTo(e.target.value)}>
                  <option>NY Warehouse</option>
                  <option>Miami Warehouse</option>
                  <option>Site Address</option>
                </select>
              </Field>
            </div>
            <Field label="Recipients">
              <select
                className={FIELD_INPUT_CLASS}
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
              >
                <option>Project Coordination Team</option>
                <option>Procurement Team</option>
                <option>Project Coordination + Procurement</option>
              </select>
            </Field>
            <Field label="Release Notes">
              <textarea
                className={`${FIELD_INPUT_CLASS} h-20 py-2`}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </Field>
          </div>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          {releasableDraftReleases.length > 0 ? (
            <Button onClick={handleSubmit} disabled={submitting || !releaseId}>
              {submitting ? "Generating…" : "Generate Release"}
            </Button>
          ) : null}
        </div>
      </div>
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
