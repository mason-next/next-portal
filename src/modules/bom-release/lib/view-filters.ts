import type { BomRow, ViewOptionsState } from "@/types/bom";

// Display-only filtering — never mutates rows or affects cost totals, which are always
// computed from the full row set.
export function applyRowFilters(rows: BomRow[], filters: ViewOptionsState["rowFilters"]): BomRow[] {
  return rows.filter((row) => {
    if (filters.hideReleased && row.status === "Released") return false;
    if (filters.hideDoNotOrder && row.status === "Do Not Order") return false;
    if (filters.hideZeroQty && row.qty === 0) return false;
    if (filters.hideBlankMfr && row.mfr.trim() === "") return false;
    return true;
  });
}

export const QUICK_FILTERS = ["all", "approved", "needsReview", "released"] as const;
export type QuickFilter = (typeof QUICK_FILTERS)[number];

export const QUICK_FILTER_LABELS: Record<QuickFilter, string> = {
  all: "All Equipment",
  approved: "Approved",
  needsReview: "Needs Review",
  released: "Released",
};

// Display-only, same as applyRowFilters — composes with it rather than replacing it.
export function applyQuickFilter(rows: BomRow[], filter: QuickFilter): BomRow[] {
  switch (filter) {
    case "approved":
      return rows.filter((row) => row.status === "Approved");
    case "needsReview":
      return rows.filter((row) => row.status === "Pending Review" || row.status === "Update Needed");
    case "released":
      return rows.filter((row) => row.status === "Released");
    default:
      return rows;
  }
}

export type ColumnFilters = Record<string, string>;

const COLUMN_FILTER_ACCESSORS: Record<string, (row: BomRow) => string> = {
  mfr: (row) => row.mfr,
  part: (row) => row.part,
  desc: (row) => row.desc,
  status: (row) => row.status,
  release: (row) => row.release ?? "",
  notes: (row) => row.notes,
};

export const COLUMN_FILTER_KEYS = Object.keys(COLUMN_FILTER_ACCESSORS);

// Display-only, same as applyRowFilters — composes with it rather than replacing it.
// Each active filter is a case-insensitive substring match against its column.
export function applyColumnFilters(rows: BomRow[], filters: ColumnFilters): BomRow[] {
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
