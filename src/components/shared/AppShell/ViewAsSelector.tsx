"use client";

import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { useSession } from "@/lib/auth/client";
import { useViewAs, type ViewAsUser } from "@/lib/view-as/ViewAsContext";
import { cn } from "@/lib/utils";

interface Props {
  onClose: () => void;
}

export function ViewAsSelector({ onClose }: Props) {
  const session = useSession();
  const { users } = useUsersContext();
  const { viewAsUser, isViewAsMode, startViewAs, switchViewAs } = useViewAs();
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Exclude the signed-in admin from the list (viewing yourself is pointless)
  const filtered = users
    .filter((u) => u.isActive && u.id !== session.id)
    .filter((u) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.title.toLowerCase().includes(q) ||
        u.roleTypes.some((r) => r.toLowerCase().includes(q))
      );
    });

  async function handleSelect(user: ViewAsUser) {
    setPending(true);
    try {
      if (isViewAsMode) {
        await switchViewAs(user);
      } else {
        await startViewAs(user);
      }
      onClose();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-xl border bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-4 py-3">
          <span className="text-sm font-semibold">View As</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b px-3 py-2">
          <div className="flex items-center gap-2">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search by name, email, or role…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* User list */}
        <ul className="max-h-80 overflow-y-auto py-1">
          {filtered.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-muted-foreground">No users found</li>
          ) : (
            filtered.map((user) => {
              const isCurrent = viewAsUser?.id === user.id;
              return (
                <li key={user.id}>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() =>
                      handleSelect({
                        id: user.id,
                        name: user.name,
                        email: user.email,
                        roleTypes: user.roleTypes,
                      })
                    }
                    className={cn(
                      "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-muted disabled:opacity-50",
                      isCurrent && "bg-primary/5"
                    )}
                  >
                    {/* Avatar placeholder */}
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium leading-tight">{user.name}</span>
                        {isCurrent && (
                          <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary">
                            Current
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-muted-foreground">{user.email}</div>
                      {user.title && (
                        <div className="truncate text-xs text-muted-foreground">{user.title}</div>
                      )}
                      {user.roleTypes.length > 0 && (
                        <div className="mt-0.5 flex flex-wrap gap-1">
                          {user.roleTypes.map((r) => (
                            <span
                              key={r}
                              className="rounded-sm bg-muted px-1 py-0.5 text-[10px] text-muted-foreground"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </button>
                </li>
              );
            })
          )}
        </ul>

        {/* Footer */}
        <div className="border-t px-4 py-3 text-xs text-muted-foreground">
          Viewing as another user is read-only. No actions will be performed as that user.
        </div>
      </div>
    </div>
  );
}
