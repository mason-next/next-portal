"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export interface ViewAsUser {
  id: string;
  name: string;
  email: string;
  roleTypes: string[];
}

interface ViewAsContextValue {
  viewAsUser: ViewAsUser | null;
  isViewAsMode: boolean;
  startViewAs: (user: ViewAsUser) => Promise<void>;
  switchViewAs: (user: ViewAsUser) => Promise<void>;
  exitViewAs: () => Promise<void>;
}

const STORAGE_KEY = "next-portal:view-as";
export const VIEW_AS_COOKIE = "next-portal-view-as";

const ViewAsContext = createContext<ViewAsContextValue>({
  viewAsUser: null,
  isViewAsMode: false,
  startViewAs: async () => {},
  switchViewAs: async () => {},
  exitViewAs: async () => {},
});

export function ViewAsProvider({ children }: { children: ReactNode }) {
  const [viewAsUser, setViewAsUser] = useState<ViewAsUser | null>(null);

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored) setViewAsUser(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  async function startViewAs(user: ViewAsUser) {
    await fetch("/api/view-as/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: user.id, targetUserName: user.name }),
    });
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setViewAsUser(user);
  }

  async function switchViewAs(user: ViewAsUser) {
    await fetch("/api/view-as/switch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUserId: user.id, targetUserName: user.name }),
    });
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(user));
    setViewAsUser(user);
  }

  async function exitViewAs() {
    await fetch("/api/view-as/exit", { method: "POST" });
    sessionStorage.removeItem(STORAGE_KEY);
    setViewAsUser(null);
  }

  return (
    <ViewAsContext.Provider
      value={{ viewAsUser, isViewAsMode: viewAsUser !== null, startViewAs, switchViewAs, exitViewAs }}
    >
      {children}
    </ViewAsContext.Provider>
  );
}

export function useViewAs() {
  return useContext(ViewAsContext);
}
