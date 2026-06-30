"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useSession } from "@/lib/auth/client";
import {
  DEFAULT_PERMISSIONS,
  canAccess,
  type PermissionFeature,
  type PermissionsConfig,
} from "@/lib/permissions";

interface PermissionsCtx {
  hasAccess: (feature: PermissionFeature) => boolean;
}

const Ctx = createContext<PermissionsCtx>({ hasAccess: () => true });

export function PermissionsProvider({ children }: { children: React.ReactNode }) {
  const session = useSession();
  const [config, setConfig] = useState<PermissionsConfig>(DEFAULT_PERMISSIONS);

  useEffect(() => {
    fetch("/api/admin/permissions")
      .then((r) => r.json())
      .then((data: PermissionsConfig) => setConfig(data))
      .catch(() => setConfig(DEFAULT_PERMISSIONS));
  }, []);

  function hasAccess(feature: PermissionFeature): boolean {
    if (!session?.accountType) return false;
    return canAccess(config, session.accountType, feature);
  }

  return <Ctx.Provider value={{ hasAccess }}>{children}</Ctx.Provider>;
}

export function usePermissions() {
  return useContext(Ctx);
}
