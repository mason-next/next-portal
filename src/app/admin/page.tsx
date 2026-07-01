"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, Download, FileText, MapPin, ShieldCheck, Upload, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/shared/Skeleton";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { useSession } from "@/lib/auth/client";
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
import {
  DEFAULT_PERMISSIONS,
  PERMISSION_FEATURES,
  PERMISSION_FEATURE_LABELS,
  type PermissionsConfig,
} from "@/lib/permissions";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/types/user";
import type { Subcontractor } from "@/types/subcontractor";

type Tab = "users" | "subcontractors" | "templates" | "permissions";

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
  const session = useSession();
  const isAdmin = session.accountType === "Administrator";
  const isMember = session.accountType === "Member";
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
        {isAdmin ? (
          <>
            <TabButton active={tab === "templates"} onClick={() => setTab("templates")}>
              <FileText className="size-4" />
              Templates
            </TabButton>
            <TabButton active={tab === "permissions"} onClick={() => setTab("permissions")}>
              <ShieldCheck className="size-4" />
              Permissions
            </TabButton>
          </>
        ) : null}
      </div>

      {tab === "users" ? (
        <UsersTab isAdmin={isAdmin} selfId={isMember ? session.id : undefined} />
      ) : tab === "subcontractors" ? (
        <SubcontractorsTab />
      ) : tab === "templates" ? (
        <TemplatesTab />
      ) : (
        <PermissionsTab />
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

function UsersTab({ isAdmin, selfId }: { isAdmin: boolean; selfId?: string }) {
  const { users, isLoading, refetch } = useUsersContext();
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [showForm, setShowForm] = useState(false);

  // Members see only themselves; admins see all
  const displayUsers = selfId ? users.filter((u) => u.id === selfId) : users;

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Users</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin
              ? "Manage the people who can be assigned to projects and workflow steps."
              : "Your account details."}
          </p>
        </div>
        {isAdmin ? (
          <Button
            onClick={() => {
              setEditingUser(null);
              setShowForm(true);
            }}
          >
            New User
          </Button>
        ) : null}
      </div>

      {isLoading ? (
        <div className="rounded-xl border bg-card divide-y">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 px-5 py-4">
              <Skeleton className="h-10 w-10 rounded-full shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))}
        </div>
      ) : displayUsers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No users yet.</p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {displayUsers.map((user) => {
            const rowContent = (
              <>
                <UserAvatarImage name={user.name} avatarUrl={user.avatarUrl} size={40} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.title || "—"}</div>
                </div>
                <StatusBadge label={user.accountType} tone={user.accountType === "Administrator" ? "info" : "neutral"} />
                {!user.isActive ? <StatusBadge label="Inactive" tone="warning" /> : null}
                <div className="text-xs text-muted-foreground">{user.email}</div>
              </>
            );

            return (
              <li key={user.id}>
                {isAdmin ? (
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
                    {rowContent}
                  </button>
                ) : (
                  <div className={cn("flex w-full items-center gap-3 px-5 py-4", !user.isActive && "opacity-50")}>
                    {rowContent}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {isAdmin ? (
        <div className="mt-8">
          <DefaultKickoffAttendeesCard />
        </div>
      ) : null}

      {isAdmin && showForm ? (
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

// ─── Permissions tab ──────────────────────────────────────────────────────────

const CONFIGURABLE_ACCOUNT_TYPES = ["Member", "Viewer"] as const;
type ConfigurableType = (typeof CONFIGURABLE_ACCOUNT_TYPES)[number];

function PermissionsTab() {
  const [config, setConfig] = useState<PermissionsConfig | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/permissions")
      .then((r) => r.json())
      .then(setConfig);
  }, []);

  function toggle(accountType: ConfigurableType, feature: (typeof PERMISSION_FEATURES)[number]) {
    setConfig((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        [accountType]: {
          ...prev[accountType],
          [feature]: !prev[accountType][feature],
        },
      };
    });
    setSaved(false);
  }

  async function handleSave() {
    if (!config) return;
    setSaving(true);
    await fetch("/api/admin/permissions", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setSaving(false);
    setSaved(true);
  }

  function handleReset() {
    setConfig(DEFAULT_PERMISSIONS);
    setSaved(false);
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Permissions</h1>
          <p className="text-sm text-muted-foreground">
            Control which sections each account type can access. Administrators always have full access.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-muted transition-colors"
          >
            Reset defaults
          </button>
          <Button onClick={handleSave} disabled={saving || !config}>
            {saving ? "Saving…" : saved ? "Saved ✓" : "Save Changes"}
          </Button>
        </div>
      </div>

      {!config ? (
        <div className="rounded-xl border bg-card divide-y">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="flex items-center gap-4 px-5 py-4">
              <Skeleton className="h-4 w-40" />
              <div className="ml-auto flex gap-12">
                <Skeleton className="h-5 w-10 rounded-full" />
                <Skeleton className="h-5 w-10 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          {/* Header row */}
          <div className="flex items-center gap-4 px-5 py-3 border-b bg-muted/30">
            <div className="flex-1 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Feature / Section
            </div>
            {CONFIGURABLE_ACCOUNT_TYPES.map((t) => (
              <div key={t} className="w-24 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                {t}
              </div>
            ))}
            <div className="w-24 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Admin
            </div>
          </div>

          {/* Feature rows */}
          {PERMISSION_FEATURES.map((feature) => (
            <div key={feature} className="flex items-center gap-4 px-5 py-3.5 border-b last:border-0 hover:bg-accent/30 transition-colors">
              <div className="flex-1 text-sm font-medium">
                {PERMISSION_FEATURE_LABELS[feature]}
              </div>
              {CONFIGURABLE_ACCOUNT_TYPES.map((accountType) => (
                <div key={accountType} className="w-24 flex justify-center">
                  <button
                    type="button"
                    onClick={() => toggle(accountType, feature)}
                    aria-label={`Toggle ${feature} for ${accountType}`}
                    className={cn(
                      "relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1",
                      config[accountType][feature] ? "bg-primary" : "bg-muted-foreground/30"
                    )}
                  >
                    <span
                      className={cn(
                        "inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform",
                        config[accountType][feature] ? "translate-x-[18px]" : "translate-x-0.5"
                      )}
                    />
                  </button>
                </div>
              ))}
              {/* Admin always on */}
              <div className="w-24 flex justify-center">
                <span className="inline-flex h-5 w-9 items-center rounded-full bg-primary/30 cursor-not-allowed">
                  <span className="inline-block h-3.5 w-3.5 translate-x-[18px] transform rounded-full bg-primary/60 shadow" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="mt-3 text-xs text-muted-foreground">
        Changes take effect on the user&apos;s next page load. Navigation items are hidden for restricted account types.
      </p>
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
