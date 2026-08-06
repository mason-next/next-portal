"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { getUsers } from "@/lib/data/users";
import type { AppUser } from "@/types/user";

// Refresh presence data every 30 s so online/away/offline badges stay accurate
// without requiring a page reload.
const PRESENCE_POLL_MS = 30_000;

interface UsersApi {
  users: AppUser[];
  isLoading: boolean;
  refetch: () => void;
}

const UsersContext = createContext<UsersApi | null>(null);

export function UsersProvider({ children }: { children: ReactNode }) {
  const [users, setUsers] = useState<AppUser[] | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let active = true;
    getUsers().then((loaded) => {
      if (active) setUsers(loaded);
    });
    return () => {
      active = false;
    };
  }, [reloadToken]);

  // Periodic presence refresh — keeps lastActiveAt values current across the app.
  useEffect(() => {
    const id = setInterval(() => setReloadToken((t) => t + 1), PRESENCE_POLL_MS);
    return () => clearInterval(id);
  }, []);

  return (
    <UsersContext.Provider
      value={{ users: users ?? [], isLoading: users === null, refetch: () => setReloadToken((t) => t + 1) }}
    >
      {children}
    </UsersContext.Provider>
  );
}

export function useUsersContext(): UsersApi {
  const ctx = useContext(UsersContext);
  if (!ctx) throw new Error("useUsersContext must be used within a UsersProvider");
  return ctx;
}
