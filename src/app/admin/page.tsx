"use client";

import { useEffect, useRef, useState } from "react";
import { Download, FileText, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { UserFormModal } from "@/modules/admin/components/UserFormModal";
import { cn } from "@/lib/utils";
import {
  TEMPLATE_NAMES,
  downloadTemplate,
  getTemplate,
  removeTemplate,
  storeTemplate,
  type StoredTemplate,
} from "@/lib/templateStore";
import type { AppUser } from "@/types/user";

// ─── Template Library ─────────────────────────────────────────────────────────

function TemplateLibrary() {
  const [stored, setStored] = useState<Record<string, StoredTemplate | null>>({});

  useEffect(() => {
    const data: Record<string, StoredTemplate | null> = {};
    for (const name of TEMPLATE_NAMES) {
      data[name] = getTemplate(name);
    }
    setStored(data);
  }, []);

  const handleUpload = async (name: string, file: File) => {
    const t = await storeTemplate(name, file);
    setStored((prev) => ({ ...prev, [name]: t }));
  };

  const handleRemove = (name: string) => {
    removeTemplate(name);
    setStored((prev) => ({ ...prev, [name]: null }));
  };

  const uploaded = TEMPLATE_NAMES.filter((n) => stored[n]);
  const pending = TEMPLATE_NAMES.filter((n) => !stored[n]);

  return (
    <div className="mt-10">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">SOP Templates</h2>
          <p className="text-sm text-muted-foreground">
            Upload files here — links in the Process SOP map will download them.
          </p>
        </div>
        <div className="text-xs text-muted-foreground">
          {uploaded.length} / {TEMPLATE_NAMES.length} uploaded
        </div>
      </div>

      <ul className="divide-y rounded-xl border bg-card">
        {TEMPLATE_NAMES.map((name) => {
          const t = stored[name];
          return (
            <TemplateRow
              key={name}
              name={name}
              stored={t ?? null}
              onUpload={(file) => handleUpload(name, file)}
              onRemove={() => handleRemove(name)}
              onDownload={() => downloadTemplate(name)}
            />
          );
        })}
      </ul>

      {pending.length > 0 && (
        <p className="mt-3 text-xs text-muted-foreground">
          {pending.length} template{pending.length !== 1 ? "s" : ""} not yet uploaded:{" "}
          {pending.join(", ")}.
        </p>
      )}
    </div>
  );
}

function TemplateRow({
  name,
  stored,
  onUpload,
  onRemove,
  onDownload,
}: {
  name: string;
  stored: StoredTemplate | null;
  onUpload: (file: File) => void;
  onRemove: () => void;
  onDownload: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <li className="flex items-center gap-3 px-5 py-3">
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg",
          stored ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}
      >
        <FileText className="size-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium">{name}</div>
        {stored ? (
          <div className="text-xs text-muted-foreground truncate">
            {stored.fileName} &middot; {(stored.size / 1024).toFixed(0)} KB &middot;{" "}
            {new Date(stored.uploadedAt).toLocaleDateString()}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No file uploaded</div>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {stored && (
          <>
            <button
              onClick={onDownload}
              className="flex items-center gap-1 text-xs text-primary hover:underline underline-offset-2"
            >
              <Download className="size-3" />
              Download
            </button>
            <button
              onClick={onRemove}
              className="flex items-center gap-1 text-xs text-destructive hover:underline underline-offset-2"
            >
              <X className="size-3" />
              Remove
            </button>
          </>
        )}
        <button
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors"
        >
          <Upload className="size-3" />
          {stored ? "Replace" : "Upload"}
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
            e.target.value = "";
          }}
        />
      </div>
    </li>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const { users, isLoading, refetch } = useUsersContext();
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="mx-auto max-w-3xl p-8">
      {/* Users */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage the people who can be assigned to projects and workflow steps.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingUser(null);
            setShowForm(true);
          }}
        >
          New User
        </Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading users…</p>
      ) : users.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users yet.</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {users.map((user) => (
            <li key={user.id}>
              <button
                type="button"
                onClick={() => {
                  setEditingUser(user);
                  setShowForm(true);
                }}
                className={cn(
                  "flex w-full items-center gap-3 px-5 py-4 text-left hover:bg-accent",
                  !user.isActive && "opacity-50"
                )}
              >
                <UserAvatarImage name={user.name} avatarUrl={user.avatarUrl} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.title || "—"}</div>
                </div>
                <StatusBadge label={user.role} tone={user.role === "Administrator" ? "info" : "neutral"} />
                {!user.isActive ? <StatusBadge label="Inactive" tone="warning" /> : null}
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* Templates */}
      <TemplateLibrary />

      {showForm ? (
        <UserFormModal
          user={editingUser}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            refetch();
          }}
          onDeleted={() => {
            setShowForm(false);
            refetch();
          }}
        />
      ) : null}
    </div>
  );
}
