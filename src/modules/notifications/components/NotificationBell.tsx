"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AtSign, Bell, CheckCircle2, Package, UserPlus, Workflow } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNotificationsContext } from "@/modules/notifications/hooks/NotificationsContext";
import type { Notification, NotificationType } from "@/types/notification";

const MAX_VISIBLE = 50;

const TYPE_ICON: Record<NotificationType, typeof Bell> = {
  mention: AtSign,
  assignment: UserPlus,
  approval_needed: CheckCircle2,
  approval_decision: CheckCircle2,
  status_change: Workflow,
  project_assigned: UserPlus,
  procurement_update: Package,
  daily_report: Bell,
};

const TYPE_COLOR: Record<NotificationType, string> = {
  mention: "bg-sky-100 text-sky-600",
  assignment: "bg-violet-100 text-violet-600",
  approval_needed: "bg-amber-100 text-amber-600",
  approval_decision: "bg-emerald-100 text-emerald-600",
  status_change: "bg-orange-100 text-orange-600",
  project_assigned: "bg-violet-100 text-violet-600",
  procurement_update: "bg-teal-100 text-teal-600",
  daily_report: "bg-slate-100 text-slate-600",
};

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

// Builds the navigation destination for a notification based on its type.
function notificationHref(n: Notification): string {
  const base = `/projects/${n.projectId}`;
  switch (n.type) {
    case "mention":
      return n.commentId ? `${base}?activity=${n.commentId}` : base;
    case "assignment":
    case "approval_needed":
    case "approval_decision":
      return base;
    case "procurement_update":
      return `${base}/procurement/equipment-tracking`;
    case "project_assigned":
    case "status_change":
    case "daily_report":
    default:
      return base;
  }
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
    router.push(notificationHref(notification));
  }

  const visible = notifications.slice(0, MAX_VISIBLE);
  const unread = visible.filter((n) => !n.isRead);
  const read = visible.filter((n) => n.isRead);

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
        <div className="absolute right-0 z-30 mt-2 w-96 max-h-[32rem] overflow-y-auto rounded-md border bg-card shadow-lg">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-card px-4 py-2.5">
            <span className="text-sm font-semibold">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => markAllRead()}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          {isLoading ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="px-4 py-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <ul>
              {[...unread, ...read].map((notification) => {
                const Icon = TYPE_ICON[notification.type] ?? Bell;
                const iconClass = TYPE_COLOR[notification.type] ?? "bg-muted text-muted-foreground";
                return (
                  <li
                    key={notification.id}
                    className={cn(
                      "border-b last:border-b-0",
                      !notification.isRead && "bg-sky-50/50"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelect(notification)}
                      className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-accent"
                    >
                      <div className={cn("mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full", iconClass)}>
                        <Icon className="size-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={cn("text-sm", !notification.isRead && "font-medium")}>
                          {notification.message}
                        </p>
                        {notification.commentPreview && (
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {notification.commentPreview}
                          </p>
                        )}
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {relativeTime(notification.createdAt)} · {notification.projectName}
                        </span>
                      </div>
                      {!notification.isRead && (
                        <span className="mt-2 size-2 shrink-0 rounded-full bg-sky-500" />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
