"use client";

import { useSession } from "@/lib/auth/client";
import { useViewAs } from "@/lib/view-as/ViewAsContext";
import { usePermissions } from "@/lib/PermissionsContext";

/**
 * Provides the effective Deal Desk user context.
 *
 * isManagement reflects the user's salesDealDesk module permission level
 * (administrator = can see all records). In View As mode, both the identity
 * and permission level reflect the viewed user.
 *
 * The old localStorage-based Management View preview has been removed.
 * Use the platform-wide View As selector to see the Deal Desk as another user.
 */
export function useDealDeskUser() {
  const session = useSession();
  const { viewAsUser, isViewAsMode } = useViewAs();
  const { getLevel } = usePermissions();

  const isManagement = getLevel("salesDealDesk") === "administrator";
  const userName = isViewAsMode ? (viewAsUser?.name ?? session.name) : session.name;

  return {
    userName,
    isManagement,
    // Legacy aliases kept for backward compatibility — the preview concept is gone.
    actuallyManagement: isManagement,
    previewAsSalesperson: false as const,
    previewUser: null as null,
    setPreviewAs: () => {},
    togglePreview: () => {},
  };
}
