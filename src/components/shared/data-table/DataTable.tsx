"use client";

import { useEffect, useRef, useState, type ReactNode, type UIEvent } from "react";
import { cn } from "@/lib/utils";
import { DraggableRow } from "./DraggableRow";

export interface ColumnDef<TRow> {
  key: string;
  header: ReactNode;
  width?: number;
  align?: "left" | "right" | "center";
  className?: string;
  /** Pins this column to the left during horizontal scroll. Must be a leading column. */
  sticky?: boolean;
  /** Returning a value here makes the column header clickable to sort by it. */
  sortValue?: (row: TRow) => string | number;
  /** Shows a manual text-filter input for this column, under the header. */
  filterable?: boolean;
  cell: (row: TRow, rowIndex: number) => ReactNode;
}

interface DataTableProps<TRow> {
  columns: ColumnDef<TRow>[];
  rows: TRow[];
  getRowId: (row: TRow) => string;
  hiddenColumns?: Set<string>;
  /** Rows are rendered exactly as given — sort the `rows` prop yourself and report the
   *  active key/direction here so the header can show the right indicator. */
  sort?: { key: string; direction: "asc" | "desc" } | null;
  onSortChange?: (key: string) => void;
  onRowsReorder?: (fromId: string, toId: string) => void;
  renderRowWrapper?: (row: TRow, index: number, cells: ReactNode, rowId: string) => ReactNode;
  /** Manual per-column filter values, keyed by column key — see `filterable` above. */
  filters?: Record<string, string>;
  onFilterChange?: (key: string, value: string) => void;
}

export function DataTable<TRow>({
  columns,
  rows,
  getRowId,
  hiddenColumns,
  sort,
  onSortChange,
  onRowsReorder,
  renderRowWrapper,
  filters,
  onFilterChange,
}: DataTableProps<TRow>) {
  const [widths, setWidths] = useState<Record<string, number>>({});
  const [canScrollRight, setCanScrollRight] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  function updateScrollShadow(el: HTMLDivElement | null) {
    if (!el) return;
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 1);
  }

  function handleScroll(e: UIEvent<HTMLDivElement>) {
    updateScrollShadow(e.currentTarget);
  }

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

  // Sticky columns must be a leading, unbroken prefix — stop accumulating left
  // offsets at the first non-sticky column.
  const leftOffsets: Record<string, number> = {};
  let runningLeft = 0;
  for (const col of visibleColumns) {
    if (!col.sticky) break;
    leftOffsets[col.key] = runningLeft;
    runningLeft += widths[col.key] ?? col.width ?? 0;
  }

  useEffect(() => {
    updateScrollShadow(scrollRef.current);
  }, [rows.length, visibleColumns.length, widths]);

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="max-h-[calc(100vh-320px)] overflow-auto rounded-xl border bg-card"
      >
      <table className="w-full table-fixed border-collapse text-sm">
        <thead>
          <tr>
            {visibleColumns.map((col) => (
              <th
                key={col.key}
                style={{ width: widths[col.key] ?? col.width, left: col.sticky ? leftOffsets[col.key] : undefined }}
                className={cn(
                  "sticky top-0 z-10 h-9 whitespace-nowrap border-b bg-muted px-3 font-semibold text-muted-foreground",
                  col.sticky && "z-20",
                  col.align === "right" && "text-right",
                  col.align === "center" && "text-center",
                  !col.align && "text-left",
                  col.className
                )}
              >
                <div className="relative flex items-center">
                  {col.sortValue && onSortChange ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(col.key)}
                      className="flex items-center gap-1 hover:text-foreground"
                    >
                      {col.header}
                      {sort?.key === col.key ? (
                        <span className="text-[10px]">{sort.direction === "asc" ? "▲" : "▼"}</span>
                      ) : null}
                    </button>
                  ) : (
                    col.header
                  )}
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
          {onFilterChange ? (
            <tr>
              {visibleColumns.map((col) => (
                <th
                  key={`filter-${col.key}`}
                  style={{
                    width: widths[col.key] ?? col.width,
                    left: col.sticky ? leftOffsets[col.key] : undefined,
                  }}
                  className={cn("sticky top-9 z-10 h-8 border-b bg-muted px-2", col.sticky && "z-20")}
                >
                  {col.filterable ? (
                    <input
                      type="text"
                      value={filters?.[col.key] ?? ""}
                      onChange={(e) => onFilterChange(col.key, e.target.value)}
                      placeholder="Filter…"
                      className="h-6 w-full rounded border border-input bg-background px-1.5 text-xs outline-none focus:border-primary"
                    />
                  ) : null}
                </th>
              ))}
            </tr>
          ) : null}
        </thead>
        <tbody>
          {rows.map((row, index) => {
            const rowId = getRowId(row);
            const cells = visibleColumns.map((col) => (
              <td
                key={col.key}
                style={{ left: col.sticky ? leftOffsets[col.key] : undefined }}
                className={cn(
                  "h-9 border-b px-3 align-middle",
                  col.sticky && "sticky z-[5] bg-card",
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
                <DraggableRow key={rowId} rowId={rowId} onReorder={onRowsReorder}>
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
      {canScrollRight ? (
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 rounded-r-xl bg-gradient-to-l from-black/10 to-transparent" />
      ) : null}
    </div>
  );
}
