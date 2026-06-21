import type { BomRow, ViewOptionsState } from "@/types/bom";

// Display-only filtering — never mutates rows or affects cost totals, which are always
// computed from the full row set.
export function applyRowFilters(rows: BomRow[], filters: ViewOptionsState["rowFilters"]): BomRow[] {
  return rows.filter((row) => {
    if (filters.hideReleased && row.status === "Released") return false;
    if (filters.hideDoNotOrder && row.status === "Do Not Order") return false;
    if (filters.hideZeroQty && row.qty === 0) return false;
    return true;
  });
}
