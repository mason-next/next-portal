import type { BomRow } from "@/types/bom";

const REVIEWED_STATUSES = new Set(["Approved", "Do Not Order", "Released"]);

export function bomCompletionPercent(rows: BomRow[]): number {
  if (rows.length === 0) return 0;
  const reviewed = rows.filter((row) => REVIEWED_STATUSES.has(row.status)).length;
  return Math.round((reviewed / rows.length) * 100);
}
