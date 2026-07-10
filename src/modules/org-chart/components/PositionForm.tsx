"use client";

import { useState, useTransition } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import type { AppUser } from "@/types/user";
import type {
  OrgPosition,
  OrgDepartment,
  OrgLocation,
  OrgCertification,
  CertRequirement,
  CreatePositionInput,
  UpdatePositionInput,
} from "../lib/types";
import { createOrgPosition, updateOrgPosition, deleteOrgPosition } from "../lib/actions";

const POSITION_STATUSES = [
  { value: "open",     label: "Open"     },
  { value: "filled",   label: "Filled"   },
  { value: "planned",  label: "Planned"  },
  { value: "inactive", label: "Inactive" },
];

interface PositionFormProps {
  open: boolean;
  onClose: () => void;
  versionId: string;
  departments: OrgDepartment[];
  locations: OrgLocation[];
  positions: OrgPosition[];
  certifications: OrgCertification[];
  editing?: OrgPosition | null;
}

export function PositionForm({
  open,
  onClose,
  versionId,
  departments,
  locations,
  positions,
  certifications,
  editing,
}: PositionFormProps) {
  const { users } = useUsersContext();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const primaryAssignment = editing?.assignments.find(
    (a) => a.isActive && a.assignmentType === "primary"
  );

  const [form, setForm] = useState({
    title: editing?.title ?? "",
    departmentId: editing?.departmentId ?? "",
    locationId: editing?.locationId ?? "",
    reportsToPositionId: editing?.reportsToPositionId ?? "",
    status: editing?.status ?? "open",
    targetHireDate: editing?.targetHireDate
      ? editing.targetHireDate.split("T")[0]
      : "",
    notes: editing?.notes ?? "",
    assignedUserId: primaryAssignment?.userId ?? "",
  });

  const [selectedCerts, setSelectedCerts] = useState<CertRequirement[]>(
    editing?.certifications.map((c) => ({
      certificationId: c.certificationId,
      requirementLevel: c.requirementLevel,
    })) ?? []
  );

  const [careerPathsTo, setCareerPathsTo] = useState<string[]>(
    editing?.careerPaths.map((cp) => cp.toPositionId) ?? []
  );

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  // Positions available as "reports to" — exclude self to avoid cycles
  const parentOptions = positions.filter((p) => p.id !== editing?.id);

  function handleSubmit() {
    if (!form.title.trim()) {
      setError("Position title is required.");
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        if (editing) {
          const input: UpdatePositionInput = {
            title: form.title.trim(),
            departmentId: form.departmentId || null,
            locationId: form.locationId || null,
            reportsToPositionId: form.reportsToPositionId || null,
            status: form.status,
            targetHireDate: form.targetHireDate || null,
            notes: form.notes.trim() || null,
            assignedUserId: form.assignedUserId || null,
            certifications: selectedCerts,
            careerPathsTo,
          };
          await updateOrgPosition(editing.id, input);
        } else {
          const input: CreatePositionInput = {
            orgChartVersionId: versionId,
            title: form.title.trim(),
            departmentId: form.departmentId || null,
            locationId: form.locationId || null,
            reportsToPositionId: form.reportsToPositionId || null,
            status: form.status,
            targetHireDate: form.targetHireDate || null,
            notes: form.notes.trim() || null,
            assignedUserId: form.assignedUserId || null,
            certifications: selectedCerts,
            careerPathsTo,
          };
          await createOrgPosition(input);
        }
        onClose();
      } catch (e) {
        setError("Something went wrong. Please try again.");
        console.error(e);
      }
    });
  }

  function handleDelete() {
    if (!editing) return;
    if (!confirm(`Delete position "${editing.title}"? This cannot be undone.`)) return;
    startTransition(async () => {
      await deleteOrgPosition(editing.id);
      onClose();
    });
  }

  return (
    <Modal open={open} onClose={onClose} className="max-w-xl">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold">
          {editing ? "Edit Position" : "New Position"}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Position Title <span className="text-destructive">*</span>
          </label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Solutions Engineer"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Status */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Status</label>
          <select
            value={form.status}
            onChange={(e) => set("status", e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {POSITION_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>

        {/* Department + Location */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Department</label>
            <select
              value={form.departmentId}
              onChange={(e) => set("departmentId", e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">— None —</option>
              {departments
                .filter((d) => d.status === "active")
                .map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Location</label>
            <select
              value={form.locationId}
              onChange={(e) => set("locationId", e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="">— None —</option>
              {locations
                .filter((l) => l.status === "active")
                .map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
            </select>
          </div>
        </div>

        {/* Reports To */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Reports To</label>
          <select
            value={form.reportsToPositionId}
            onChange={(e) => set("reportsToPositionId", e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">— No manager (top-level) —</option>
            {parentOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
        </div>

        {/* Assigned User */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Assigned User <span className="text-muted-foreground/60">(optional)</span>
          </label>
          <select
            value={form.assignedUserId}
            onChange={(e) => set("assignedUserId", e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <option value="">— Vacant —</option>
            {users
              .filter((u: AppUser) => u.isActive)
              .sort((a: AppUser, b: AppUser) => a.name.localeCompare(b.name))
              .map((u: AppUser) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
          </select>
        </div>

        {/* Target Hire Date */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">
            Target Hire Date <span className="text-muted-foreground/60">(optional)</span>
          </label>
          <input
            type="date"
            value={form.targetHireDate}
            onChange={(e) => set("targetHireDate", e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1">Notes</label>
          <textarea
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            rows={3}
            placeholder="Optional notes about this position…"
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
          />
        </div>

        {/* Certifications */}
        {certifications.length > 0 && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Required Certifications
            </label>
            <div className="space-y-1.5 max-h-40 overflow-y-auto rounded-md border bg-background p-2">
              {certifications.map((cert) => {
                const existing = selectedCerts.find((c) => c.certificationId === cert.id);
                return (
                  <div key={cert.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`cert-${cert.id}`}
                      checked={!!existing}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedCerts((prev) => [
                            ...prev,
                            { certificationId: cert.id, requirementLevel: "required" },
                          ]);
                        } else {
                          setSelectedCerts((prev) =>
                            prev.filter((c) => c.certificationId !== cert.id)
                          );
                        }
                      }}
                      className="rounded"
                    />
                    <label htmlFor={`cert-${cert.id}`} className="flex-1 text-sm cursor-pointer">
                      {cert.name}
                      {cert.issuingBody && (
                        <span className="ml-1 text-xs text-muted-foreground">({cert.issuingBody})</span>
                      )}
                    </label>
                    {existing && (
                      <select
                        value={existing.requirementLevel}
                        onChange={(e) =>
                          setSelectedCerts((prev) =>
                            prev.map((c) =>
                              c.certificationId === cert.id
                                ? { ...c, requirementLevel: e.target.value as "required" | "preferred" }
                                : c
                            )
                          )
                        }
                        className="rounded border bg-background px-1.5 py-0.5 text-xs focus:outline-none"
                      >
                        <option value="required">Required</option>
                        <option value="preferred">Preferred</option>
                      </select>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Career Paths */}
        {positions.filter((p) => p.id !== editing?.id).length > 0 && (
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-2">
              Career Paths <span className="font-normal text-muted-foreground/60">(this role leads to…)</span>
            </label>
            <div className="space-y-1.5 max-h-36 overflow-y-auto rounded-md border bg-background p-2">
              {positions
                .filter((p) => p.id !== editing?.id)
                .sort((a, b) => a.title.localeCompare(b.title))
                .map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`path-${p.id}`}
                      checked={careerPathsTo.includes(p.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setCareerPathsTo((prev) => [...prev, p.id]);
                        } else {
                          setCareerPathsTo((prev) => prev.filter((id) => id !== p.id));
                        }
                      }}
                      className="rounded"
                    />
                    <label htmlFor={`path-${p.id}`} className="text-sm cursor-pointer">
                      {p.title}
                      {p.department && (
                        <span className="ml-1 text-xs text-muted-foreground">({p.department.name})</span>
                      )}
                    </label>
                  </div>
                ))}
            </div>
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        <div className="flex items-center justify-between pt-1">
          {editing ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={isPending}
              className="text-xs text-destructive hover:underline disabled:opacity-50"
            >
              Delete position
            </button>
          ) : (
            <div />
          )}
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={isPending}>
              {isPending ? "Saving…" : editing ? "Save Changes" : "Create Position"}
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
