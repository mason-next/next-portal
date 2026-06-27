"use client";

import { useState } from "react";
import { Trash2 } from "lucide-react";
import { BOM_STATUSES, type BomRow, type BomRowSnapshot, type BomStatus } from "@/types/bom";
import { DataTable, type ColumnDef } from "@/components/shared/data-table/DataTable";
import { EditableCell } from "@/components/shared/data-table/EditableCell";
import { SelectableRowCheckbox } from "@/components/shared/data-table/SelectableRowCheckbox";
import { useSortableRows } from "@/components/shared/data-table/useSortableRows";
import { AuditTrailModal } from "@/components/shared/AuditTrailModal";
import { formatDate, formatMoney } from "@/lib/utils";
import { rowTotal } from "@/modules/bom-release/lib/bom-calculations";
import { isFieldChanged } from "@/modules/bom-release/lib/change-tracking";
import type { Release } from "@/types/release";

const UNASSIGNED_RELEASE_OPTION = "Unassigned";
const NEW_RELEASE_OPTION = "+ New Release";

// Statuses representing items that have been through the release process.
// These rows have their release label locked and only allow procurement-stage transitions.
const PROCUREMENT_STATUSES: ReadonlySet<BomStatus> = new Set([
  "Released",
  "Ordered",
  "Received",
  "Installed",
]);

const PROCUREMENT_STATUS_OPTIONS: BomStatus[] = ["Released", "Ordered", "Received", "Installed"];

const STATUS_SELECT_TONE: Record<BomStatus, string> = {
  "Pending Review": "bg-muted text-muted-foreground",
  Approved: "bg-emerald-50 text-emerald-700",
  "Update Needed": "bg-amber-50 text-amber-700",
  "Do Not Order": "bg-red-50 text-red-700",
  "On Hold": "bg-purple-50 text-purple-700",
  Released: "bg-sky-50 text-sky-700",
  Ordered: "bg-blue-50 text-blue-700",
  Received: "bg-teal-50 text-teal-700",
  Installed: "bg-emerald-100 text-emerald-800",
};

interface BomTableProps {
  rows: BomRow[];
  snapshot: Record<string, BomRowSnapshot>;
  draftReleases: Release[];
  selected: Set<string>;
  hiddenColumns: Set<string>;
  columnOrder: string[];
  columnFilters: Record<string, string>;
  onColumnFilterChange: (key: string, value: string) => void;
  onToggleRow: (rowId: string, checked: boolean) => void;
  onToggleRowRange: (rowIds: string[], checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onUpdateField: <K extends keyof BomRow>(rowId: string, field: K, value: BomRow[K]) => void;
  onAssignRelease: (rowId: string, releaseLabel: string) => void;
  onRowsReorder: (fromId: string, toId: string) => void;
  onDeleteRow: (rowId: string) => void;
}

export function BomTable({
  rows,
  snapshot,
  draftReleases,
  selected,
  hiddenColumns,
  columnOrder,
  columnFilters,
  onColumnFilterChange,
  onToggleRow,
  onToggleRowRange,
  onToggleAll,
  onUpdateField,
  onAssignRelease,
  onRowsReorder,
  onDeleteRow,
}: BomTableProps) {
  const [auditRowId, setAuditRowId] = useState<string | null>(null);
  const auditRow = rows.find((row) => row.id === auditRowId) ?? null;
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);

  const columns: ColumnDef<BomRow>[] = [
    {
      key: "drag",
      header: "",
      width: 28,
      sticky: true,
      cell: () => <span className="block cursor-grab select-none text-center text-muted-foreground">⋮⋮</span>,
    },
    {
      key: "select",
      header: (
        <SelectableRowCheckbox
          checked={rows.length > 0 && rows.every((row) => selected.has(row.id))}
          onChange={onToggleAll}
          ariaLabel="Select all rows"
        />
      ),
      width: 32,
      sticky: true,
      cell: (row, rowIndex) => (
        <SelectableRowCheckbox
          checked={selected.has(row.id)}
          onChange={(checked, shiftKey) => {
            if (shiftKey && lastClickedIndex !== null) {
              const [start, end] =
                lastClickedIndex < rowIndex ? [lastClickedIndex, rowIndex] : [rowIndex, lastClickedIndex];
              onToggleRowRange(sortedRows.slice(start, end + 1).map((r) => r.id), checked);
            } else {
              onToggleRow(row.id, checked);
            }
            setLastClickedIndex(rowIndex);
          }}
          ariaLabel={`Select row ${row.seq}`}
        />
      ),
    },
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
      width: 125,
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
      key: "part",
      header: "Part #",
      width: 140,
      sortValue: (row) => row.part,
      filterable: true,
      cell: (row) => (
        <EditableCell
          value={row.part}
          isChanged={isFieldChanged(snapshot[row.id], "part", row.part)}
          onCommit={(value) => onUpdateField(row.id, "part", String(value))}
        />
      ),
    },
    {
      key: "desc",
      header: "Description",
      width: 200,
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
      width: 56,
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
      width: 96,
      align: "right",
      sortValue: (row) => row.unitCost,
      cell: (row) => (
        <EditableCell
          value={row.unitCost}
          type="money"
          isChanged={isFieldChanged(snapshot[row.id], "unitCost", String(row.unitCost))}
          validate={(raw) => {
            const n = Number(String(raw).replace(/[^0-9.-]/g, ""));
            return Number.isFinite(n) && n >= 0 ? null : "Unit cost must be 0 or more";
          }}
          onCommit={(value) => onUpdateField(row.id, "unitCost", Number(value))}
        />
      ),
    },
    {
      key: "totalCost",
      header: "Total Cost",
      width: 100,
      align: "right",
      sortValue: (row) => rowTotal(row),
      cell: (row) => formatMoney(rowTotal(row)),
    },
    {
      key: "status",
      header: "Status",
      width: 130,
      sortValue: (row) => row.status,
      filterable: true,
      cell: (row) =>
        PROCUREMENT_STATUSES.has(row.status) ? (
          <EditableCell
            value={row.status}
            type="select"
            options={PROCUREMENT_STATUS_OPTIONS}
            className={STATUS_SELECT_TONE[row.status]}
            isChanged={isFieldChanged(snapshot[row.id], "status", row.status)}
            onCommit={(value) => onUpdateField(row.id, "status", value as BomStatus)}
          />
        ) : (
          <EditableCell
            value={row.status}
            type="select"
            options={[...BOM_STATUSES]}
            className={STATUS_SELECT_TONE[row.status]}
            isChanged={isFieldChanged(snapshot[row.id], "status", row.status)}
            onCommit={(value) => onUpdateField(row.id, "status", value as BomStatus)}
          />
        ),
    },
    {
      key: "release",
      header: "Release",
      width: 120,
      sortValue: (row) => row.release ?? "",
      filterable: true,
      cell: (row) =>
        PROCUREMENT_STATUSES.has(row.status) ? (
          <span className="block px-2 text-sm text-muted-foreground">{row.release ?? "—"}</span>
        ) : (
          <EditableCell
            value={row.release ?? UNASSIGNED_RELEASE_OPTION}
            type="select"
            options={[
              UNASSIGNED_RELEASE_OPTION,
              ...draftReleases.map((release) => release.releaseNumber),
              NEW_RELEASE_OPTION,
            ]}
            onCommit={(value) => onAssignRelease(row.id, String(value))}
          />
        ),
    },
    {
      key: "releasedAt",
      header: "Released At",
      width: 150,
      sortValue: (row) => row.releasedAt ?? "",
      cell: (row) => formatDate(row.releasedAt),
    },
    {
      key: "notes",
      header: "Notes",
      width: 140,
      sortValue: (row) => row.notes,
      filterable: true,
      cell: (row) => (
        <EditableCell
          value={row.notes}
          isChanged={isFieldChanged(snapshot[row.id], "notes", row.notes)}
          onCommit={(value) => onUpdateField(row.id, "notes", String(value))}
        />
      ),
    },
    {
      key: "audit",
      header: "Audit",
      width: 90,
      cell: (row) => (
        <button
          type="button"
          disabled={row.audit.length === 0}
          onClick={() => setAuditRowId(row.id)}
          className="text-xs font-semibold text-primary underline-offset-2 hover:underline disabled:cursor-default disabled:text-muted-foreground disabled:no-underline"
        >
          {row.audit.length > 0 ? `${row.audit.length} change${row.audit.length > 1 ? "s" : ""}` : "Clean"}
        </button>
      ),
    },
    {
      key: "delete",
      header: "",
      width: 40,
      align: "center",
      cell: (row) => (
        <button
          type="button"
          onClick={() => {
            if (window.confirm(`Delete row ${row.seq || row.part || "this item"}? This cannot be undone.`)) {
              onDeleteRow(row.id);
            }
          }}
          aria-label={`Delete row ${row.seq}`}
          className="flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </button>
      ),
    },
  ];

  // Sticky columns stay anchored at the left in their original order; everything else
  // follows the user's chosen columnOrder (from View Options).
  const stickyColumns = columns.filter((col) => col.sticky);
  const reorderableColumns = columns.filter((col) => !col.sticky);
  const reorderableByKey = new Map(reorderableColumns.map((col) => [col.key, col]));
  const orderedColumns = [
    ...stickyColumns,
    ...columnOrder.map((key) => reorderableByKey.get(key)).filter((col): col is ColumnDef<BomRow> => !!col),
  ];

  const { sort, sortedRows, handleSortChange } = useSortableRows(rows, orderedColumns);

  return (
    <>
      <DataTable
        columns={orderedColumns}
        rows={sortedRows}
        sort={sort}
        onSortChange={handleSortChange}
        getRowId={(row) => row.id}
        hiddenColumns={hiddenColumns}
        onRowsReorder={onRowsReorder}
        filters={columnFilters}
        onFilterChange={onColumnFilterChange}
      />
      <AuditTrailModal
        open={auditRow !== null}
        onClose={() => setAuditRowId(null)}
        title={auditRow ? `${auditRow.seq} · ${auditRow.part}` : ""}
        entries={auditRow?.audit ?? []}
      />
    </>
  );
}
