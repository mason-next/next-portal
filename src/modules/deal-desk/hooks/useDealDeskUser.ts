"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/auth/client";

const LS_KEY = "deal-desk:preview-as-salesperson";

export function useDealDeskUser() {
  const session = useSession();
  const actuallyManagement = session.roleTypes.includes("Administrator") ||
    session.roleTypes.includes("Management") || session.roleTypes.includes("Sales");

  const [previewAsSalesperson, setPreviewAsSalesperson] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(LS_KEY) === "1";
  });

  useEffect(() => {
    localStorage.setItem(LS_KEY, previewAsSalesperson ? "1" : "0");
  }, [previewAsSalesperson]);

  const togglePreview = useCallback(() => {
    setPreviewAsSalesperson((v) => !v);
  }, []);

  // Effective management flag — management previewing as salesperson acts like one
  const isManagement = actuallyManagement && !previewAsSalesperson;

  return {
    /** The logged-in user's name */
    userName: session.name,
    /** True if the user has Administrator account type (and isn't previewing as salesperson) */
    isManagement,
    /** True if the logged-in user is actually an Administrator (regardless of preview) */
    actuallyManagement,
    /** Whether management is currently previewing the salesperson view */
    previewAsSalesperson,
    togglePreview,
  };
}
