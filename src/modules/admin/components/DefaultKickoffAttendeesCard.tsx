"use client";

import { useEffect, useState } from "react";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { getDefaultKickoffAttendeeIds, setDefaultKickoffAttendeeIds } from "@/lib/data/kickoff-settings";

export function DefaultKickoffAttendeesCard() {
  const { users } = useUsersContext();
  const [selectedIds, setSelectedIds] = useState<string[] | null>(null);

  useEffect(() => {
    let active = true;
    getDefaultKickoffAttendeeIds().then((ids) => {
      if (active) setSelectedIds(ids);
    });
    return () => {
      active = false;
    };
  }, []);

  function toggle(userId: string) {
    const current = selectedIds ?? [];
    const next = current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId];
    setSelectedIds(next);
    setDefaultKickoffAttendeeIds(next);
  }

  const activeUsers = users.filter((u) => u.isActive);

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-1 text-sm font-semibold">Default Internal Kickoff Attendees</div>
      <p className="mb-3 text-sm text-muted-foreground">
        Always included on the Internal Kickoff invite, in addition to the project&apos;s assigned team.
      </p>
      {selectedIds === null ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : activeUsers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No active users yet.</p>
      ) : (
        <div className="space-y-1.5">
          {activeUsers.map((user) => (
            <label key={user.id} className="flex items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                className="size-4 accent-primary"
                checked={selectedIds.includes(user.id)}
                onChange={() => toggle(user.id)}
              />
              <UserAvatarImage name={user.name} avatarUrl={user.avatarUrl} size={22} />
              <span>{user.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
