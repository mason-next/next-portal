"use client";

import { useState } from "react";
import { BOM_STATUSES, type BomRow, type BomRowSnapshot, type BomStatus } from "@/types/bom";
import { DataTable, type ColumnDef } from "@/components/shared/data-table/DataTable";
import { EditableCell } from "@/components/shared/data-table/EditableCell";
import { SelectableRowCheckbox } from "@/components/shared/data-table/SelectableRowCheckbox";
import { AuditTrailModal } from "@/components/shared/AuditTrailModal";
import { formatDate, formatMoney } from "@/lib/utils";
import { rowTotal } from "@/modules/bom-release/lib/bom-calculations";
import { isFieldChanged } from "@/modules/bom-release/lib/change-tracking";
import type { Release } from "@/types/release";

const UNASSIGNED_RELEASE_OPTION = "Unassigned";
const NEW_RELEASE_OPTION = "+ New Release";

interface BomTableProps {
  rows: BomRow[];
  snapshot: Record<string, BomRowSnapshot>;
  draftReleases: Release[];
  selected: Set<string>;
  hiddenColumns: Set<string>;
  onToggleRow: (rowId: string, checked: boolean) => void;
  onToggleAll: (checked: boolean) => void;
  onUpdateField: <K extends keyof BomRow>(rowId: string, field: K, value: BomRow[K]) => void;
  onAssignRelease: (rowId: string, releaseLabel: string) => void;
  onRowsReorder: (fromIndex: number, toIndex: number) => void;
}

export function BomTable({
  rows,
  snapshot,
  draftReleases,
  selected,
  hiddenColumns,
  onToggleRow,
  onToggleAll,
  onUpdateField,
  onAssignRelease,
  onRowsReorder,
}: BomTableProps) {
  const [auditRowId, setAuditRowId] = useState<string | null>(null);
  const auditRow = rows.find((row) => row.id === auditRowId) ?? null;

  const columns: ColumnDef<BomRow>[] = [
    {
      key: "drag",
      header: "",
      width: 32,
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
      width: 36,
      cell: (row) => (
        <SelectableRowCheckbox
          checked={selected.has(row.id)}
          onChange={(checked) => onToggleRow(row.id, checked)}
          ariaLabel={`Select row ${row.seq}`}
        />
      ),
    },
    { key: "seq", header: "Seq", width: 64, cell: (row) => row.seq },
    {
      key: "mfr",
      header: "Manufacturer",
      width: 140,
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
      width: 150,
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
      width: 280,
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
      width: 70,
      align: "right",
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
      width: 112,
      align: "right",
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
      width: 112,
      align: "right",
      cell: (row) => formatMoney(rowTotal(row)),
    },
    {
      key: "status",
      header: "Status",
      width: 160,
      cell: (row) =>
        row.status === "Released" ? (
          <span className="block px-2 text-sm text-muted-foreground">{row.status}</span>
        ) : (
          <EditableCell
            value={row.status}
            type="select"
            options={[...BOM_STATUSES]}
            isChanged={isFieldChanged(snapshot[row.id], "status", row.status)}
            onCommit={(value) => onUpdateField(row.id, "status", value as BomStatus)}
          />
        ),
    },
    {
      key: "release",
      header: "Release",
      width: 150,
      cell: (row) =>
        row.status === "Released" ? (
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
      width: 160,
      cell: (row) => formatDate(row.releasedAt),
    },
    {
      key: "notes",
      header: "Notes",
      width: 180,
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
      width: 100,
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
  ];

  return (
    <>
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        hiddenColumns={hiddenColumns}
        onRowsReorder={onRowsReorder}
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
