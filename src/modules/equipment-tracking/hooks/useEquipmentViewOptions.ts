"use client";

import { useEffect, useState } from "react";
import { readGlobal, writeGlobal } from "@/lib/storage/local-store";
import type { EquipmentViewOptionsState } from "@/types/equipment";

const DEFAULT_ROW_FILTERS: EquipmentViewOptionsState["rowFilters"] = {
  hideCancelled: false,
  hideDelivered: false,
  hideZeroQty: false,
  // Zero-cost rows are typically OFE (Owner Furnished Equipment) — tracked for visibility but
  // not part of procurement spend, so they're hidden (and excluded from summary totals) by
  // default. Still fully present in the data; this is a display preference, not a data filter.
  hideZeroCost: true,
};

// PO Info is the raw distributor text status detection reads off of, and Unit Cost is mostly
// useful when investigating the zero-cost (OFE) filter above — neither is useful day-to-day,
// so both start hidden. Still revealable here if someone needs to check them.
const DEFAULT_HIDDEN_COLUMNS = ["poInfo", "unitCost"];

// The seq column is always first and isn't reorderable/hideable — everything after it
// follows the user's chosen order.
export const DEFAULT_COLUMN_ORDER = ["mfr", "product", "desc", "qty", "unitCost", "poInfo", "status", "actions"];

const VIEW_OPTIONS_KEY = "equipment-view-options";

interface StoredViewOptions {
  hiddenColumns: string[];
  columnOrder: string[];
  rowFilters: EquipmentViewOptionsState["rowFilters"];
}

export function useEquipmentViewOptions() {
  const [hiddenColumns, setHiddenColumns] = useState<Set<string>>(new Set(DEFAULT_HIDDEN_COLUMNS));
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
        // Append any column keys added since this config was saved instead of letting them
        // silently disappear from the table.
        const missing = DEFAULT_COLUMN_ORDER.filter((key) => !stored.columnOrder.includes(key));
        setColumnOrder([...stored.columnOrder, ...missing]);
        setRowFilters({ ...DEFAULT_ROW_FILTERS, ...stored.rowFilters });
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

  function setRowFilter(key: keyof EquipmentViewOptionsState["rowFilters"], value: boolean) {
    setRowFilters((prev) => ({ ...prev, [key]: value }));
  }

  function reset() {
    setHiddenColumns(new Set(DEFAULT_HIDDEN_COLUMNS));
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
