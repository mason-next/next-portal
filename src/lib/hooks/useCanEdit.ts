"use client";

import { useSession } from "@/lib/auth/client";
import { useViewAs } from "@/lib/view-as/ViewAsContext";
import { getEffectiveLevel, canLevelEdit, type ModuleKey } from "@/lib/module-permissions";

/** Returns true if the current user can edit data in the given module (member level or higher).
 *  Always returns false while View As mode is active. */
export function useCanEdit(module: ModuleKey = "projects"): boolean {
  const session = useSession();
  const { isViewAsMode } = useViewAs();
  if (isViewAsMode) return false;
  return canLevelEdit(getEffectiveLevel(session.roleTypes, module));
}

/** Returns true if the real authenticated user has the Administrator role type.
 *  Not affected by View As mode so admins can always exit the preview. */
export function useIsAdmin(): boolean {
  const session = useSession();
  return session.roleTypes.includes("Administrator");
}
