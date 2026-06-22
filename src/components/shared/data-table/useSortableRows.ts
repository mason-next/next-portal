"use client";

import { useState } from "react";
import type { ColumnDef } from "./DataTable";

export interface SortState {
  key: string;
  direction: "asc" | "desc";
}

function compareSortValues(a: string | number, b: string | number): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: "base" });
}

export function useSortableRows<TRow>(rows: TRow[], columns: ColumnDef<TRow>[]) {
  const [sort, setSort] = useState<SortState | null>(null);

  function handleSortChange(key: string) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, direction: "asc" };
      if (prev.direction === "asc") return { key, direction: "desc" };
      return null;
    });
  }

  let sortedRows = rows;
  if (sort) {
    const column = columns.find((c) => c.key === sort.key);
    if (column?.sortValue) {
      const sortValue = column.sortValue;
      sortedRows = [...rows].sort((a, b) => compareSortValues(sortValue(a), sortValue(b)));
      if (sort.direction === "desc") sortedRows.reverse();
    }
  }

  return { sort, sortedRows, handleSortChange };
}
