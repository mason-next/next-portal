"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useSession } from "@/lib/auth/client";
import {
  getNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/data/notifications";
import type { Notification } from "@/types/notification";

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
  const session = useSession();
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    const poll = () => {
      getNotificationsForUser(session.id).then((loaded) => {
        if (active) setNotifications(loaded);
      });
    };
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [session.id, reloadToken]);

  function refetch() {
    setReloadToken((t) => t + 1);
  }

  async function markRead(id: string) {
    await markNotificationRead(id);
    refetch();
  }

  async function markAllRead() {
    await markAllNotificationsRead(session.id);
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
