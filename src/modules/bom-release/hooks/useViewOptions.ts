"use client";

import { useState } from "react";
import type { ViewOptionsState } from "@/types/bom";

const DEFAULT_ROW_FILTERS: ViewOptionsState["rowFilters"] = {
  hideReleased: false,
  hideDoNotOrder: false,
  hideZeroQty: false,
};

export function useViewOptions() {
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [rowFilters, setRowFilters] = useState(DEFAULT_ROW_FILTERS);

  function toggleColumn(key: string, visible: boolean) {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (visible) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function setRowFilter(key: keyof ViewOptionsState["rowFilters"], value: boolean) {
    setRowFilters((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setHiddenColumns(new Set());
    setRowFilters(DEFAULT_ROW_FILTERS);
  }

  return { hiddenColumns, rowFilters, toggleColumn, setRowFilter, reset };
}
