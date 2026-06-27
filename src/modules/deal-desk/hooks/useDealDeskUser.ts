"use client";

import { useCallback, useState } from "react";
import { readGlobal, writeGlobal } from "@/lib/storage/local-store";
import type { DealDeskUser } from "@/types/deal-desk";

const STORE_KEY = "deal-desk:user";

const DEFAULT_USER: DealDeskUser = { name: "", role: "management" };

export function useDealDeskUser() {
  const [user, setUserState] = useState<DealDeskUser>(
    () => readGlobal<DealDeskUser>(STORE_KEY) ?? DEFAULT_USER
  );

  const setUser = useCallback((u: DealDeskUser) => {
    writeGlobal(STORE_KEY, u);
    setUserState(u);
  }, []);

  const isManagement = user.role === "management";

  return { user, setUser, isManagement };
}
