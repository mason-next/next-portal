"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "@/lib/auth/client";
import { useViewAs } from "@/lib/view-as/ViewAsContext";
import { canAccess, type PermissionFeature } from "@/lib/permissions";
import { DEFAULT_ROLE_PERMISSIONS, type RolePermissionsConfig } from "@/lib/module-permissions";

interface PermissionsCtx {
  hasAccess: (feature: PermissionFeature) => boolean;
}

const Ctx = createContext<PermissionsCtx>({ hasAccess: () => true });

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const { viewAsUser, isViewAsMode } = useViewAs();
  const [config, setConfig] = useState<RolePermissionsConfig>(DEFAULT_ROLE_PERMISSIONS);

  useEffect(() => {
    fetch("/api/admin/role-permissions")
      .then((r) => r.json())
      .then((data: RolePermissionsConfig) => setConfig(data))
      .catch(() => setConfig(DEFAULT_ROLE_PERMISSIONS));
  }, []);

  function hasAccess(feature: PermissionFeature): boolean {
    // In view-as mode use the viewed user's roleTypes for navigation visibility.
    const effectiveRoleTypes = isViewAsMode
      ? (viewAsUser?.roleTypes ?? [])
      : session.roleTypes;
    if (!effectiveRoleTypes.length) return false;
    return canAccess(effectiveRoleTypes, feature, config);
  }

  return <Ctx.Provider value={{ hasAccess }}>{children}</Ctx.Provider>;
}

export function usePermissions() {
  return useContext(Ctx);
}
