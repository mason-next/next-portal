"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { CURRENT_USER_ID } from "@/lib/current-user";
import {
  getNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/data/notifications";
import type { Notification } from "@/types/notification";

// No real push channel in this prototype, so a light poll while mounted (i.e. always, since
// this provider wraps the whole app) is what keeps the unread badge from going stale — same
// idiom as ProjectActivityDrawer's POLL_INTERVAL_MS.
const POLL_INTERVAL_MS = 6000;

interface NotificationsApi {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  markRead: (id: string) => void;
  markAllRead: () => void;
  refetch: () => void;
}

const NotificationsContext = createContext<NotificationsApi | null>(null);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    const poll = () => {
      getNotificationsForUser(CURRENT_USER_ID).then((loaded) => {
        if (active) setNotifications(loaded);
      });
    };
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [reloadToken]);

  function refetch() {
    setReloadToken((t) => t + 1);
  }

  async function markRead(id: string) {
    await markNotificationRead(id);
    refetch();
  }

  async function markAllRead() {
    await markAllNotificationsRead(CURRENT_USER_ID);
    refetch();
  }

  const unreadCount = notifications?.filter((n) => !n.isRead).length ?? 0;

  return (
    <NotificationsContext.Provider
      value={{
        notifications: notifications ?? [],
        unreadCount,
        isLoading: notifications === null,
        markRead,
        markAllRead,
        refetch,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext(): NotificationsApi {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotificationsContext must be used within a NotificationsProvider");
  return ctx;
}
