"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationsContext } from "@/modules/notifications/hooks/NotificationsContext";
import type { Notification } from "@/types/notification";

// No pagination anywhere in this app — cap the rendered list as cheap insurance against an
// unbounded panel in a long-lived browser profile.
const MAX_VISIBLE = 50;

function relativeTime(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(isoDate).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function NotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, isLoading, markRead, markAllRead } = useNotificationsContext();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  function handleSelect(notification: Notification) {
    markRead(notification.id);
    setOpen(false);
    router.push(`/projects/${notification.projectId}?activity=${notification.commentId}`);
  }

  const visible = notifications.slice(0, MAX_VISIBLE);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 ? (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-xs font-semibold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 z-30 mt-2 w-96 max-h-[28rem] overflow-y-auto rounded-md border bg-card shadow-lg">
          <div className="flex items-center justify-between border-b px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            <button
              type="button"
              onClick={() => markAllRead()}
              className="text-xs text-muted-foreground hover:text-foreground hover:underline"
            >
              Mark all read
            </button>
          </div>

          {isLoading ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <ul>
              {visible.map((notification) => (
                <li key={notification.id} className="flex items-start gap-2.5 border-b px-4 py-3 last:border-b-0 hover:bg-accent">
                  <button
                    type="button"
                    onClick={() => handleSelect(notification)}
                    className="flex min-w-0 flex-1 items-start gap-2.5 text-left"
                  >
                    <span
                      className={cn(
                        "mt-1.5 size-2 shrink-0 rounded-full",
                        notification.isRead ? "bg-transparent" : "bg-sky-500"
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm">{notification.message}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">{notification.commentPreview}</p>
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {relativeTime(notification.createdAt)}
                      </span>
                    </div>
                  </button>
                  {!notification.isRead ? (
                    <button
                      type="button"
                      onClick={() => markRead(notification.id)}
                      className="shrink-0 text-xs text-muted-foreground hover:text-foreground hover:underline"
                      title="Mark as read"
                    >
                      Mark read
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
