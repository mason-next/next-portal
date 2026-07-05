"use client";

import { useEffect, useRef, useState } from "react";
import { X, Plus, Building2, Ban } from "lucide-react";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import { createSubcontractorQuick, getSubcontractors } from "@/lib/data/subcontractors";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/types/user";
import type { Subcontractor, ProjectTechnicianEntry } from "@/types/subcontractor";

interface TechnicianMultiSelectProps {
  users: AppUser[];
  value: ProjectTechnicianEntry[];
  onChange: (entries: ProjectTechnicianEntry[]) => void;
  notNeeded?: boolean;
  onNotNeededChange?: (v: boolean) => void;
}

export function TechnicianMultiSelect({
  users,
  value,
  onChange,
  notNeeded = false,
  onNotNeededChange,
}: TechnicianMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [subs, setSubs] = useState<Subcontractor[]>([]);
  const [addingNewSub, setAddingNewSub] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [creating, setCreating] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getSubcontractors().then(setSubs);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onOutside(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
        setAddingNewSub(false);
      }
    }
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, [open]);

  const selectedUserIds = new Set(value.map((e) => e.userId).filter((id): id is string => id !== null));
  const selectedSubIds = new Set(value.map((e) => e.subcontractorId).filter((id): id is string => id !== null));

  function setNotNeeded(v: boolean) {
    onNotNeededChange?.(v);
    if (v) onChange([]); // clear actual entries when marking not needed
    else setOpen(true);  // open picker when switching back to normal
  }

  function toggleUser(user: AppUser) {
    if (selectedUserIds.has(user.id)) {
      onChange(value.filter((e) => e.userId !== user.id));
    } else {
      onChange([
        ...value,
        {
          id: "",
          userId: user.id,
          userName: user.name,
          avatarUrl: user.avatarUrl ?? null,
          subcontractorId: null,
          subcontractorName: null,
          trade: "",
        },
      ]);
    }
  }

  function toggleSub(sub: Subcontractor) {
    if (selectedSubIds.has(sub.id)) {
      onChange(value.filter((e) => e.subcontractorId !== sub.id));
    } else {
      onChange([
        ...value,
        {
          id: "",
          userId: null,
          userName: null,
          avatarUrl: null,
          subcontractorId: sub.id,
          subcontractorName: sub.name,
          trade: sub.trade,
        },
      ]);
    }
  }

  function removeEntry(entry: ProjectTechnicianEntry) {
    onChange(value.filter((e) => e !== entry));
  }

  async function handleCreateSub() {
    const name = newSubName.trim();
    if (!name) return;
    setCreating(true);
    const created = await createSubcontractorQuick(name);
    setSubs((prev) => [...prev, created]);
    onChange([
      ...value,
      {
        id: "",
        userId: null,
        userName: null,
        avatarUrl: null,
        subcontractorId: created.id,
        subcontractorName: created.name,
        trade: created.trade,
      },
    ]);
    setNewSubName("");
    setAddingNewSub(false);
    setCreating(false);
  }

  // "Not Needed" active state: show badge + revert button
  if (notNeeded) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 text-sm text-muted-foreground">
          <Ban className="h-3.5 w-3.5" />
          Not Needed
        </span>
        <button
          type="button"
          onClick={() => setNotNeeded(false)}
          className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
        >
          Assign technicians
        </button>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative">
      {value.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1.5">
          {value.map((entry, i) => (
            <span
              key={entry.userId ?? entry.subcontractorId ?? i}
              className="flex items-center gap-1 rounded-full bg-accent px-2 py-0.5 text-sm"
            >
              {entry.userId ? (
                <UserAvatarImage name={entry.userName ?? ""} avatarUrl={entry.avatarUrl} size={16} />
              ) : (
                <Building2 className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
              )}
              <span className="max-w-[120px] truncate">{entry.userName ?? entry.subcontractorName ?? "Unknown"}</span>
              <button
                type="button"
                onClick={() => removeEntry(entry)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Trigger row — "Add…" button + "Not Needed" toggle side by side */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex h-9 flex-1 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm text-muted-foreground outline-none hover:border-primary focus:border-primary"
        >
          <Plus className="h-4 w-4 shrink-0" />
          Add technician or subcontractor…
        </button>
        {onNotNeededChange && (
          <button
            type="button"
            onClick={() => { setNotNeeded(true); setOpen(false); }}
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-md border border-input px-3 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Ban className="h-3.5 w-3.5" />
            Not Needed
          </button>
        )}
      </div>

      {open ? (
        <div className="absolute z-30 mt-1 max-h-72 w-full overflow-auto rounded-md border bg-card py-1 shadow-lg">
          {users.length > 0 && (
            <div className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Team
            </div>
          )}
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => toggleUser(user)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                selectedUserIds.has(user.id) && "bg-accent"
              )}
            >
              <UserAvatarImage name={user.name} avatarUrl={user.avatarUrl} size={24} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{user.name}</span>
                <span className="block truncate text-xs text-muted-foreground">{user.title}</span>
              </span>
              {selectedUserIds.has(user.id) && <span className="text-xs text-primary">✓</span>}
            </button>
          ))}

          {subs.length > 0 && (
            <div className="mt-1 border-t px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Subcontractors
            </div>
          )}
          {subs.map((sub) => (
            <button
              key={sub.id}
              type="button"
              onClick={() => toggleSub(sub)}
              className={cn(
                "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                selectedSubIds.has(sub.id) && "bg-accent"
              )}
            >
              <Building2 className="h-5 w-5 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{sub.name}</span>
                {sub.trade && <span className="block truncate text-xs text-muted-foreground">{sub.trade}</span>}
              </span>
              {selectedSubIds.has(sub.id) && <span className="text-xs text-primary">✓</span>}
            </button>
          ))}

          <div className="border-t">
            {addingNewSub ? (
              <div className="flex items-center gap-2 px-3 py-2">
                <input
                  autoFocus
                  type="text"
                  placeholder="Subcontractor name…"
                  value={newSubName}
                  onChange={(e) => setNewSubName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateSub();
                    if (e.key === "Escape") setAddingNewSub(false);
                  }}
                  className="h-7 flex-1 rounded border border-input bg-background px-2 text-sm outline-none focus:border-primary"
                />
                <button
                  type="button"
                  onClick={handleCreateSub}
                  disabled={creating || !newSubName.trim()}
                  className="rounded bg-primary px-2.5 py-1 text-xs text-primary-foreground disabled:opacity-50"
                >
                  {creating ? "Adding…" : "Add"}
                </button>
                <button
                  type="button"
                  onClick={() => setAddingNewSub(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingNewSub(true)}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Plus className="h-4 w-4 shrink-0" />
                Add new subcontractor…
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
