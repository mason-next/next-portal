"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "@/lib/auth/client";
import { useViewAs } from "@/lib/view-as/ViewAsContext";
import { canAccess, type PermissionFeature } from "@/lib/permissions";
import { DEFAULT_ROLE_PERMISSIONS, getEffectiveLevel, type ModuleKey, type ModulePermLevel, type RolePermissionsConfig } from "@/lib/module-permissions";

interface PermissionsCtx {
  hasAccess: (feature: PermissionFeature) => boolean;
  getLevel: (module: ModuleKey) => ModulePermLevel;
}

const Ctx = createContext<PermissionsCtx>({ hasAccess: () => true, getLevel: () => "administrator" });

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

  function effectiveRoleTypes(): string[] {
    return isViewAsMode ? (viewAsUser?.roleTypes ?? []) : session.roleTypes;
  }

  function hasAccess(feature: PermissionFeature): boolean {
    const roles = effectiveRoleTypes();
    if (!roles.length) return false;
    return canAccess(roles, feature, config);
  }

  function getLevel(module: ModuleKey): ModulePermLevel {
    const roles = effectiveRoleTypes();
    if (!roles.length) return "none";
    return getEffectiveLevel(roles, module, config);
  }

  return <Ctx.Provider value={{ hasAccess, getLevel }}>{children}</Ctx.Provider>;
}

export function usePermissions() {
  return useContext(Ctx);
}
