"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "@/lib/auth/client";
import {
  canAccess,
  type PermissionFeature,
} from "@/lib/permissions";
import {
  DEFAULT_ROLE_PERMISSIONS,
  type RolePermissionsConfig,
} from "@/lib/module-permissions";

interface PermissionsCtx {
  hasAccess: (feature: PermissionFeature) => boolean;
}

const Ctx = createContext<PermissionsCtx>({ hasAccess: () => true });

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const [config, setConfig] = useState<RolePermissionsConfig>(DEFAULT_ROLE_PERMISSIONS);

  useEffect(() => {
    fetch("/api/admin/role-permissions")
      .then((r) => r.json())
      .then((data: RolePermissionsConfig) => setConfig(data))
      .catch(() => setConfig(DEFAULT_ROLE_PERMISSIONS));
  }, []);

  function hasAccess(feature: PermissionFeature): boolean {
    if (!session?.roleTypes?.length) return false;
    return canAccess(session.roleTypes, feature, config);
  }

  return <Ctx.Provider value={{ hasAccess }}>{children}</Ctx.Provider>;
}

export function usePermissions() {
  return useContext(Ctx);
}
