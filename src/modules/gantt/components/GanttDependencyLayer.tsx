"use client";

import type { GanttDisplayRow, GanttDependencyRecord } from "@/types/gantt";
import { ROW_H } from "@/types/gantt";

const MARKER_ID = "gantt-dep-arrow";
const ARROW_OVERSHOOT = 12; // px past bar edge before turning vertically
const MS_PER_DAY = 86_400_000;

interface BarEdges {
  leftX: number;
  rightX: number;
}

interface GanttDependencyLayerProps {
  deps: GanttDependencyRecord[];
  visibleRows: GanttDisplayRow[];
  rangeStart: Date;
  pxPerDay: number;
  totalWidth: number;
  totalHeight: number;
  // Optional live preview when a bar is being dragged
  dragPreview?: { entryId: string; startDate: Date; endDate: Date } | null;
  // Click handler for removing a dependency (shows only when editable)
  onRemove?: (depId: string) => void;
}

export function GanttDependencyLayer({
  deps,
  visibleRows,
  rangeStart,
  pxPerDay,
  totalWidth,
  totalHeight,
  dragPreview,
  onRemove,
}: GanttDependencyLayerProps) {
  function dateToX(d: Date): number {
    return ((d.getTime() - rangeStart.getTime()) / MS_PER_DAY) * pxPerDay;
  }

  function getEdges(row: GanttDisplayRow): BarEdges | null {
    // Apply drag preview if this row is being dragged
    if (dragPreview && row.entryId === dragPreview.entryId) {
      return {
        leftX: dateToX(dragPreview.startDate),
        rightX: dateToX(dragPreview.endDate) + pxPerDay,
      };
    }
    if (!row.startDate && !row.endDate) return null;
    const start = row.startDate ?? row.endDate!;
    const end = row.endDate ?? row.startDate!;
    return {
      leftX: Math.max(0, dateToX(start)),
      rightX: Math.max(4, dateToX(end) + pxPerDay),
    };
  }

  // Build lookup: entryId → { rowIndex, row }
  const rowMap = new Map<string, { idx: number; row: GanttDisplayRow }>();
  visibleRows.forEach((r, idx) => {
    if (r.entryId) rowMap.set(r.entryId, { idx, row: r });
  });

  const paths: React.ReactNode[] = [];

  for (const dep of deps) {
    // Phase 2 renders FS and SS; FF/SF rendered as dashed for now
    const from = rowMap.get(dep.fromEntryId);
    const to = rowMap.get(dep.toEntryId);
    if (!from || !to) continue;

    const fromEdges = getEdges(from.row);
    const toEdges = getEdges(to.row);
    if (!fromEdges || !toEdges) continue;

    const fromY = from.idx * ROW_H + ROW_H / 2;
    const toY = to.idx * ROW_H + ROW_H / 2;

    let d: string;
    if (dep.type === "FS") {
      // From: right edge of predecessor → right turn → drop/rise → left to successor start
      const fx = fromEdges.rightX;
      const tx = toEdges.leftX;
      const midX = Math.max(fx + ARROW_OVERSHOOT, tx - ARROW_OVERSHOOT);
      d = `M ${fx} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${tx} ${toY}`;
    } else if (dep.type === "SS") {
      // From: left edge of predecessor → left past start → drop → right to successor start
      const fx = fromEdges.leftX;
      const tx = toEdges.leftX;
      const midX = Math.min(fx - ARROW_OVERSHOOT, tx - ARROW_OVERSHOOT);
      d = `M ${fx} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${tx} ${toY}`;
    } else {
      // FF/SF: simple straight elbow from right-to-right or left-to-right
      const fx = dep.type === "FF" ? fromEdges.rightX : fromEdges.leftX;
      const tx = toEdges.rightX;
      const midX = Math.max(fx, tx) + ARROW_OVERSHOOT;
      d = `M ${fx} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${tx} ${toY}`;
    }

    const isFS = dep.type === "FS";
    const color = isFS ? "hsl(var(--primary))" : "oklch(0.6 0 0)";

    paths.push(
      <g key={dep.id} className="group/dep">
        {/* Wider invisible hit area for hover/click */}
        {onRemove && (
          <path
            d={d}
            fill="none"
            stroke="transparent"
            strokeWidth={10}
            className="cursor-pointer"
            onClick={() => onRemove(dep.id)}
          />
        )}
        {/* Visible arrow */}
        <path
          d={d}
          fill="none"
          stroke={color}
          strokeWidth={1.5}
          strokeDasharray={isFS ? undefined : "4 3"}
          markerEnd={`url(#${MARKER_ID})`}
          opacity={0.65}
          className={onRemove ? "group-hover/dep:opacity-100 group-hover/dep:stroke-destructive" : undefined}
        />
        {/* Lag/lead label */}
        {dep.lagDays !== 0 && (() => {
          const labelX = (fromEdges.rightX + toEdges.leftX) / 2;
          const labelY = (fromY + toY) / 2 - 6;
          return (
            <text
              x={labelX}
              y={labelY}
              fontSize={9}
              fill={color}
              textAnchor="middle"
              opacity={0.8}
            >
              {dep.lagDays > 0 ? `+${dep.lagDays}d` : `${dep.lagDays}d`}
            </text>
          );
        })()}
      </g>
    );
  }

  if (paths.length === 0) return null;

  return (
    <svg
      className="absolute inset-0 overflow-visible pointer-events-none"
      style={{ width: totalWidth, height: totalHeight, zIndex: 10 }}
    >
      <defs>
        <marker
          id={MARKER_ID}
          markerWidth={7}
          markerHeight={7}
          refX={6}
          refY={3.5}
          orient="auto"
        >
          <path d="M0,0 L0,7 L7,3.5 z" fill="hsl(var(--primary))" opacity={0.65} />
        </marker>
      </defs>
      {paths}
    </svg>
  );
}
