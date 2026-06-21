import type { BomRow, CostSummary } from "@/types/bom";

export function rowTotal(row: BomRow): number {
  return row.qty * row.unitCost;
}

export function parseMoney(raw: string | number): number {
  const n = Number(String(raw ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function computeCostSummary(rows: BomRow[]): CostSummary {
  const fullBomCost = rows.reduce((sum, row) => sum + rowTotal(row), 0);
  const approvedCost = rows
    .filter((row) => row.status === "Approved" || row.status === "Released")
    .reduce((sum, row) => sum + rowTotal(row), 0);
  const releasedCost = rows
    .filter((row) => row.status === "Released")
    .reduce((sum, row) => sum + rowTotal(row), 0);
  // Budget variance is a Phase 1 placeholder (full cost vs. approved cost); a real
  // project budget table doesn't exist yet.
  const budgetVariance = fullBomCost - approvedCost;

  return { fullBomCost, approvedCost, releasedCost, budgetVariance };
}
