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
  const rootRef = useRef<HTMLDivElement>(null);
  const isNotNeeded = value === ROLE_NOT_NEEDED;
  const selected = !isNotNeeded ? users.find((u) => u.id === value) ?? null : null;

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
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
        <div className="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-card py-1 shadow-lg">
          <button
            type="button"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
            className={cn(
              "flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent",
              value === null && "bg-accent"
            )}
          >
            <span className="text-muted-foreground">{placeholder}</span>
          </button>
          {allowNotNeeded ? (
            <button
              type="button"
              onClick={() => {
                onChange(ROLE_NOT_NEEDED);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center px-3 py-2 text-left text-sm hover:bg-accent",
                isNotNeeded && "bg-accent"
              )}
            >
              <span className="text-muted-foreground">Not Needed</span>
            </button>
          ) : null}
          {users.map((user) => (
            <button
              key={user.id}
              type="button"
              onClick={() => {
                onChange(user.id);
                setOpen(false);
              }}
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
        </div>
      ) : null}
    </div>
  );
}
