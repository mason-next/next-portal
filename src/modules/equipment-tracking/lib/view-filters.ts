import type { EquipmentRow, EquipmentStatus } from "@/types/equipment";

// "outstanding" mirrors EquipmentSummary.outstanding — active rows (not Cancelled) that
// haven't Shipped yet. Driven by clicking a summary card, see EquipmentSummaryCards.
export type QuickFilter = "all" | "outstanding" | EquipmentStatus;

// Display-only — never mutates rows or affects summary-card totals, which are always
// computed from the full row set.
export function applyQuickFilter(rows: EquipmentRow[], filter: QuickFilter): EquipmentRow[] {
  if (filter === "all") return rows;
  if (filter === "outstanding") return rows.filter((row) => row.status !== "Cancelled" && row.status !== "Shipped");
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
