"use client";

import { useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import { createUser, deleteUser, updateUser } from "@/lib/data/users";
import {
  ACCOUNT_TYPES,
  ROLE_TYPES,
  ROLE_TYPE_LABELS,
  type AccountType,
  type AppUser,
  type RoleType,
} from "@/types/user";

const FIELD_INPUT_CLASS =
  "h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary";

interface UserFormModalProps {
  user: AppUser | null;
  onClose: () => void;
  onSaved: (user: AppUser) => void;
  onDeleted: (id: string) => void;
}

export function UserFormModal({ user, onClose, onSaved, onDeleted }: UserFormModalProps) {
  const [name, setName] = useState(user?.name ?? "");
  const [title, setTitle] = useState(user?.title ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(user?.avatarUrl ?? null);
  const [accountType, setAccountType] = useState<AccountType>(user?.accountType ?? "Member");
  const [roleType, setRoleType] = useState<RoleType>(user?.roleType ?? "Other");
  const [isActive, setIsActive] = useState(user?.isActive ?? true);
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
        ? await updateUser(user.id, { name, title, email, phone, avatarUrl, accountType, roleType, isActive })
        : await createUser({ name, title, email, phone, avatarUrl, accountType, roleType, isActive });
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

  return (
    <Modal open onClose={onClose}>
      <h2 className="mb-1 text-lg font-semibold">{user ? "Edit User" : "New User"}</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Users appear in assignee dropdowns across projects and workflow steps.
      </p>

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

      <div className="grid gap-3">
        <Field label="Name">
          <input className={FIELD_INPUT_CLASS} value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </Field>
        <Field label="Title">
          <input className={FIELD_INPUT_CLASS} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Email">
          <input
            type="email"
            className={FIELD_INPUT_CLASS}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field label="Phone">
          <input
            type="tel"
            className={FIELD_INPUT_CLASS}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>
        <Field label="Access Level">
          <select
            className={FIELD_INPUT_CLASS}
            value={accountType}
            onChange={(e) => setAccountType(e.target.value as AccountType)}
          >
            {ACCOUNT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Role / Group">
          <select
            className={FIELD_INPUT_CLASS}
            value={roleType}
            onChange={(e) => setRoleType(e.target.value as RoleType)}
          >
            {ROLE_TYPES.map((r) => (
              <option key={r} value={r}>
                {ROLE_TYPE_LABELS[r]}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
          />
          Active
        </label>
      </div>

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
