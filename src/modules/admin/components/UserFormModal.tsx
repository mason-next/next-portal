"use client";

import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import {
  createUser,
  deleteUser,
  updateUser,
  updateUserPassword,
  addCertification,
  removeCertification,
} from "@/lib/data/users";
import {
  ACCOUNT_TYPES,
  ROLE_TYPES,
  ROLE_TYPE_LABELS,
  type AccountType,
  type AppUser,
  type RoleType,
  type UserCertification,
} from "@/types/user";
import { useSession } from "@/lib/auth/client";
import { cn } from "@/lib/utils";

const FIELD_INPUT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary";

interface UserFormModalProps {
  user: AppUser | null;
  onClose: () => void;
  onSaved: (user: AppUser) => void;
  onDeleted: (id: string) => void;
}

export function UserFormModal({ user, onClose, onSaved, onDeleted }: UserFormModalProps) {
  const session = useSession();
  const isAdmin = session.accountType === "Administrator";
  const isSelf = user?.id === session.id;

  // Core fields
  const [name, setName] = useState(user?.name ?? "");
  const [title, setTitle] = useState(user?.title ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [accountType, setAccountType] = useState<AccountType>(user?.accountType ?? "Member");
  const [roleType, setRoleType] = useState<RoleType>(user?.roleType ?? "Other");
  const [isActive, setIsActive] = useState(user?.isActive ?? true);

  // Profile fields
  const [department, setDepartment] = useState(user?.department ?? "");
  const [location, setLocation] = useState(user?.location ?? "");
  const [region, setRegion] = useState(user?.region ?? "");
  const [emergencyContact, setEmergencyContact] = useState(user?.emergencyContact ?? "");
  const [adminNotes, setAdminNotes] = useState(user?.adminNotes ?? "");

  // Password change
  const [showPassword, setShowPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaving, setPasswordSaving] = useState(false);

  // Certifications
  const [certs, setCerts] = useState<UserCertification[]>(user?.certifications ?? []);
  const [showAddCert, setShowAddCert] = useState(false);
  const [certName, setCertName] = useState("");
  const [certOrg, setCertOrg] = useState("");
  const [certExpiry, setCertExpiry] = useState("");
  const [certNotes, setCertNotes] = useState("");
  const [certSaving, setCertSaving] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 256;
      const scale = Math.min(1, MAX / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      setAvatarUrl(canvas.toDataURL("image/jpeg", 0.82));
      URL.revokeObjectURL(objectUrl);
    };
    img.src = objectUrl;
  }

  async function handleSave() {
    setSubmitting(true);
    try {
      const saved = user
        ? await updateUser(user.id, {
            name,
            title,
            email,
            phone,
            avatarUrl,
            accountType,
            roleType,
            isActive,
            department,
            location,
            region,
            emergencyContact,
            adminNotes,
          })
        : await createUser({
            name,
            title,
            email,
            phone,
            avatarUrl,
            accountType,
            roleType,
            isActive,
            department,
            location,
            region,
            emergencyContact,
            adminNotes,
          });
      onSaved(saved);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!user) return;
    setSubmitting(true);
    try {
      await deleteUser(user.id);
      onDeleted(user.id);
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePasswordSave() {
    setPasswordError("");
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }
    if (!user) return;
    setPasswordSaving(true);
    try {
      await updateUserPassword(user.id, currentPassword, newPassword);
      setShowPassword(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: unknown) {
      setPasswordError(err instanceof Error ? err.message : "Failed to update password.");
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleAddCert() {
    if (!user || !certName.trim()) return;
    setCertSaving(true);
    try {
      const cert = await addCertification(user.id, {
        name: certName.trim(),
        issuingOrg: certOrg,
        expirationDate: certExpiry || null,
        notes: certNotes,
      });
      setCerts((prev) => [...prev, cert]);
      setShowAddCert(false);
      setCertName("");
      setCertOrg("");
      setCertExpiry("");
      setCertNotes("");
    } finally {
      setCertSaving(false);
    }
  }

  async function handleRemoveCert(certId: string) {
    await removeCertification(certId);
    setCerts((prev) => prev.filter((c) => c.id !== certId));
  }

  const canChangePassword = isSelf || isAdmin;
  const adminEditingOther = isAdmin && !isSelf && !!user;

  return (
    <Modal open onClose={onClose} className="max-w-2xl">
      <h2 className="mb-1 text-lg font-semibold">{user ? "Edit User" : "New User"}</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Users appear in assignee dropdowns across projects and workflow steps.
      </p>

      {/* Avatar */}
      <div className="mb-4 flex items-center gap-3">
        <UserAvatarImage name={name || "?"} avatarUrl={avatarUrl} size={48} />
        <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
          {avatarUrl ? "Change Photo" : "Upload Photo"}
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {/* Core fields */}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name">
          <input className={FIELD_INPUT_CLASS} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Title">
          <input className={FIELD_INPUT_CLASS} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Email">
          <input type="email" className={FIELD_INPUT_CLASS} value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
        <Field label="Phone">
          <input type="tel" className={FIELD_INPUT_CLASS} value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <Field label="Department">
          <input className={FIELD_INPUT_CLASS} value={department} onChange={(e) => setDepartment(e.target.value)} />
        </Field>
        <Field label="Location">
          <input className={FIELD_INPUT_CLASS} value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>
        <Field label="Region">
          <input className={FIELD_INPUT_CLASS} value={region} onChange={(e) => setRegion(e.target.value)} />
        </Field>
        <Field label="Emergency Contact">
          <input className={FIELD_INPUT_CLASS} value={emergencyContact} onChange={(e) => setEmergencyContact(e.target.value)} />
        </Field>
        {isAdmin && (
          <>
            <Field label="Access Level">
              <select className={FIELD_INPUT_CLASS} value={accountType} onChange={(e) => setAccountType(e.target.value as AccountType)}>
                {ACCOUNT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
            <Field label="Role / Group">
              <select className={FIELD_INPUT_CLASS} value={roleType} onChange={(e) => setRoleType(e.target.value as RoleType)}>
                {ROLE_TYPES.map((r) => <option key={r} value={r}>{ROLE_TYPE_LABELS[r]}</option>)}
              </select>
            </Field>
          </>
        )}
      </div>

      <label className="mt-3 flex items-center gap-2 text-sm">
        <input type="checkbox" className="h-4 w-4" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active
      </label>

      {/* Admin Notes (admin-only) */}
      {isAdmin && (
        <div className="mt-4">
          <Field label="Admin Notes (internal only)">
            <textarea
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:border-primary"
              rows={2}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
            />
          </Field>
        </div>
      )}

      {/* Password section */}
      {user && canChangePassword && (
        <div className="mt-6 rounded-lg border p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold">
              {adminEditingOther ? "Set Password" : "Change Password"}
            </span>
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="text-xs text-primary hover:underline"
            >
              {showPassword ? "Cancel" : "Change"}
            </button>
          </div>
          {showPassword && (
            <div className="mt-3 space-y-3">
              {!adminEditingOther && (
                <Field label="Current Password">
                  <input
                    type="password"
                    className={FIELD_INPUT_CLASS}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    autoComplete="current-password"
                  />
                </Field>
              )}
              <Field label="New Password">
                <input
                  type="password"
                  className={FIELD_INPUT_CLASS}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
              <Field label="Confirm New Password">
                <input
                  type="password"
                  className={FIELD_INPUT_CLASS}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                />
              </Field>
              {passwordError && <p className="text-xs text-destructive">{passwordError}</p>}
              <Button
                size="sm"
                onClick={handlePasswordSave}
                disabled={passwordSaving || !newPassword}
              >
                {passwordSaving ? "Saving…" : "Update Password"}
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Certifications */}
      {user && (
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm font-semibold">Certifications</span>
            <button
              type="button"
              onClick={() => setShowAddCert((v) => !v)}
              className="text-xs text-primary hover:underline"
            >
              {showAddCert ? "Cancel" : "+ Add"}
            </button>
          </div>

          {showAddCert && (
            <div className="mb-3 rounded-lg border p-3 space-y-2">
              <Field label="Certification Name">
                <input className={FIELD_INPUT_CLASS} value={certName} onChange={(e) => setCertName(e.target.value)} autoFocus />
              </Field>
              <div className="grid grid-cols-2 gap-2">
                <Field label="Issuing Organization">
                  <input className={FIELD_INPUT_CLASS} value={certOrg} onChange={(e) => setCertOrg(e.target.value)} />
                </Field>
                <Field label="Expiration Date">
                  <input type="date" className={FIELD_INPUT_CLASS} value={certExpiry} onChange={(e) => setCertExpiry(e.target.value)} />
                </Field>
              </div>
              <Field label="Notes">
                <input className={FIELD_INPUT_CLASS} value={certNotes} onChange={(e) => setCertNotes(e.target.value)} />
              </Field>
              <Button size="sm" onClick={handleAddCert} disabled={certSaving || !certName.trim()}>
                {certSaving ? "Adding…" : "Add Certification"}
              </Button>
            </div>
          )}

          {certs.length === 0 ? (
            <p className="text-xs text-muted-foreground">No certifications on file.</p>
          ) : (
            <ul className="space-y-1">
              {certs.map((c) => (
                <li key={c.id} className="flex items-center justify-between rounded-md border px-3 py-2">
                  <div>
                    <span className="text-sm font-medium">{c.name}</span>
                    {c.issuingOrg && (
                      <span className="ml-2 text-xs text-muted-foreground">{c.issuingOrg}</span>
                    )}
                    {c.expirationDate && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        Exp: {new Date(c.expirationDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCert(c.id)}
                    className={cn(
                      "ml-2 text-xs text-destructive hover:underline"
                    )}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="mt-6 flex justify-end gap-2">
        {user ? (
          <Button variant="destructive" onClick={handleDelete} disabled={submitting} className="mr-auto">
            Delete
          </Button>
        ) : null}
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={submitting || !name}>
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
