import { useMemo } from "react";
import type { BomRow } from "@/types/bom";
import { computeCostSummary } from "@/modules/bom-release/lib/bom-calculations";

export function useCostSummary(rows: BomRow[]) {
  return useMemo(() => computeCostSummary(rows), [rows]);
}
