"use client";

import { useEffect, useRef, useState } from "react";
import type { AppUser } from "@/types/user";
import { cn } from "@/lib/utils";

// ── Avatar ────────────────────────────────────────────────────────────────────

export function UserAvatar({ user, size = 28 }: { user: AppUser; size?: number }) {
  const initials = user.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
  if (user.avatarUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={user.avatarUrl} alt={user.name}
        style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      background: "hsl(var(--primary)/0.12)", color: "hsl(var(--primary))",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontSize: size * 0.38, fontWeight: 700, flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

// ── Picker ────────────────────────────────────────────────────────────────────

interface UserPickerProps {
  /** Controlled: the selected user's ID, or "" for none */
  value: string;
  onChange: (user: AppUser | null) => void;
  placeholder?: string;
  /** Pass users explicitly, or leave undefined to auto-fetch from /api/users */
  users?: AppUser[];
}

export function UserPicker({ value, onChange, placeholder = "Search users…", users: externalUsers }: UserPickerProps) {
  const [users, setUsers] = useState<AppUser[]>(externalUsers ?? []);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-fetch if not provided
  useEffect(() => {
    if (externalUsers) { setUsers(externalUsers); return; }
    fetch("/api/users").then((r) => r.json()).then(setUsers).catch(() => {});
  }, [externalUsers]);

  const selected = users.find((u) => u.id === value) ?? null;
  const filtered = query
    ? users.filter((u) =>
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.title.toLowerCase().includes(query.toLowerCase())
      )
    : users;

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false); setQuery("");
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setTimeout(() => inputRef.current?.focus(), 50); }}
        className="w-full flex items-center gap-2 rounded-md border bg-background px-2.5 py-2 text-sm text-left hover:bg-muted/40 transition-colors"
      >
        {selected ? (
          <>
            <UserAvatar user={selected} size={22} />
            <div className="min-w-0 flex-1">
              <div className="font-medium truncate">{selected.name}</div>
            </div>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(null); }}
              className="text-muted-foreground hover:text-foreground ml-auto flex-shrink-0 text-xs"
            >✕</button>
          </>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
      </button>

      {open && (
        <div className="absolute z-[200] left-0 right-0 top-full mt-1 rounded-lg border bg-card shadow-xl overflow-hidden" style={{ maxHeight: 280 }}>
          <div className="p-2 border-b">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type a name…"
              className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div style={{ overflowY: "auto", maxHeight: 190 }}>
            {filtered.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-muted-foreground">No users found</div>
            ) : filtered.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => { onChange(u); setOpen(false); setQuery(""); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left hover:bg-muted/50 transition-colors",
                  u.id === value && "bg-primary/10 text-primary"
                )}
              >
                <UserAvatar user={u} size={28} />
                <div className="min-w-0">
                  <div className="font-medium truncate">{u.name}</div>
                  <div className="text-xs text-muted-foreground truncate">{u.title}</div>
                </div>
              </button>
            ))}
          </div>
          <div className="border-t px-3 py-2">
            <a
              href="/admin"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => { setOpen(false); setQuery(""); }}
              className="flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
              Add a new user in Admin ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
