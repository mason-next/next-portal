"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { DraggableRow } from "./DraggableRow";

export interface ColumnDef<TRow> {
  key: string;
  header: ReactNode;
  width?: number;
  align?: "left" | "right" | "center";
  className?: string;
  cell: (row: TRow, rowIndex: number) => ReactNode;
}

interface DataTableProps<TRow> {
  columns: ColumnDef<TRow>[];
  rows: TRow[];
  getRowId: (row: TRow) => string;
  hiddenColumns?: Set<string>;
  onRowsReorder?: (fromIndex: number, toIndex: number) => void;
  renderRowWrapper?: (row: TRow, index: number, cells: ReactNode, rowId: string) => ReactNode;
}

export function DataTable<TRow>({
  columns,
  rows,
  getRowId,
  hiddenColumns,
  onRowsReorder,
  renderRowWrapper,
}: DataTableProps<TRow>) {
  const [widths, setWidths] = useState<Record<string, number>>({});

  function beginResize(key: string, startWidth: number, startX: number) {
    function onMouseMove(e: MouseEvent) {
      const next = Math.max(48, startWidth + (e.pageX - startX));
      setWidths((prev) => ({ ...prev, [key]: next }));
    }
    function onMouseUp() {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
  }

  const visibleColumns = columns.filter((col) => !hiddenColumns?.has(col.key));

  return (
    <div className="max-h-[calc(100vh-320px)] overflow-auto rounded-xl border bg-card">
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr>
            {visibleColumns.map((col) => (
              <th
                key={col.key}
                style={{ width: widths[col.key] ?? col.width }}
                className={cn(
                  "sticky top-0 z-10 h-9 whitespace-nowrap border-b bg-muted/60 px-3 font-semibold text-muted-foreground",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                  !col.align && "text-left",
                  col.className
                )}
              >
                <div className="relative flex items-center">
                  {col.header}
                  <span
                    role="separator"
                    aria-orientation="vertical"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      const th = e.currentTarget.closest("th");
                      beginResize(col.key, th?.offsetWidth ?? 100, e.pageX);
                    }}
                    className="absolute -right-3 top-0 h-full w-3 cursor-col-resize select-none"
                  />
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rowId = getRowId(row);
            const cells = visibleColumns.map((col) => (
              <td
                key={col.key}
                className={cn(
                  "h-9 border-b px-3 align-middle",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                  col.className
                )}
              >
                {col.cell(row, index)}
              </td>
            ));

            if (onRowsReorder) {
              return (
                <DraggableRow key={rowId} index={index} onReorder={onRowsReorder}>
                  {cells}
                </DraggableRow>
              );
            }

            if (renderRowWrapper) {
              return renderRowWrapper(row, index, cells, rowId);
            }

            return <tr key={rowId}>{cells}</tr>;
          })}
        </tbody>
      </table>
    </div>
  );
}
