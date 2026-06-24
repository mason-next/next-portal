"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useEquipmentRows } from "./useEquipmentRows";

type EquipmentRowsApi = ReturnType<typeof useEquipmentRows>;

const EquipmentRowsContext = createContext<EquipmentRowsApi | null>(null);

export function EquipmentRowsProvider({ projectId, children }: { projectId: string; children: ReactNode }) {
  const api = useEquipmentRows(projectId);
  return <EquipmentRowsContext.Provider value={api}>{children}</EquipmentRowsContext.Provider>;
}

export function useEquipmentRowsContext(): EquipmentRowsApi {
  const ctx = useContext(EquipmentRowsContext);
  if (!ctx) throw new Error("useEquipmentRowsContext must be used within an EquipmentRowsProvider");
  return ctx;
}
