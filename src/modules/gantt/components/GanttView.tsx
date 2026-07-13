"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Eye, EyeOff, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { buildGanttItems, ganttDateRange, type GanttItem } from "@/modules/gantt/lib/gantt-data";
import type { WorkflowStep } from "@/types/workflow";
import type { ImplementationTask } from "@/types/implementation";
import type { AppUser } from "@/types/user";

const ROW_H = 36; // px per row
const LABEL_W = 260; // px for left label column
const MIN_BAR_W = 4; // px minimum rendered bar width

const STATUS_BAR: Record<string, string> = {
  "Complete":     "bg-emerald-500",
  "In Progress":  "bg-blue-500",
  "Not Started":  "bg-muted-foreground/30",
  "Blocked":      "bg-red-400",
  "Cancelled":    "bg-muted-foreground/20",
  "Not Needed":   "bg-muted-foreground/20",
};

interface GanttViewProps {
  steps: WorkflowStep[];
  tasks: ImplementationTask[];
  users: AppUser[];
  projectName: string;
  customerName: string;
  canEdit: boolean;
}

export function GanttView({ steps, tasks, users, projectName, customerName, canEdit }: GanttViewProps) {
  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u.name])), [users]);
  const items = useMemo(() => buildGanttItems(steps, tasks, userMap), [steps, tasks, userMap]);

  // Session-only visibility state: Set of item IDs the user has hidden.
  const [hidden, setHidden] = useState<Set<string>>(new Set());
  // Collapsed phases/steps: Set of item IDs whose children are collapsed.
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const dateRange = useMemo(() => {
    const visibleItems = items.filter((i) => !hidden.has(i.id));
    return ganttDateRange(visibleItems);
  }, [items, hidden]);

  // Build visible rows: phases + steps + tasks, respecting collapsed state.
  const visibleRows = useMemo(() => {
    const rows: GanttItem[] = [];
    for (const item of items) {
      if (hidden.has(item.id)) continue;
      if (item.parentId && isCollapsedOrHidden(item.parentId, collapsed, hidden, items)) continue;
      rows.push(item);
    }
    return rows;
  }, [items, hidden, collapsed]);

  // Total timeline width: minimum 14 days or date span + padding.
  const totalDays = dateRange
    ? Math.max(14, Math.ceil((dateRange.max.getTime() - dateRange.min.getTime()) / 86_400_000) + 4)
    : 30;
  const pxPerDay = Math.max(24, Math.min(48, Math.floor(820 / totalDays)));
  const timelineW = totalDays * pxPerDay;

  function toggleHide(id: string) {
    setHidden((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleCollapse(id: string) {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function showAll() {
    setHidden(new Set());
    setCollapsed(new Set());
  }

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {hidden.size > 0 && (
            <Button variant="outline" size="sm" onClick={showAll}>
              <Eye className="mr-1.5 size-3.5" />
              Show all ({hidden.size} hidden)
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            {visibleRows.length} row{visibleRows.length !== 1 ? "s" : ""} visible
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Download className="mr-1.5 size-3.5" />
          Export / Print
        </Button>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
        {[
          { color: "bg-emerald-500", label: "Complete" },
          { color: "bg-blue-500",    label: "In Progress" },
          { color: "bg-muted-foreground/30", label: "Not Started" },
          { color: "bg-red-400",     label: "Blocked" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-1.5">
            <span className={cn("inline-block h-2.5 w-2.5 rounded-sm", color)} />
            {label}
          </div>
        ))}
        <div className="flex items-center gap-1.5">
          <span className="inline-block h-2.5 w-8 rounded-sm border-2 border-dashed border-muted-foreground/30" />
          Unscheduled
        </div>
      </div>

      {/* Gantt grid */}
      <div className="rounded-xl border bg-card overflow-hidden shadow-sm print:shadow-none">
        {/* Column headers */}
        <div className="flex border-b bg-muted/30 print:bg-white sticky top-0 z-10">
          <div style={{ width: LABEL_W, minWidth: LABEL_W }} className="shrink-0 border-r px-3 py-2">
            <span className="text-xs font-semibold text-muted-foreground">Task / Step</span>
          </div>
          {/* Timeline header */}
          <div className="flex-1 overflow-hidden">
            <div style={{ width: timelineW }} className="flex h-full">
              {dateRange ? (
                buildMonthHeaders(dateRange.min, totalDays, pxPerDay)
              ) : (
                <div className="px-3 py-2 text-xs text-muted-foreground">No scheduled items</div>
              )}
            </div>
          </div>
        </div>

        {/* Rows */}
        {visibleRows.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No items to display.
          </div>
        ) : (
          <div>
            {visibleRows.map((item) => (
              <GanttRow
                key={item.id}
                item={item}
                items={items}
                isCollapsed={collapsed.has(item.id)}
                isHidden={hidden.has(item.id)}
                dateRange={dateRange}
                totalDays={totalDays}
                pxPerDay={pxPerDay}
                timelineW={timelineW}
                canEdit={canEdit}
                onToggleCollapse={toggleCollapse}
                onToggleHide={toggleHide}
              />
            ))}
          </div>
        )}
      </div>

      {/* Print-only header (hidden on screen) */}
      <PrintHeader projectName={projectName} customerName={customerName} />
    </div>
  );
}

// ─── Row ──────────────────────────────────────────────────────────────────────

interface GanttRowProps {
  item: GanttItem;
  items: GanttItem[];
  isCollapsed: boolean;
  isHidden: boolean;
  dateRange: { min: Date; max: Date } | null;
  totalDays: number;
  pxPerDay: number;
  timelineW: number;
  canEdit: boolean;
  onToggleCollapse: (id: string) => void;
  onToggleHide: (id: string) => void;
}

function GanttRow({
  item,
  items,
  isCollapsed,
  dateRange,
  totalDays,
  pxPerDay,
  timelineW,
  onToggleCollapse,
  onToggleHide,
}: GanttRowProps) {
  const hasChildren = items.some((c) => c.parentId === item.id);
  const indent = item.type === "step" ? 16 : item.type === "task" ? 32 : 0;
  const isPhase = item.type === "phase";
  const isStep  = item.type === "step";

  // Bar geometry
  const { leftPx, widthPx, isUnscheduled } = computeBarGeometry(item, dateRange, totalDays, pxPerDay);

  return (
    <div
      className={cn(
        "group flex border-b last:border-b-0 hover:bg-muted/20 transition-colors",
        isPhase && "bg-muted/10 font-semibold"
      )}
      style={{ height: ROW_H }}
    >
      {/* Label column */}
      <div
        style={{ width: LABEL_W, minWidth: LABEL_W, paddingLeft: indent + 12 }}
        className="flex shrink-0 items-center gap-1.5 border-r pr-2 overflow-hidden"
      >
        {/* Collapse toggle */}
        {hasChildren ? (
          <button
            type="button"
            onClick={() => onToggleCollapse(item.id)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            {isCollapsed ? <ChevronRight className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
        ) : (
          <span className="size-3.5 shrink-0" />
        )}

        {/* Status dot */}
        <span className={cn("size-2 shrink-0 rounded-full", STATUS_BAR[item.status] ?? "bg-muted-foreground/30")} />

        {/* Title */}
        <span className={cn(
          "min-w-0 flex-1 truncate text-sm leading-tight",
          isPhase && "font-semibold",
          isStep  && "font-medium",
        )}>
          {item.title}
        </span>

        {/* Hide toggle — only on hover */}
        <button
          type="button"
          title="Hide from Gantt"
          onClick={() => onToggleHide(item.id)}
          className="ml-auto shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-foreground print:hidden"
        >
          <EyeOff className="size-3" />
        </button>
      </div>

      {/* Timeline */}
      <div className="relative flex-1 overflow-hidden" style={{ minWidth: timelineW }}>
        {dateRange && (
          <div className="absolute inset-y-0" style={{ left: leftPx }}>
            {isUnscheduled ? (
              <div
                className="h-5 my-auto rounded border-2 border-dashed border-muted-foreground/30 flex items-center px-1"
                style={{ marginTop: (ROW_H - 20) / 2, width: Math.max(MIN_BAR_W, 56) }}
              >
                <span className="text-[9px] text-muted-foreground truncate">Unscheduled</span>
              </div>
            ) : (
              <div
                title={`${item.startDate?.toLocaleDateString() ?? "?"} → ${item.endDate?.toLocaleDateString() ?? "?"} · ${item.percentComplete}%`}
                className={cn(
                  "absolute rounded flex items-center overflow-hidden",
                  isPhase ? "h-4" : "h-5",
                  STATUS_BAR[item.status] ?? "bg-muted-foreground/30"
                )}
                style={{
                  top: (ROW_H - (isPhase ? 16 : 20)) / 2,
                  width: Math.max(MIN_BAR_W, widthPx),
                }}
              >
                {/* Progress fill overlay */}
                {item.percentComplete > 0 && item.percentComplete < 100 && (
                  <div
                    className="absolute inset-y-0 left-0 bg-black/15 rounded-l"
                    style={{ width: `${item.percentComplete}%` }}
                  />
                )}
                {/* Label inside bar when wide enough */}
                {widthPx > 48 && (
                  <span className="relative z-10 truncate px-1 text-[10px] font-medium text-white/90">
                    {item.assigneeNames[0] ?? item.title}
                  </span>
                )}
              </div>
            )}
          </div>
        )}
        {/* Day grid lines */}
        <DayGrid totalDays={totalDays} pxPerDay={pxPerDay} />
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function computeBarGeometry(
  item: GanttItem,
  dateRange: { min: Date; max: Date } | null,
  _totalDays: number,
  pxPerDay: number
): { leftPx: number; widthPx: number; isUnscheduled: boolean } {
  if (!dateRange || (!item.startDate && !item.endDate)) {
    return { leftPx: 8, widthPx: 0, isUnscheduled: true };
  }
  const rangeStart = dateRange.min.getTime();
  const start = item.startDate ?? item.endDate!;
  const end   = item.endDate   ?? item.startDate!;
  const leftPx  = Math.max(0, ((start.getTime() - rangeStart) / 86_400_000) * pxPerDay);
  const widthPx = Math.max(MIN_BAR_W, ((end.getTime() - start.getTime()) / 86_400_000 + 1) * pxPerDay);
  return { leftPx, widthPx, isUnscheduled: false };
}

function isCollapsedOrHidden(
  parentId: string,
  collapsed: Set<string>,
  hidden: Set<string>,
  items: GanttItem[]
): boolean {
  if (collapsed.has(parentId) || hidden.has(parentId)) return true;
  const parent = items.find((i) => i.id === parentId);
  if (parent?.parentId) return isCollapsedOrHidden(parent.parentId, collapsed, hidden, items);
  return false;
}

function buildMonthHeaders(start: Date, totalDays: number, pxPerDay: number): React.ReactNode {
  const headers: React.ReactNode[] = [];
  let cursor = new Date(start);
  const end = new Date(start.getTime() + totalDays * 86_400_000);

  while (cursor < end) {
    const monthStart = new Date(cursor);
    const nextMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const monthEnd = nextMonth < end ? nextMonth : end;
    const daysInSegment = (monthEnd.getTime() - monthStart.getTime()) / 86_400_000;
    const w = daysInSegment * pxPerDay;

    headers.push(
      <div
        key={`${cursor.getFullYear()}-${cursor.getMonth()}`}
        className="flex flex-col border-r last:border-r-0 px-2 py-1"
        style={{ width: w, minWidth: w }}
      >
        <span className="text-[10px] font-semibold text-muted-foreground">
          {cursor.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
        </span>
      </div>
    );

    cursor = nextMonth;
  }
  return headers;
}

function DayGrid({ totalDays, pxPerDay }: { totalDays: number; pxPerDay: number }) {
  // Only draw week separators (every 7 days) for readability.
  const lines: number[] = [];
  for (let d = 7; d < totalDays; d += 7) lines.push(d);
  return (
    <>
      {lines.map((d) => (
        <div
          key={d}
          className="absolute inset-y-0 border-l border-border/40"
          style={{ left: d * pxPerDay }}
        />
      ))}
    </>
  );
}

function PrintHeader({ projectName, customerName }: { projectName: string; customerName: string }) {
  return (
    <div className="hidden print:block mb-4 border-b pb-4">
      <h1 className="text-xl font-bold">{projectName}</h1>
      <p className="text-sm text-muted-foreground">{customerName}</p>
      <p className="text-xs text-muted-foreground mt-1">
        Exported {new Date().toLocaleDateString("en-US", { dateStyle: "long" })}
        {" · "}Visible items only
      </p>
    </div>
  );
}
