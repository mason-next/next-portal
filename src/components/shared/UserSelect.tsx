"use client";

import { useEffect, useRef, useState } from "react";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import { cn } from "@/lib/utils";
import { ROLE_NOT_NEEDED } from "@/lib/role-assignment";
import type { AppUser } from "@/types/user";

interface UserSelectProps {
  users: AppUser[];
  value: string | null;
  onChange: (userId: string | null) => void;
  placeholder?: string;
  allowNotNeeded?: boolean;
}

export function UserSelect({
  users,
  value,
  onChange,
  placeholder = "Unassigned",
  allowNotNeeded = false,
}: UserSelectProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const isNotNeeded = value === ROLE_NOT_NEEDED;
  const selected = !isNotNeeded ? users.find((u) => u.id === value) ?? null : null;

  const filtered = filter.trim()
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(filter.toLowerCase()) ||
          u.title.toLowerCase().includes(filter.toLowerCase())
      )
    : users;

  useEffect(() => {
    if (!open) {
      setFilter("");
      return;
    }
    // Auto-focus the search input when the dropdown opens.
    requestAnimationFrame(() => searchRef.current?.focus());

    function onOutside(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-full items-center gap-2 rounded-md border border-input bg-background px-3 text-sm outline-none focus:border-primary"
      >
        {isNotNeeded ? (
          <span className="text-muted-foreground">Not Needed</span>
        ) : selected ? (
          <>
            <UserAvatarImage name={selected.name} avatarUrl={selected.avatarUrl} size={20} />
            <span className="truncate">{selected.name}</span>
          </>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </button>

      {open ? (
        <div className="absolute z-30 mt-1 w-full rounded-md border bg-card shadow-lg">
          {/* Search input */}
          <div className="border-b p-1.5">
            <input
              ref={searchRef}
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Search…"
              className="h-7 w-full rounded border border-input bg-background px-2 text-sm outline-none focus:border-primary"
            />
          </div>

          <div className="max-h-56 overflow-auto py-1">
            {/* Unassigned / placeholder option */}
            <button
              type="button"
              onClick={() => { onChange(null); setOpen(false); }}
              className={cn(
                "flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent",
                value === null && "bg-accent"
              )}
            >
              <span className="text-muted-foreground">{placeholder}</span>
            </button>

            {/* Not Needed option */}
            {allowNotNeeded ? (
              <button
                type="button"
                onClick={() => { onChange(ROLE_NOT_NEEDED); setOpen(false); }}
                className={cn(
                  "flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent",
                  isNotNeeded && "bg-accent"
                )}
              >
                <span className="text-muted-foreground">Not Needed</span>
              </button>
            ) : null}

            {/* Filtered user list */}
            {filtered.map((user) => (
              <button
                key={user.id}
                type="button"
                onClick={() => { onChange(user.id); setOpen(false); }}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                  value === user.id && "bg-accent"
                )}
              >
                <UserAvatarImage name={user.name} avatarUrl={user.avatarUrl} size={24} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">{user.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">{user.title}</span>
                </span>
              </button>
            ))}

            {filtered.length === 0 && filter.trim() && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No users match "{filter}"</p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
