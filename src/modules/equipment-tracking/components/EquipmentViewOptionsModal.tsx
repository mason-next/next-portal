"use client";

import { Button } from "@/components/ui/button";
import { Modal } from "@/components/shared/Modal";
import { ColumnVisibilityMenu } from "@/components/shared/data-table/ColumnVisibilityMenu";
import type { EquipmentViewOptionsState } from "@/types/equipment";

const COLUMN_LABELS: Record<string, string> = {
  mfr: "Manufacturer",
  product: "Product",
  desc: "Description",
  qty: "Qty",
  unitCost: "Unit Cost",
  poInfo: "PO Info",
  status: "Status",
  actions: "Actions",
};

interface EquipmentViewOptionsModalProps {
  hiddenColumns: Set<string>;
  columnOrder: string[];
  rowFilters: EquipmentViewOptionsState["rowFilters"];
  onToggleColumn: (key: string, visible: boolean) => void;
  onMoveColumn: (key: string, direction: "up" | "down") => void;
  onSetRowFilter: (key: keyof EquipmentViewOptionsState["rowFilters"], value: boolean) => void;
  onReset: () => void;
  onClose: () => void;
}

export function EquipmentViewOptionsModal({
  hiddenColumns,
  columnOrder,
  rowFilters,
  onToggleColumn,
  onMoveColumn,
  onSetRowFilter,
  onReset,
  onClose,
}: EquipmentViewOptionsModalProps) {
  const columnOptions = columnOrder.map((key) => ({ key, label: COLUMN_LABELS[key] ?? key }));

  return (
    <Modal open onClose={onClose}>
      <h2 className="mb-1 text-lg font-semibold">View Options</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Hide, show, or reorder columns, or temporarily hide rows from the equipment grid. This does not delete or
        change the equipment list.
      </p>

      <div className="rounded-lg border p-3">
        <div className="mb-2 text-sm font-semibold">Columns</div>
        <ColumnVisibilityMenu
          columns={columnOptions}
          hiddenColumns={hiddenColumns}
          onToggle={onToggleColumn}
          onMove={onMoveColumn}
        />
      </div>

      <div className="mt-3 rounded-lg border p-3">
        <div className="mb-2 text-sm font-semibold">Rows</div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={rowFilters.hideCancelled}
            onChange={(e) => onSetRowFilter("hideCancelled", e.target.checked)}
            className="size-4 accent-primary"
          />
          Hide Cancelled rows
        </label>
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={rowFilters.hideDelivered}
            onChange={(e) => onSetRowFilter("hideDelivered", e.target.checked)}
            className="size-4 accent-primary"
          />
          Hide Delivered rows
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
        <label className="mt-2 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={rowFilters.hideZeroCost}
            onChange={(e) => onSetRowFilter("hideZeroCost", e.target.checked)}
            className="size-4 accent-primary"
          />
          Hide zero-cost rows (e.g. OFE items) — also excludes them from the summary totals
        </label>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={onReset}>
          Reset View
        </Button>
        <Button onClick={onClose}>Done</Button>
      </div>
    </Modal>
  );
}
