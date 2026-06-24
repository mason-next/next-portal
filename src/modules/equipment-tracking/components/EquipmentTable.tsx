"use client";

import type { EquipmentRow, EquipmentRowSnapshot, EquipmentStatus } from "@/types/equipment";
import { DataTable, type ColumnDef } from "@/components/shared/data-table/DataTable";
import { EditableCell } from "@/components/shared/data-table/EditableCell";
import { useSortableRows } from "@/components/shared/data-table/useSortableRows";
import { StatusBadge, type StatusTone } from "@/components/shared/StatusBadge";
import { isFieldChanged } from "@/modules/equipment-tracking/lib/change-tracking";

const STATUS_TONE: Record<EquipmentStatus, StatusTone> = {
  "Not Ordered": "neutral",
  Allocated: "info",
  Ordered: "warning",
  Received: "orange",
  Shipped: "success",
  Cancelled: "danger",
};

interface EquipmentTableProps {
  rows: EquipmentRow[];
  snapshot: Record<string, EquipmentRowSnapshot>;
  columnFilters: Record<string, string>;
  onColumnFilterChange: (key: string, value: string) => void;
  onUpdateField: <K extends keyof EquipmentRow>(rowId: string, field: K, value: EquipmentRow[K]) => void;
}

export function EquipmentTable({
  rows,
  snapshot,
  columnFilters,
  onColumnFilterChange,
  onUpdateField,
}: EquipmentTableProps) {
  const columns: ColumnDef<EquipmentRow>[] = [
    {
      key: "seq",
      header: "Seq",
      width: 56,
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
      key: "status",
      header: "Status",
      width: 130,
      sortValue: (row) => row.status,
      filterable: true,
      cell: (row) => (
        <div className="px-2">
          <StatusBadge label={row.status} tone={STATUS_TONE[row.status]} />
        </div>
      ),
    },
  ];

  const { sort, sortedRows, handleSortChange } = useSortableRows(rows, columns);

  return (
    <DataTable
      columns={columns}
      rows={sortedRows}
      sort={sort}
      onSortChange={handleSortChange}
      getRowId={(row) => row.id}
      filters={columnFilters}
      onFilterChange={onColumnFilterChange}
    />
  );
}
