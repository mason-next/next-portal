"use client";

import { Button } from "@/components/ui/button";
import { ColumnVisibilityMenu, type ColumnOption } from "@/components/shared/data-table/ColumnVisibilityMenu";
import type { ViewOptionsState } from "@/types/bom";

const COLUMN_OPTIONS: ColumnOption[] = [
  { key: "mfr", label: "Manufacturer" },
  { key: "part", label: "Part #" },
  { key: "desc", label: "Description" },
  { key: "qty", label: "Qty" },
  { key: "unitCost", label: "Unit Cost" },
  { key: "totalCost", label: "Total Cost" },
  { key: "status", label: "Status" },
  { key: "release", label: "Release" },
  { key: "releasedAt", label: "Released At" },
  { key: "notes", label: "Notes" },
  { key: "audit", label: "Audit" },
];

interface ViewOptionsModalProps {
  hiddenColumns: Set<string>;
  rowFilters: ViewOptionsState["rowFilters"];
  onToggleColumn: (key: string, visible: boolean) => void;
  onSetRowFilter: (key: keyof ViewOptionsState["rowFilters"], value: boolean) => void;
  onReset: () => void;
  onClose: () => void;
}

export function ViewOptionsModal({
  hiddenColumns,
  rowFilters,
  onToggleColumn,
  onSetRowFilter,
  onReset,
  onClose,
}: ViewOptionsModalProps) {
  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-6">
      <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-lg">
        <h2 className="mb-1 text-lg font-semibold">View Options</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Hide columns or temporarily hide rows from the BOM grid. This does not delete or change the BOM.
        </p>

        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-semibold">Columns</div>
          <ColumnVisibilityMenu columns={COLUMN_OPTIONS} hiddenColumns={hiddenColumns} onToggle={onToggleColumn} />
        </div>

        <div className="mt-3 rounded-lg border p-3">
          <div className="mb-2 text-sm font-semibold">Rows</div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rowFilters.hideReleased}
              onChange={(e) => onSetRowFilter("hideReleased", e.target.checked)}
              className="size-4 accent-primary"
            />
            Hide Released rows
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rowFilters.hideDoNotOrder}
              onChange={(e) => onSetRowFilter("hideDoNotOrder", e.target.checked)}
              className="size-4 accent-primary"
            />
            Hide Do Not Order rows
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={rowFilters.hideZeroQty}
              onChange={(e) => onSetRowFilter("hideZeroQty", e.target.checked)}
              className="size-4 accent-primary"
            />
            Hide rows with Qty 0
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button variant="outline" onClick={onReset}>
            Reset View
          </Button>
          <Button onClick={onClose}>Done</Button>
        </div>
      </div>
    </div>
  );
}
