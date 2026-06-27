"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/auth/client";
import type { UserRole } from "@/types/user";

const MANAGEMENT_ROLES: UserRole[] = [
  "Administrator",
  "Project Manager",
  "Engineering Manager",
  "Procurement Manager",
];

const LS_KEY = "deal-desk:preview-as-salesperson";

export function useDealDeskUser() {
  const session = useSession();
  const actuallyManagement = MANAGEMENT_ROLES.includes(session.role);

  // Persisted across navigation via localStorage
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
    /** True if the user has a management role (and isn't previewing as salesperson) */
    isManagement,
    /** True if the logged-in user is actually management (regardless of preview) */
    actuallyManagement,
    /** Whether management is currently previewing the salesperson view */
    previewAsSalesperson,
    togglePreview,
  };
}
