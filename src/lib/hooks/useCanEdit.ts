"use client";

import { useSession } from "@/lib/auth/client";
import { getEffectiveLevel, canLevelEdit, type ModuleKey } from "@/lib/module-permissions";

/** Returns true if the current user can edit data in the given module (member level or higher). */
export function useCanEdit(module: ModuleKey = "projects"): boolean {
  const session = useSession();
  return canLevelEdit(getEffectiveLevel(session.roleTypes, module));
}

/** Returns true if the current user has the Administrator role type. */
export function useIsAdmin(): boolean {
  const session = useSession();
  return session.roleTypes.includes("Administrator");
}
