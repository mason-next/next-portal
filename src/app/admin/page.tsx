"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { UserFormModal } from "@/modules/admin/components/UserFormModal";
import { cn } from "@/lib/utils";
import type { AppUser } from "@/types/user";

export default function AdminPage() {
  const { users, isLoading, refetch } = useUsersContext();
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [showForm, setShowForm] = useState(false);

  return (
    <div className="mx-auto max-w-3xl p-8">
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
