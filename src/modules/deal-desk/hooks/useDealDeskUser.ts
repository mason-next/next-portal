"use client";

import { useCallback, useState } from "react";
import { useSession } from "@/lib/auth/client";
import type { AccountType } from "@/types/user";

const LS_KEY = "deal-desk:preview-user";

export interface PreviewUser {
  name: string;
  accountType: AccountType;
}

function readPreviewUser(): PreviewUser | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) ?? "null");
  } catch {
    return null;
  }
}

export function useDealDeskUser() {
  const session = useSession();
  const actuallyManagement = session.accountType === "Administrator";

  const [previewUser, setPreviewUserState] = useState<PreviewUser | null>(readPreviewUser);

  const setPreviewAs = useCallback((user: PreviewUser | null) => {
    setPreviewUserState(user);
    localStorage.setItem(LS_KEY, JSON.stringify(user));
  }, []);

  const previewAsSalesperson = actuallyManagement && previewUser !== null;
  const isManagement = actuallyManagement && !previewAsSalesperson;

  return {
    userName: previewUser?.name ?? session.name,
    isManagement,
    actuallyManagement,
    previewAsSalesperson,
    previewUser,
    setPreviewAs,
    // kept for any existing callers — clears the preview
    togglePreview: useCallback(() => setPreviewAs(null), [setPreviewAs]),
  };
}
