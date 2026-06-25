import type { EquipmentRow, EquipmentStatus, EquipmentViewOptionsState } from "@/types/equipment";

// Display-only filtering — never mutates rows. hideCancelled/hideDelivered/hideZeroQty never
// affect summary-card totals either, which stay computed from the full row set; hideZeroCost
// is the one exception (see the equipment-tracking page, which feeds it a cost-filtered row
// set too) since a hidden zero-cost/OFE row shouldn't inflate "Total Items."
export function applyRowFilters(
  rows: EquipmentRow[],
  filters: EquipmentViewOptionsState["rowFilters"]
): EquipmentRow[] {
  return rows.filter((row) => {
    if (filters.hideCancelled && row.status === "Cancelled") return false;
    if (filters.hideDelivered && row.status === "Delivered") return false;
    if (filters.hideZeroQty && row.qty === 0) return false;
    if (filters.hideZeroCost && row.unitCost <= 0) return false;
    return true;
  });
}

// "outstanding" mirrors EquipmentSummary.outstanding — active rows (not Cancelled) that
// haven't Shipped or Delivered yet. Driven by clicking a summary card, see EquipmentSummaryCards.
export type QuickFilter = "all" | "outstanding" | EquipmentStatus;

const FULFILLED_STATUSES = new Set<EquipmentStatus>(["Shipped", "Delivered"]);

// Display-only — never mutates rows or affects summary-card totals, which are always
// computed from the full row set.
export function applyQuickFilter(rows: EquipmentRow[], filter: QuickFilter): EquipmentRow[] {
  if (filter === "all") return rows;
  if (filter === "outstanding") {
    return rows.filter((row) => row.status !== "Cancelled" && !FULFILLED_STATUSES.has(row.status));
  }
  return rows.filter((row) => row.status === filter);
}

// Display-only global search across the three free-text columns.
export function applySearch(rows: EquipmentRow[], query: string): EquipmentRow[] {
  const term = query.trim().toLowerCase();
  if (!term) return rows;
  return rows.filter(
    (row) =>
      row.mfr.toLowerCase().includes(term) ||
      row.product.toLowerCase().includes(term) ||
      row.desc.toLowerCase().includes(term)
  );
}

export type ColumnFilters = Record<string, string>;

const COLUMN_FILTER_ACCESSORS: Record<string, (row: EquipmentRow) => string> = {
  mfr: (row) => row.mfr,
  product: (row) => row.product,
  desc: (row) => row.desc,
  poInfo: (row) => row.poInfo,
  status: (row) => row.status,
};

export const COLUMN_FILTER_KEYS = Object.keys(COLUMN_FILTER_ACCESSORS);

// Display-only, same composition pattern as applyQuickFilter/applySearch. Each active
// filter is a case-insensitive substring match against its column.
export function applyColumnFilters(rows: EquipmentRow[], filters: ColumnFilters): EquipmentRow[] {
  const active = Object.entries(filters).filter(([, value]) => value.trim() !== "");
  if (active.length === 0) return rows;

  return rows.filter((row) =>
    active.every(([key, value]) => {
      const accessor = COLUMN_FILTER_ACCESSORS[key];
      if (!accessor) return true;
      return accessor(row).toLowerCase().includes(value.trim().toLowerCase());
    })
  );
}
