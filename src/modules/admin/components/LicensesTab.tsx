"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { Skeleton } from "@/components/shared/Skeleton";
import {
  getLicenses,
  createLicense,
  updateLicense,
  deleteLicense,
} from "@/lib/data/licenses";
import {
  LICENSE_STATUSES,
  type License,
  type LicenseAttachment,
  type CreateLicenseInput,
  type LicenseStatus,
} from "@/types/license";
import { cn } from "@/lib/utils";

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<LicenseStatus, string> = {
  Active:    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  Expiring:  "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  Expired:   "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  Suspended: "bg-muted text-muted-foreground",
};

function StatusBadge({ status }: { status: LicenseStatus }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", STATUS_COLORS[status])}>
      {status}
    </span>
  );
}

// ─── Blank form ────────────────────────────────────────────────────────────────

const BLANK: CreateLicenseInput = {
  state: "",
  licenseType: "",
  licenseNumber: "",
  holderName: "",
  renewalDate: null,
  renewalRequirements: "",
  status: "Active",
  notes: "",
};

// ─── License Form Modal ───────────────────────────────────────────────────────

const FIELD_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary";

function LicenseFormModal({
  license,
  onClose,
  onSaved,
  onDeleted,
}: {
  license: License | null;
  onClose: () => void;
  onSaved: () => void;
  onDeleted?: () => void;
}) {
  const [form, setForm] = useState<CreateLicenseInput>(
    license
      ? {
          state: license.state,
          licenseType: license.licenseType,
          licenseNumber: license.licenseNumber,
          holderName: license.holderName,
          renewalDate: license.renewalDate
            ? license.renewalDate.slice(0, 10)
            : null,
          renewalRequirements: license.renewalRequirements,
          status: license.status,
          notes: license.notes,
        }
      : BLANK
  );
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [attachments, setAttachments] = useState<LicenseAttachment[]>(
    license?.attachments ?? []
  );
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !license) return;
    e.target.value = "";
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(`/api/licenses/${license.id}/attachments`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) throw new Error(await res.text());
      const added: LicenseAttachment = await res.json();
      setAttachments((prev) => [...prev, added]);
    } catch (err) {
      console.error("Upload failed:", err);
    } finally {
      setUploading(false);
    }
  }

  async function handleDeleteAttachment(storedName: string) {
    if (!license) return;
    try {
      await fetch(`/api/licenses/${license.id}/attachments/${storedName}`, {
        method: "DELETE",
      });
      setAttachments((prev) => prev.filter((a) => a.storedName !== storedName));
    } catch (err) {
      console.error("Delete attachment failed:", err);
    }
  }

  function set<K extends keyof CreateLicenseInput>(key: K, value: CreateLicenseInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.licenseType.trim()) return;
    setSaving(true);
    try {
      if (license) {
        await updateLicense(license.id, form);
      } else {
        await createLicense(form);
      }
      onSaved();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!license) return;
    setDeleting(true);
    try {
      await deleteLicense(license.id);
      onDeleted?.();
      onClose();
    } finally {
      setDeleting(false);
    }
  }

  const isSubmitting = saving || deleting;

  return (
    <Modal open onClose={onClose} className="max-w-lg">
      <h2 className="mb-4 text-lg font-semibold">{license ? "Edit License" : "New License"}</h2>
      <div className="space-y-3">
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">State</span>
            <input
              className={FIELD_CLASS}
              value={form.state}
              onChange={(e) => set("state", e.target.value)}
              placeholder="e.g. CA"
              autoFocus
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">License Type *</span>
            <input
              className={FIELD_CLASS}
              value={form.licenseType}
              onChange={(e) => set("licenseType", e.target.value)}
              placeholder="e.g. Contractor's License"
              required
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">License Number</span>
            <input
              className={FIELD_CLASS}
              value={form.licenseNumber}
              onChange={(e) => set("licenseNumber", e.target.value)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Holder Name</span>
            <input
              className={FIELD_CLASS}
              value={form.holderName}
              onChange={(e) => set("holderName", e.target.value)}
            />
          </label>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Renewal Date</span>
            <input
              type="date"
              className={FIELD_CLASS}
              value={form.renewalDate ?? ""}
              onChange={(e) => set("renewalDate", e.target.value || null)}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-muted-foreground">Status</span>
            <select
              className={FIELD_CLASS}
              value={form.status}
              onChange={(e) => set("status", e.target.value as LicenseStatus)}
            >
              {LICENSE_STATUSES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Renewal Requirements</span>
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            rows={2}
            value={form.renewalRequirements}
            onChange={(e) => set("renewalRequirements", e.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-semibold text-muted-foreground">Notes</span>
          <textarea
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            rows={2}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
          />
        </label>

        {/* Attachments */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-xs font-semibold text-muted-foreground">Attachments</span>
            {license && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="text-xs text-primary hover:underline disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "+ Upload file"}
              </button>
            )}
          </div>
          {!license ? (
            <p className="text-xs text-muted-foreground">Save the license first, then add attachments.</p>
          ) : attachments.length === 0 ? (
            <p className="text-xs text-muted-foreground">No attachments yet.</p>
          ) : (
            <ul className="space-y-1">
              {attachments.map((a) => (
                <li
                  key={a.storedName}
                  className="flex items-center justify-between gap-2 rounded-md border bg-muted/30 px-3 py-1.5"
                >
                  <a
                    href={`/api/licenses/${license.id}/attachments/${a.storedName}`}
                    download={a.originalName}
                    className="truncate text-xs text-primary hover:underline"
                  >
                    {a.originalName}
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDeleteAttachment(a.storedName)}
                    className="shrink-0 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            accept=".pdf,.jpg,.jpeg,.png,.heic,.doc,.docx"
            onChange={handleUpload}
          />
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        {license && onDeleted && (
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isSubmitting}
            className="mr-auto"
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        )}
        <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
        <Button onClick={handleSave} disabled={isSubmitting || !form.licenseType.trim()}>
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </Modal>
  );
}

// ─── LicensesTab ─────────────────────────────────────────────────────────────

// Collect unique states from the list for the filter dropdown
function uniqueStates(licenses: License[]): string[] {
  return [...new Set(licenses.map((l) => l.state).filter(Boolean))].sort();
}

// A renewal is "upcoming" if within 90 days
function isUpcoming(renewalDate: string | null): boolean {
  if (!renewalDate) return false;
  const diff = new Date(renewalDate).getTime() - Date.now();
  return diff > 0 && diff < 90 * 24 * 60 * 60 * 1000;
}

export function LicensesTab() {
  const [licenses, setLicenses] = useState<License[] | null>(null);
  const [editing, setEditing] = useState<License | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Filters
  const [filterState, setFilterState] = useState("");
  const [filterStatus, setFilterStatus] = useState<LicenseStatus | "">("");
  const [filterUpcoming, setFilterUpcoming] = useState(false);

  function load() {
    getLicenses().then(setLicenses);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = (licenses ?? []).filter((l) => {
    if (filterState && l.state !== filterState) return false;
    if (filterStatus && l.status !== filterStatus) return false;
    if (filterUpcoming && !isUpcoming(l.renewalDate)) return false;
    return true;
  });

  const states = licenses ? uniqueStates(licenses) : [];

  return (
    <>
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Licenses</h1>
          <p className="text-sm text-muted-foreground">
            Track company licenses, renewal dates, and compliance status.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          New License
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
          value={filterState}
          onChange={(e) => setFilterState(e.target.value)}
        >
          <option value="">All states</option>
          {states.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as LicenseStatus | "")}
        >
          <option value="">All statuses</option>
          {LICENSE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={filterUpcoming}
            onChange={(e) => setFilterUpcoming(e.target.checked)}
          />
          Upcoming renewals only
        </label>
      </div>

      {licenses === null ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed py-12 text-center">
          <p className="text-sm font-medium">No licenses found.</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {licenses.length > 0 ? "Try adjusting your filters." : "Add your first license to get started."}
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border bg-card">
          {/* Header */}
          <div className="grid grid-cols-[1fr_1fr_1fr_1fr_auto_auto] gap-4 border-b bg-muted/30 px-5 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span>State / Type</span>
            <span>License #</span>
            <span>Holder</span>
            <span>Renewal Date</span>
            <span>Status</span>
            <span />
          </div>
          {filtered.map((lic) => (
            <button
              key={lic.id}
              type="button"
              onClick={() => {
                setEditing(lic);
                setShowForm(true);
              }}
              className="grid w-full grid-cols-[1fr_1fr_1fr_1fr_auto_auto] items-center gap-4 border-b px-5 py-3.5 text-left last:border-0 hover:bg-accent transition-colors"
            >
              <div>
                <div className="text-sm font-medium">{lic.licenseType}</div>
                {lic.state && (
                  <div className="text-xs text-muted-foreground">{lic.state}</div>
                )}
              </div>
              <span className="text-sm text-muted-foreground">{lic.licenseNumber || "—"}</span>
              <span className="text-sm">{lic.holderName || "—"}</span>
              <span className={cn(
                "text-sm",
                isUpcoming(lic.renewalDate) ? "font-medium text-amber-600 dark:text-amber-400" : "text-muted-foreground"
              )}>
                {lic.renewalDate
                  ? new Date(lic.renewalDate).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "—"}
              </span>
              <StatusBadge status={lic.status} />
              <span className="text-xs text-muted-foreground hover:text-foreground">Edit</span>
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <LicenseFormModal
          license={editing}
          onClose={() => setShowForm(false)}
          onSaved={load}
          onDeleted={load}
        />
      )}
    </>
  );
}
