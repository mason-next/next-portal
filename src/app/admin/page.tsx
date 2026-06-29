"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Download, FileText, MapPin, Upload, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { DefaultKickoffAttendeesCard } from "@/modules/admin/components/DefaultKickoffAttendeesCard";
import { UserFormModal } from "@/modules/admin/components/UserFormModal";
import { SubcontractorFormModal } from "@/modules/admin/components/SubcontractorFormModal";
import { getAllSubcontractors } from "@/lib/data/subcontractors";
import {
  TEMPLATE_NAMES,
  downloadTemplate,
  getTemplate,
  removeTemplate,
  storeTemplate,
  type StoredTemplate,
} from "@/lib/templateStore";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/types/user";
import type { Subcontractor } from "@/types/subcontractor";

type Tab = "users" | "subcontractors" | "templates";

function StarDisplay({ rating }: { rating: number | null }) {
  if (!rating) return <span className="text-xs text-muted-foreground">—</span>;
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={cn("text-sm", n <= rating ? "text-amber-400" : "text-muted-foreground/30")}>
          ★
        </span>
      ))}
      <span className="ml-1 text-xs text-muted-foreground">{rating}/5</span>
    </span>
  );
}

export default function AdminPage() {
  const [tab, setTab] = useState<Tab>("users");

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* Tab bar */}
      <div className="mb-6 flex items-center gap-0 border-b">
        <TabButton active={tab === "users"} onClick={() => setTab("users")}>
          <Users className="size-4" />
          Users
        </TabButton>
        <TabButton active={tab === "subcontractors"} onClick={() => setTab("subcontractors")}>
          <Building2 className="size-4" />
          Subcontractors
        </TabButton>
        <TabButton active={tab === "templates"} onClick={() => setTab("templates")}>
          <FileText className="size-4" />
          Templates
        </TabButton>
      </div>

      {tab === "users" ? (
        <UsersTab />
      ) : tab === "subcontractors" ? (
        <SubcontractorsTab />
      ) : (
        <TemplatesTab />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors",
        active
          ? "border-foreground text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

// ─── Users tab ────────────────────────────────────────────────────────────────

function UsersTab() {
  const { users, isLoading, refetch } = useUsersContext();
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <>
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

      <div className="mt-8">
        <DefaultKickoffAttendeesCard />
      </div>

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
    </>
  );
}

// ─── Subcontractors tab ───────────────────────────────────────────────────────

function SubcontractorsTab() {
  const [subs, setSubs] = useState<Subcontractor[] | null>(null);
  const [editing, setEditing] = useState<Subcontractor | null>(null);
  const [showForm, setShowForm] = useState(false);

  function load() {
    getAllSubcontractors().then(setSubs);
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Subcontractors</h1>
          <p className="text-sm text-muted-foreground">
            External companies that can be assigned alongside internal team members on projects.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
        >
          New Subcontractor
        </Button>
      </div>

      {subs === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : subs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No subcontractors yet. Add one to get started.</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {subs.map((sub) => (
            <li key={sub.id}>
              <button
                type="button"
                onClick={() => {
                  setEditing(sub);
                  setShowForm(true);
                }}
                className={cn(
                  "flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-accent",
                  !sub.isActive && "opacity-50"
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Building2 className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{sub.name}</div>
                  <div className="text-xs text-muted-foreground">{sub.trade || "—"}</div>
                </div>
                {sub.location ? (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="size-3" />
                    {sub.location}
                  </div>
                ) : null}
                {sub.manpower > 0 ? (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Users className="size-3" />
                    {sub.manpower}
                  </div>
                ) : null}
                <StarDisplay rating={sub.rating} />
                {!sub.isActive ? <StatusBadge label="Inactive" tone="warning" /> : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <SubcontractorFormModal
          sub={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
          onDeleted={() => {
            setShowForm(false);
            load();
          }}
        />
      ) : null}
    </>
  );
}

// ─── Templates tab ────────────────────────────────────────────────────────────

function TemplatesTab() {
  const [stored, setStored] = useState<Record<string, StoredTemplate | null>>(() => {
    const data: Record<string, StoredTemplate | null> = {};
    for (const name of TEMPLATE_NAMES) {
      data[name] = getTemplate(name);
    }
    return data;
  });

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
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">SOP Templates</h1>
          <p className="text-sm text-muted-foreground">
            Upload files here — links in the Process SOP map will download them.
          </p>
        </div>
        <div className="text-sm text-muted-foreground">
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
    </>
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

      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium">{name}</div>
        {stored ? (
          <div className="truncate text-xs text-muted-foreground">
            {stored.fileName} &middot; {(stored.size / 1024).toFixed(0)} KB &middot;{" "}
            {new Date(stored.uploadedAt).toLocaleDateString()}
          </div>
        ) : (
          <div className="text-xs text-muted-foreground">No file uploaded</div>
        )}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {stored && (
          <>
            <button
              type="button"
              onClick={onDownload}
              className="flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
            >
              <Download className="size-3" />
              Download
            </button>
            <button
              type="button"
              onClick={onRemove}
              className="flex items-center gap-1 text-xs text-destructive underline-offset-2 hover:underline"
            >
              <X className="size-3" />
              Remove
            </button>
          </>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-muted"
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
