"use client";

import { useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Check, X, ChevronDown, ChevronRight, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import type { AppUser } from "@/types/user";
import type { OrgCertification, OrgUserCertification, OrgPosition } from "../lib/types";
import {
  createOrgCertification,
  updateOrgCertification,
  deleteOrgCertification,
  addUserCertification,
  removeUserCertification,
} from "../lib/actions";

interface CertificationManagerProps {
  certifications: OrgCertification[];
  userCertifications: OrgUserCertification[];
  positions: OrgPosition[];
}

// ─── Inline form (create / edit cert) ────────────────────────────────────────

function CertForm({
  initial,
  onSave,
  onCancel,
  isPending,
  saveLabel,
}: {
  initial: { name: string; issuingBody: string; description: string };
  onSave: (v: typeof initial) => void;
  onCancel: () => void;
  isPending: boolean;
  saveLabel: string;
}) {
  const [form, setForm] = useState(initial);
  function set(k: keyof typeof initial, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }
  return (
    <div className="space-y-2 rounded-lg border bg-card p-3">
      <input
        autoFocus
        type="text"
        value={form.name}
        onChange={(e) => set("name", e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") onSave(form); if (e.key === "Escape") onCancel(); }}
        placeholder="Certification name *"
        className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="text"
          value={form.issuingBody}
          onChange={(e) => set("issuingBody", e.target.value)}
          placeholder="Issuing body (optional)"
          className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
        <input
          type="text"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Description (optional)"
          className="rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(form)} disabled={isPending || !form.name.trim()}>
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

// ─── Add user cert form ───────────────────────────────────────────────────────

function AddUserCertForm({
  certId,
  existingUserIds,
  onSave,
  onCancel,
  isPending,
}: {
  certId: string;
  existingUserIds: Set<string>;
  onSave: (userId: string, issuedDate: string, expiryDate: string, credentialId: string) => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { users } = useUsersContext();
  const [userId, setUserId] = useState("");
  const [issuedDate, setIssuedDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [credentialId, setCredentialId] = useState("");

  const available = users
    .filter((u: AppUser) => u.isActive && !existingUserIds.has(u.id))
    .sort((a: AppUser, b: AppUser) => a.name.localeCompare(b.name));

  return (
    <div className="mt-2 space-y-2 rounded-lg border bg-muted/30 p-3">
      <select
        autoFocus
        value={userId}
        onChange={(e) => setUserId(e.target.value)}
        className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <option value="">— Select user —</option>
        {available.map((u: AppUser) => (
          <option key={u.id} value={u.id}>{u.name}</option>
        ))}
      </select>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Issued Date</label>
          <input
            type="date"
            value={issuedDate}
            onChange={(e) => setIssuedDate(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
        <div>
          <label className="block text-xs text-muted-foreground mb-1">Expiry Date</label>
          <input
            type="date"
            value={expiryDate}
            onChange={(e) => setExpiryDate(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>
      </div>
      <input
        type="text"
        value={credentialId}
        onChange={(e) => setCredentialId(e.target.value)}
        placeholder="Credential / license number (optional)"
        className="w-full rounded-md border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <div className="flex gap-2">
        <Button size="sm" onClick={() => onSave(userId, issuedDate, expiryDate, credentialId)} disabled={!userId || isPending}>
          <Check className="mr-1 size-3.5" />
          Add
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}

// ─── Single cert row ──────────────────────────────────────────────────────────

function CertRow({
  cert,
  holders,
  positions,
}: {
  cert: OrgCertification;
  holders: OrgUserCertification[];
  positions: OrgPosition[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [editing, setEditing] = useState(false);
  const [addingUser, setAddingUser] = useState(false);
  const [isPending, startTransition] = useTransition();

  const requirers = positions.filter((p) =>
    p.certifications.some((c) => c.certificationId === cert.id)
  );

  const existingUserIds = new Set(holders.map((h) => h.userId));

  function handleUpdate(form: { name: string; issuingBody: string; description: string }) {
    startTransition(async () => {
      await updateOrgCertification(cert.id, {
        name: form.name.trim(),
        issuingBody: form.issuingBody.trim() || null,
        description: form.description.trim() || null,
      });
      setEditing(false);
    });
  }

  function handleDelete() {
    if (!confirm(`Delete certification "${cert.name}"? This will remove it from all positions and users.`)) return;
    startTransition(async () => {
      await deleteOrgCertification(cert.id);
    });
  }

  function handleAddUser(userId: string, issuedDate: string, expiryDate: string, credentialId: string) {
    startTransition(async () => {
      await addUserCertification({
        userId,
        certificationId: cert.id,
        issuedDate: issuedDate || null,
        expiryDate: expiryDate || null,
        credentialId: credentialId || null,
      });
      setAddingUser(false);
    });
  }

  function handleRemoveHolder(id: string) {
    startTransition(async () => {
      await removeUserCertification(id);
    });
  }

  function expiryChip(iso: string | null) {
    if (!iso) return null;
    const d = new Date(iso);
    const daysOut = Math.round((d.getTime() - Date.now()) / 86400000);
    const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    if (daysOut < 0) return <span className="rounded px-1.5 py-0.5 text-xs bg-rose-100 text-rose-700">Expired {label}</span>;
    if (daysOut <= 60) return <span className="rounded px-1.5 py-0.5 text-xs bg-amber-100 text-amber-700">Expires {label}</span>;
    return <span className="text-xs text-muted-foreground">{label}</span>;
  }

  if (editing) {
    return (
      <CertForm
        initial={{ name: cert.name, issuingBody: cert.issuingBody ?? "", description: cert.description ?? "" }}
        onSave={handleUpdate}
        onCancel={() => setEditing(false)}
        isPending={isPending}
        saveLabel="Save"
      />
    );
  }

  return (
    <div className={cn("border rounded-xl bg-card shadow-sm overflow-hidden", isPending && "opacity-60")}>
      {/* Header row */}
      <div className="flex items-center gap-2 px-4 py-3">
        <button
          type="button"
          onClick={() => setExpanded((e) => !e)}
          className="flex items-center gap-2 flex-1 text-left min-w-0"
        >
          {expanded ? <ChevronDown className="size-3.5 flex-none text-muted-foreground" /> : <ChevronRight className="size-3.5 flex-none text-muted-foreground" />}
          <div className="min-w-0">
            <span className="text-sm font-medium">{cert.name}</span>
            {cert.issuingBody && (
              <span className="ml-2 text-xs text-muted-foreground">{cert.issuingBody}</span>
            )}
          </div>
        </button>
        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-none">
          <span>{requirers.length} position{requirers.length !== 1 ? "s" : ""}</span>
          <span>·</span>
          <span>{holders.length} holder{holders.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="flex gap-1 flex-none">
          <button type="button" onClick={() => setEditing(true)} className="p-1 rounded text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <Pencil className="size-3.5" />
          </button>
          <button type="button" onClick={handleDelete} disabled={isPending} className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50">
            <Trash2 className="size-3.5" />
          </button>
        </div>
      </div>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t px-4 py-3 space-y-4 bg-muted/20">
          {/* Positions */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Positions that require this</p>
            {requirers.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">No positions yet</p>
            ) : (
              <div className="space-y-1">
                {requirers.map((p) => {
                  const level = p.certifications.find((c) => c.certificationId === cert.id)?.requirementLevel;
                  return (
                    <div key={p.id} className="flex items-center gap-2 text-sm">
                      <span>{p.title}</span>
                      <span className={cn("rounded px-1.5 py-0.5 text-xs font-medium", level === "required" ? "bg-rose-100 text-rose-700" : "bg-blue-100 text-blue-700")}>
                        {level ?? "required"}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Holders */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Users who hold this</p>
              {!addingUser && (
                <button type="button" onClick={() => setAddingUser(true)} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <Plus className="size-3" /> Add holder
                </button>
              )}
            </div>
            {holders.length === 0 && !addingUser ? (
              <p className="text-xs text-muted-foreground italic">No holders recorded</p>
            ) : (
              <div className="space-y-1.5">
                {holders.map((h) => (
                  <div key={h.id} className="flex items-center gap-2 text-sm">
                    <User className="size-3.5 text-muted-foreground flex-none" />
                    <span className="flex-1 font-medium">{h.user?.name ?? h.userId}</span>
                    {h.issuedDate && <span className="text-xs text-muted-foreground">{new Date(h.issuedDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>}
                    {expiryChip(h.expiryDate)}
                    {h.credentialId && <span className="text-xs text-muted-foreground font-mono">{h.credentialId}</span>}
                    <button type="button" onClick={() => handleRemoveHolder(h.id)} disabled={isPending} className="p-0.5 rounded text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50">
                      <X className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {addingUser && (
              <AddUserCertForm
                certId={cert.id}
                existingUserIds={existingUserIds}
                onSave={handleAddUser}
                onCancel={() => setAddingUser(false)}
                isPending={isPending}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Root export ──────────────────────────────────────────────────────────────

export function CertificationManager({
  certifications,
  userCertifications,
  positions,
}: CertificationManagerProps) {
  const [addingNew, setAddingNew] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleCreate(form: { name: string; issuingBody: string; description: string }) {
    startTransition(async () => {
      await createOrgCertification({
        name: form.name.trim(),
        issuingBody: form.issuingBody.trim() || null,
        description: form.description.trim() || null,
      });
      setAddingNew(false);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Certifications</h3>
        {!addingNew && (
          <Button size="sm" variant="ghost" onClick={() => setAddingNew(true)}>
            <Plus className="mr-1 size-3.5" />
            Add Certification
          </Button>
        )}
      </div>

      {addingNew && (
        <CertForm
          initial={{ name: "", issuingBody: "", description: "" }}
          onSave={handleCreate}
          onCancel={() => setAddingNew(false)}
          isPending={isPending}
          saveLabel="Create"
        />
      )}

      {certifications.length === 0 && !addingNew ? (
        <div className="rounded-xl border bg-card py-8 text-center text-sm text-muted-foreground">
          No certifications yet. Add one to start tracking requirements and holders.
        </div>
      ) : (
        <div className="space-y-2">
          {certifications.map((cert) => (
            <CertRow
              key={cert.id}
              cert={cert}
              holders={userCertifications.filter((u) => u.certificationId === cert.id)}
              positions={positions}
            />
          ))}
        </div>
      )}
    </div>
  );
}
