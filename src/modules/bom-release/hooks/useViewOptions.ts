"use client";

import { useEffect, useState } from "react";
import { readGlobal, writeGlobal } from "@/lib/storage/local-store";
import type { ViewOptionsState } from "@/types/bom";

const DEFAULT_ROW_FILTERS: ViewOptionsState["rowFilters"] = {
  hideReleased: false,
  hideDoNotOrder: false,
  hideZeroQty: false,
};

// The sticky drag/select/seq columns are excluded — they're anchored to the left and
// aren't reorderable. This is the default order for everything after them.
export const DEFAULT_COLUMN_ORDER = [
  "mfr",
  "part",
  "desc",
  "qty",
  "unitCost",
  "totalCost",
  "status",
  "release",
  "releasedAt",
  "notes",
  "audit",
];

const VIEW_OPTIONS_KEY = "view-options";

interface StoredViewOptions {
  hiddenColumns: string[];
  columnOrder: string[];
  rowFilters: ViewOptionsState["rowFilters"];
}

export function useViewOptions() {
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set());
  const [rowFilters, setRowFilters] = useState(DEFAULT_ROW_FILTERS);
  const [columnOrder, setColumnOrder] = useState<string[]>(DEFAULT_COLUMN_ORDER);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  // Gates the persistence effect below so it doesn't fire on first render and stomp the
  // saved config with these pre-load defaults before the load effect has run.
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      const stored = readGlobal<StoredViewOptions>(VIEW_OPTIONS_KEY);
      if (stored) {
        setHiddenColumns(new Set(stored.hiddenColumns));
        setColumnOrder(stored.columnOrder);
        setRowFilters(stored.rowFilters);
      }
      setHydrated(true);
    });
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeGlobal<StoredViewOptions>(VIEW_OPTIONS_KEY, {
      hiddenColumns: [...hiddenColumns],
      columnOrder,
      rowFilters,
    });
  }, [hydrated, hiddenColumns, columnOrder, rowFilters]);

  function setColumnFilter(key: string, value: string) {
    setColumnFilters((prev) => ({ ...prev, [key]: value }));
  }

  function toggleColumn(key: string, visible: boolean) {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (visible) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function moveColumn(key: string, direction: "up" | "down") {
    setColumnOrder((prev) => {
      const index = prev.indexOf(key);
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (index === -1 || swapWith < 0 || swapWith >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[swapWith]] = [next[swapWith], next[index]];
      return next;
    });
  }

  function setRowFilter(key: keyof ViewOptionsState["rowFilters"], value: boolean) {
    setRowFilters((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setHiddenColumns(new Set());
    setRowFilters(DEFAULT_ROW_FILTERS);
    setColumnOrder(DEFAULT_COLUMN_ORDER);
    setColumnFilters({});
  }

  return {
    hiddenColumns,
    rowFilters,
    columnOrder,
    columnFilters,
    toggleColumn,
    moveColumn,
    setRowFilter,
    setColumnFilter,
    reset,
  };
}
