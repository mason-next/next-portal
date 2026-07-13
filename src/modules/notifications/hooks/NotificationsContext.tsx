"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useSession } from "@/lib/auth/client";
import { useViewAs } from "@/lib/view-as/ViewAsContext";
import {
  getNotificationsForUser,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/data/notifications";
import { mutationBus } from "@/lib/mutation-bus";
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
  const { isViewAsMode, viewAsUser } = useViewAs();
  const [notifications, setNotifications] = useState<Notification[] | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  // Track last fetch time to debounce burst refetches (visibility + mutation bus firing together)
  const lastFetchAt = useRef(0);

  function refetch() {
    setReloadToken((t) => t + 1);
  }

  function debouncedRefetch() {
    const now = Date.now();
    if (now - lastFetchAt.current < 1000) return;
    refetch();
  }

  const effectiveUserId = isViewAsMode && viewAsUser ? viewAsUser.id : session.id;

  useEffect(() => {
    let active = true;
    const poll = () => {
      lastFetchAt.current = Date.now();
      getNotificationsForUser(effectiveUserId).then((loaded) => {
        if (active) setNotifications(loaded);
      });
    };
    poll();
    const interval = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [effectiveUserId, reloadToken]);

  // Refetch immediately when the tab becomes visible again after being hidden.
  useEffect(() => {
    function onVisibilityChange() {
      if (document.visibilityState === "visible") debouncedRefetch();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refetch immediately after any client-side mutation is broadcast via mutationBus.notify().
  useEffect(() => {
    return mutationBus.subscribe(debouncedRefetch);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function markRead(id: string) {
    await markNotificationRead(id);
    refetch();
  }

  async function markAllRead() {
    await markAllNotificationsRead(effectiveUserId);
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
