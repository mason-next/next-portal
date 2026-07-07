"use client";

import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/types/user";

interface MultiUserSelectProps {
  users: AppUser[];
  value: string[];
  onChange: (userIds: string[]) => void;
  placeholder?: string;
}

export function MultiUserSelect({
  users,
  value,
  onChange,
  placeholder = "Unassigned",
}: MultiUserSelectProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selectedUsers = value
    .map((id) => users.find((u) => u.id === id))
    .filter(Boolean) as AppUser[];

  const filtered = filter.trim()
    ? users.filter(
        (u) =>
          u.name.toLowerCase().includes(filter.toLowerCase()) ||
          u.title.toLowerCase().includes(filter.toLowerCase())
      )
    : users;

  useEffect(() => {
    if (!open) { setFilter(""); return; }
    requestAnimationFrame(() => searchRef.current?.focus());

    function onOutside(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onOutside);
    return () => document.removeEventListener("pointerdown", onOutside);
  }, [open]);

  function toggle(userId: string) {
    if (value.includes(userId)) {
      onChange(value.filter((id) => id !== userId));
    } else {
      onChange([...value, userId]);
    }
  }

  function remove(userId: string, e: React.MouseEvent) {
    e.stopPropagation();
    onChange(value.filter((id) => id !== userId));
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex min-h-9 w-full flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
      >
        {selectedUsers.length === 0 ? (
          <span className="text-muted-foreground">{placeholder}</span>
        ) : (
          selectedUsers.map((u) => (
            <span
              key={u.id}
              className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium"
            >
              <UserAvatarImage name={u.name} avatarUrl={u.avatarUrl} size={16} />
              {u.name}
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => remove(u.id, e)}
                className="ml-0.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" />
              </span>
            </span>
          ))
        )}
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-full rounded-md border bg-card shadow-lg">
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
            {filtered.map((user) => {
              const selected = value.includes(user.id);
              return (
                <button
                  key={user.id}
                  type="button"
                  onClick={() => toggle(user.id)}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                    selected && "bg-accent"
                  )}
                >
                  <UserAvatarImage name={user.name} avatarUrl={user.avatarUrl} size={24} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{user.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{user.title}</span>
                  </span>
                  {selected && (
                    <span className="ml-auto text-xs font-semibold text-primary">✓</span>
                  )}
                </button>
              );
            })}
            {filtered.length === 0 && filter.trim() && (
              <p className="px-3 py-2 text-sm text-muted-foreground">No users match "{filter}"</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
