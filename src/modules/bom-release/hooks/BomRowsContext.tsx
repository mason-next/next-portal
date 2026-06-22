"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useBomRows } from "./useBomRows";

type BomRowsApi = ReturnType<typeof useBomRows>;

const BomRowsContext = createContext<BomRowsApi | null>(null);

export function BomRowsProvider({ projectId, children }: { projectId: string; children: ReactNode }) {
  const api = useBomRows(projectId);
  return <BomRowsContext.Provider value={api}>{children}</BomRowsContext.Provider>;
}

export function useBomRowsContext(): BomRowsApi {
  const ctx = useContext(BomRowsContext);
  if (!ctx) throw new Error("useBomRowsContext must be used within a BomRowsProvider");
  return ctx;
}
