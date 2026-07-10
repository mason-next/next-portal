"use client";

import { useEffect, useRef, useState } from "react";
import {
  Building2,
  Download,
  ExternalLink,
  FileCheck,
  FileText,
  Layers,
  ListTodo,
  MapPin,
  Settings2,
  ShieldCheck,
  Upload,
  Users,
  Warehouse,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/shared/Skeleton";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { useSession } from "@/lib/auth/client";
import { getEffectiveLevel } from "@/lib/module-permissions";
import { DefaultsTab } from "@/modules/admin/components/DefaultsTab";
import { WorkflowTemplateTab } from "@/modules/admin/components/WorkflowTemplateTab";
import { TaskTemplatesTab } from "@/modules/admin/components/TaskTemplatesTab";
import { UserFormModal } from "@/modules/admin/components/UserFormModal";
import { SubcontractorFormModal } from "@/modules/admin/components/SubcontractorFormModal";
import { WarehouseFormModal } from "@/modules/admin/components/WarehouseFormModal";
import { LicensesTab } from "@/modules/admin/components/LicensesTab";
import { PermissionsTab } from "@/modules/admin/components/PermissionsTab";
import { getAllSubcontractors } from "@/lib/data/subcontractors";
import {
  deleteWarehouse,
  getWarehouses,
  seedDefaultWarehouses,
} from "@/lib/data/warehouses";
import {
  TEMPLATE_NAMES,
  downloadTemplate,
  getTemplate,
  removeTemplate,
  storeTemplate,
  type StoredTemplate,
} from "@/lib/templateStore";
import { cn } from "@/lib/utils";
import { ROLE_TYPE_LABELS } from "@/types/user";
import type { AppUser } from "@/types/user";
import type { Subcontractor } from "@/types/subcontractor";
import type { Warehouse as WarehouseType } from "@/types/warehouse";
import { useIsAdmin } from "@/lib/hooks/useCanEdit";

type Tab = "users" | "subcontractors" | "licenses" | "templates" | "permissions" | "defaults" | "warehouses";
type TemplatesSubTab = "sop" | "tasks" | "workflow";

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
  const isAdmin = useIsAdmin();
  const session = useSession();
  const canManageUsers = isAdmin || getEffectiveLevel(session.roleTypes, "users") === "administrator";
  const [tab, setTab] = useState<Tab>("users");
  const [templatesSubTab, setTemplatesSubTab] = useState<TemplatesSubTab>("sop");

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* Main tab bar */}
      <div className="mb-0 flex items-center gap-0 border-b">
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
            <TabButton active={tab === "licenses"} onClick={() => setTab("licenses")}>
              <FileCheck className="size-4" />
              Licenses
            </TabButton>
            <TabButton active={tab === "templates"} onClick={() => setTab("templates")}>
              <FileText className="size-4" />
              Templates
            </TabButton>
            <TabButton active={tab === "permissions"} onClick={() => setTab("permissions")}>
              <ShieldCheck className="size-4" />
              Permissions
            </TabButton>
            <TabButton active={tab === "warehouses"} onClick={() => setTab("warehouses")}>
              <Warehouse className="size-4" />
              Warehouses
            </TabButton>
            <TabButton active={tab === "defaults"} onClick={() => setTab("defaults")}>
              <Settings2 className="size-4" />
              Defaults
            </TabButton>
          </>
        ) : null}
      </div>

      {/* Templates sub-tab bar */}
      {tab === "templates" && isAdmin ? (
        <div className="mb-6 flex items-center gap-0 border-b bg-muted/30 -mx-8 px-8">
          <SubTabButton active={templatesSubTab === "sop"} onClick={() => setTemplatesSubTab("sop")}>
            <FileText className="size-3.5" />
            SOP Templates
          </SubTabButton>
          <SubTabButton active={templatesSubTab === "tasks"} onClick={() => setTemplatesSubTab("tasks")}>
            <ListTodo className="size-3.5" />
            Task Templates
          </SubTabButton>
          <SubTabButton active={templatesSubTab === "workflow"} onClick={() => setTemplatesSubTab("workflow")}>
            <Layers className="size-3.5" />
            Workflow Templates
          </SubTabButton>
        </div>
      ) : (
        <div className="mb-6" />
      )}

      {tab === "users" ? (
        <UsersTab isAdmin={canManageUsers} />
      ) : tab === "subcontractors" ? (
        <SubcontractorsTab />
      ) : tab === "licenses" ? (
        <LicensesTab />
      ) : tab === "templates" ? (
        templatesSubTab === "sop" ? (
          <TemplatesTab />
        ) : templatesSubTab === "tasks" ? (
          <TaskTemplatesTab />
        ) : (
          <WorkflowTemplateTab />
        )
      ) : tab === "warehouses" ? (
        <WarehousesTab />
      ) : tab === "defaults" ? (
        <DefaultsTab />
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

function SubTabButton({
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
        "flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium transition-colors",
        active
          ? "border-primary text-foreground"
          : "border-transparent text-muted-foreground hover:text-foreground"
      )}
    >
      {children}
    </button>
  );
}

// ─── Users tab ────────────────────────────────────────────────────────────────

function UsersTab({ isAdmin }: { isAdmin: boolean }) {
  const { users, isLoading, refetch } = useUsersContext();
  const session = useSession();
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [showForm, setShowForm] = useState(false);

  const displayUsers = isAdmin ? users : users.filter((u) => u.id === session.id);

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
                  <div className="text-xs text-muted-foreground">
                    {user.roleTypes.map((r) => ROLE_TYPE_LABELS[r as keyof typeof ROLE_TYPE_LABELS] ?? r).join(", ")}
                  </div>
                </div>
                {user.roleTypes.includes("Administrator") ? (
                  <StatusBadge label="Administrator" tone="info" />
                ) : null}
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

// ─── Warehouses tab ───────────────────────────────────────────────────────────

function WarehousesTab() {
  const [warehouses, setWarehouses] = useState<WarehouseType[] | null>(null);
  const [editing, setEditing] = useState<WarehouseType | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [seeding, setSeeding] = useState(false);

  function load() {
    getWarehouses().then(setWarehouses);
  }

  useEffect(() => {
    load();
  }, []);

  async function handleSeedDefaults() {
    setSeeding(true);
    try {
      await seedDefaultWarehouses();
      load();
    } finally {
      setSeeding(false);
    }
  }

  const locationLine = (w: WarehouseType) => {
    const parts = [w.city, w.state].filter(Boolean).join(", ");
    return parts || w.address || null;
  };

  const mapsQuery = (w: WarehouseType) =>
    [w.address, w.city, w.state, w.zip].filter(Boolean).join(", ");

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Warehouses</h1>
          <p className="text-sm text-muted-foreground">
            Shipping destinations used in BOM releases. Active warehouses appear in the Ship To dropdown.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {warehouses?.length === 0 ? (
            <Button variant="outline" onClick={handleSeedDefaults} disabled={seeding}>
              {seeding ? "Seeding…" : "Seed Defaults"}
            </Button>
          ) : null}
          <Button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            New Warehouse
          </Button>
        </div>
      </div>

      {warehouses === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : warehouses.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No warehouses yet. Click &ldquo;Seed Defaults&rdquo; to add NY and Miami, or add one manually.
        </p>
      ) : (
        <ul className="divide-y rounded-xl border bg-card">
          {warehouses.map((w) => (
            <li key={w.id}>
              <button
                type="button"
                onClick={() => {
                  setEditing(w);
                  setShowForm(true);
                }}
                className={cn(
                  "flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-accent",
                  !w.isActive && "opacity-50"
                )}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Warehouse className="size-5 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{w.name}</div>
                  {locationLine(w) ? (
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {locationLine(w)}
                    </div>
                  ) : null}
                  {w.contact ? (
                    <div className="text-xs text-muted-foreground">{w.contact}</div>
                  ) : null}
                </div>
                {mapsQuery(w) ? (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapsQuery(w))}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline shrink-0"
                  >
                    <ExternalLink className="size-3" />
                    Maps
                  </a>
                ) : null}
                {!w.isActive ? <StatusBadge label="Inactive" tone="warning" /> : null}
              </button>
            </li>
          ))}
        </ul>
      )}

      {showForm ? (
        <WarehouseFormModal
          warehouse={editing}
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

// ─── Templates tab (SOP) ──────────────────────────────────────────────────────

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
