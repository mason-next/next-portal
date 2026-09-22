"use client";

import { useSession } from "@/lib/auth/client";
import { useViewAs } from "@/lib/view-as/ViewAsContext";
import { usePermissions } from "@/lib/PermissionsContext";

/**
 * Client-side mirror of the server's sales scope, used only to decide which
 * affordances to show — the server actions enforce the real rules.
 */
export function useCrmAccess() {
  const session = useSession();
  const { viewAsUser, isViewAsMode } = useViewAs();
  const { getLevel } = usePermissions();
  const level = getLevel("salesActivity");
  const userName = isViewAsMode ? (viewAsUser?.name ?? session.name) : session.name;
  const userId = isViewAsMode ? (viewAsUser?.id ?? session.id) : session.id;
  return {
    userName,
    userId,
    /** Administrator/Management: sees every rep's data and can reassign ownership. */
    isManager: level === "administrator",
    canEdit: level !== "none" && level !== "viewer",
    canView: level !== "none",
  };
}
