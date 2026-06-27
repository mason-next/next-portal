"use client";

import { useCallback, useState } from "react";
import { useSession } from "@/lib/auth/client";
import type { UserRole } from "@/types/user";

const MANAGEMENT_ROLES: UserRole[] = [
  "Administrator",
  "Project Manager",
  "Engineering Manager",
  "Procurement Manager",
];

export function useDealDeskUser() {
  const session = useSession();
  const actuallyManagement = MANAGEMENT_ROLES.includes(session.role);

  // Management can toggle a "preview as salesperson" mode to see what a rep sees
  const [previewAsSalesperson, setPreviewAsSalesperson] = useState(false);

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
