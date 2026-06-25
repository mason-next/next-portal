"use client";

import { Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { EquipmentRow, EquipmentRowSnapshot, EquipmentStatus } from "@/types/equipment";
import { DataTable, type ColumnDef } from "@/components/shared/data-table/DataTable";
import { EditableCell } from "@/components/shared/data-table/EditableCell";
import { useSortableRows } from "@/components/shared/data-table/useSortableRows";
import { StatusBadge, type StatusTone } from "@/components/shared/StatusBadge";
import { isFieldChanged } from "@/modules/equipment-tracking/lib/change-tracking";
import { formatDate } from "@/lib/utils";

const STATUS_TONE: Record<EquipmentStatus, StatusTone> = {
  "Not Ordered": "neutral",
  Allocated: "info",
  Ordered: "warning",
  Received: "orange",
  Shipped: "purple",
  Delivered: "success",
  Cancelled: "danger",
};

interface EquipmentTableProps {
  rows: EquipmentRow[];
  snapshot: Record<string, EquipmentRowSnapshot>;
  hiddenColumns: Set<string>;
  columnOrder: string[];
  columnFilters: Record<string, string>;
  onColumnFilterChange: (key: string, value: string) => void;
  onUpdateField: <K extends keyof EquipmentRow>(rowId: string, field: K, value: EquipmentRow[K]) => void;
  onGenerateRma: (row: EquipmentRow) => void;
}

export function EquipmentTable({
  rows,
  snapshot,
  hiddenColumns,
  columnOrder,
  columnFilters,
  onColumnFilterChange,
  onUpdateField,
  onGenerateRma,
}: EquipmentTableProps) {
  const columns: ColumnDef<EquipmentRow>[] = [
    {
      key: "seq",
      header: "Seq",
      width: 56,
      sticky: true,
      className: "border-r",
      sortValue: (row) => row.seq,
      cell: (row) => (
        <EditableCell
          value={row.seq}
          isChanged={isFieldChanged(snapshot[row.id], "seq", row.seq)}
          onCommit={(value) => onUpdateField(row.id, "seq", String(value))}
        />
      ),
    },
    {
      key: "mfr",
      header: "Manufacturer",
      width: 130,
      sortValue: (row) => row.mfr,
      filterable: true,
      cell: (row) => (
        <EditableCell
          value={row.mfr}
          isChanged={isFieldChanged(snapshot[row.id], "mfr", row.mfr)}
          onCommit={(value) => onUpdateField(row.id, "mfr", String(value))}
        />
      ),
    },
    {
      key: "product",
      header: "Product",
      width: 140,
      sortValue: (row) => row.product,
      filterable: true,
      cell: (row) => (
        <EditableCell
          value={row.product}
          isChanged={isFieldChanged(snapshot[row.id], "product", row.product)}
          onCommit={(value) => onUpdateField(row.id, "product", String(value))}
        />
      ),
    },
    {
      key: "desc",
      header: "Description",
      width: 220,
      sortValue: (row) => row.desc,
      filterable: true,
      cell: (row) => (
        <EditableCell
          value={row.desc}
          isChanged={isFieldChanged(snapshot[row.id], "desc", row.desc)}
          onCommit={(value) => onUpdateField(row.id, "desc", String(value))}
        />
      ),
    },
    {
      key: "qty",
      header: "Qty",
      width: 64,
      align: "right",
      sortValue: (row) => row.qty,
      cell: (row) => (
        <EditableCell
          value={row.qty}
          type="number"
          isChanged={isFieldChanged(snapshot[row.id], "qty", String(row.qty))}
          validate={(raw) => {
            const n = Number(raw);
            return Number.isFinite(n) && n >= 0 ? null : "Qty must be 0 or more";
          }}
          onCommit={(value) => onUpdateField(row.id, "qty", Number(value))}
        />
      ),
    },
    {
      key: "unitCost",
      header: "Unit Cost",
      width: 90,
      align: "right",
      sortValue: (row) => row.unitCost,
      cell: (row) => (
        <EditableCell
          value={row.unitCost}
          type="money"
          isChanged={isFieldChanged(snapshot[row.id], "unitCost", String(row.unitCost))}
          validate={(raw) => {
            const n = Number(raw.replace(/[^0-9.-]/g, ""));
            return Number.isFinite(n) && n >= 0 ? null : "Cost must be 0 or more";
          }}
          onCommit={(value) => onUpdateField(row.id, "unitCost", Number(value))}
        />
      ),
    },
    {
      key: "poInfo",
      header: "PO Info",
      width: 200,
      sortValue: (row) => row.poInfo,
      filterable: true,
      cell: (row) => (
        <EditableCell
          value={row.poInfo}
          isChanged={isFieldChanged(snapshot[row.id], "poInfo", row.poInfo)}
          onCommit={(value) => onUpdateField(row.id, "poInfo", String(value))}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      width: 180,
      sortValue: (row) => row.status,
      filterable: true,
      cell: (row) => (
        <div className="flex items-center gap-1.5 px-2">
          <StatusBadge label={row.status} tone={STATUS_TONE[row.status]} />
          {row.rmaRequestedAt ? (
            <span title={`Requested ${formatDate(row.rmaRequestedAt)}`}>
              <StatusBadge label="RMA" tone="warning" />
            </span>
          ) : null}
        </div>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      width: 90,
      align: "center",
      cell: (row) => (
        <div className="flex justify-center">
          <Button variant="outline" size="xs" onClick={() => onGenerateRma(row)}>
            <Undo2 className="size-3.5" />
            RMA
          </Button>
        </div>
      ),
    },
  ];

  // The sticky seq column stays anchored at the left; everything else follows the user's
  // chosen columnOrder (from View Options).
  const stickyColumns = columns.filter((col) => col.sticky);
  const reorderableColumns = columns.filter((col) => !col.sticky);
  const reorderableByKey = new Map(reorderableColumns.map((col) => [col.key, col]));
  const orderedColumns = [
    ...stickyColumns,
    ...columnOrder.map((key) => reorderableByKey.get(key)).filter((col): col is ColumnDef<EquipmentRow> => !!col),
  ];

  const { sort, sortedRows, handleSortChange } = useSortableRows(rows, orderedColumns);

  return (
    <DataTable
      columns={orderedColumns}
      rows={sortedRows}
      sort={sort}
      onSortChange={handleSortChange}
      getRowId={(row) => row.id}
      hiddenColumns={hiddenColumns}
      filters={columnFilters}
      onFilterChange={onColumnFilterChange}
    />
  );
}
