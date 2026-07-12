"use client";

import {
  useMemo,
  useRef,
  useState,
  useCallback,
  useEffect,
} from "react";
import {
  Calendar,
  Download,
  Eye,
  EyeOff,
  ChevronDown,
  ChevronRight,
  Users,
  Upload,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  updateGanttStepDates,
  updateGanttTaskDates,
  updateGanttTaskProgress,
  updateGanttEntryVisibility,
  removeGanttEntry,
} from "@/lib/data/gantt";
import { ImportWorkflowModal } from "./ImportWorkflowModal";
import type {
  GanttEntryFull,
  GanttDisplayRow,
  BarDragState,
  EditingCell,
  ZoomLevel,
} from "@/types/gantt";
import { ROW_H, WBS_W, PX_PER_DAY } from "@/types/gantt";
import type { WorkflowStep } from "@/types/workflow";
import type { ImplementationTask } from "@/types/implementation";
import type { AppUser } from "@/types/user";

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_BAR_W = 6;
const HEADER_ROW_H = 28; // each of the two timeline header rows
const MS_PER_DAY = 86_400_000;

const SECTION_ORDER = [
  "setup",
  "engineering",
  "procurement",
  "implementation",
  "closeout",
  "serviceWarranty",
] as const;

const SECTION_LABELS: Record<string, string> = {
  setup: "Setup",
  engineering: "Engineering",
  procurement: "Procurement",
  implementation: "Implementation",
  closeout: "Closeout",
  serviceWarranty: "Service & Warranty",
};

const STATUS_COLORS: Record<string, string> = {
  "Complete":    "bg-emerald-500",
  "In Progress": "bg-blue-500",
  "Not Started": "bg-slate-300 dark:bg-slate-600",
  "Blocked":     "bg-red-400",
  "Cancelled":   "bg-slate-200 dark:bg-slate-700",
  "Not Needed":  "bg-slate-200 dark:bg-slate-700",
};

const STATUS_PERCENT: Record<string, number> = {
  "Complete":    100,
  "Not Needed":  100,
  "In Progress":  50,
  "Blocked":      25,
  "Not Started":   0,
  "Cancelled":     0,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface GanttContainerProps {
  projectId: string;
  initialEntries: GanttEntryFull[];
  allSteps: WorkflowStep[];
  allTasks: ImplementationTask[];
  users: AppUser[];
  canEdit: boolean;
  isViewAs: boolean;
}

// ─── Date utilities ───────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function dateToX(date: Date, rangeStart: Date, pxPerDay: number): number {
  return ((date.getTime() - rangeStart.getTime()) / MS_PER_DAY) * pxPerDay;
}

function toDateStr(d: Date): string {
  return d.toISOString().split("T")[0];
}

function startOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

// ─── Build display rows ───────────────────────────────────────────────────────

function buildDisplayRows(
  entries: GanttEntryFull[],
  expandedStepIds: Set<string>,
  localDates: Map<string, { start: Date | null; end: Date | null }>,
  localProgress: Map<string, number>
): GanttDisplayRow[] {
  const stepEntries = entries.filter((e) => e.type === "step");
  const taskEntries = entries.filter((e) => e.type === "task");

  // Map from workflowStepId → step entry id (for matching tasks to steps)
  const stepIdToEntryId = new Map<string, string>();
  stepEntries.forEach((e) => {
    if (e.type === "step") stepIdToEntryId.set(e.workflowStepId, e.id);
  });

  // Group steps by section
  const stepsBySection = new Map<string, GanttEntryFull[]>();
  stepEntries.forEach((e) => {
    if (e.type !== "step") return;
    const sec = e.stepSection;
    if (!stepsBySection.has(sec)) stepsBySection.set(sec, []);
    stepsBySection.get(sec)!.push(e);
  });

  // Collect orphan tasks (tasks whose parent step is NOT in the Gantt)
  const claimedTaskIds = new Set<string>();
  const tasksByStepId = new Map<string, GanttEntryFull[]>();
  taskEntries.forEach((e) => {
    if (e.type !== "task") return;
    const parentStepId = e.taskParentStepId;
    if (parentStepId && stepIdToEntryId.has(parentStepId)) {
      claimedTaskIds.add(e.id);
      if (!tasksByStepId.has(parentStepId)) tasksByStepId.set(parentStepId, []);
      tasksByStepId.get(parentStepId)!.push(e);
    }
  });
  const orphanTasks = taskEntries.filter((e) => !claimedTaskIds.has(e.id));

  const rows: GanttDisplayRow[] = [];

  function getDates(
    entryId: string,
    rawStart: string | null,
    rawEnd: string | null
  ): { startDate: Date | null; endDate: Date | null } {
    const override = localDates.get(entryId);
    if (override) return { startDate: override.start, endDate: override.end };
    return {
      startDate: rawStart ? new Date(rawStart) : null,
      endDate: rawEnd ? new Date(rawEnd) : null,
    };
  }

  function getProgress(entryId: string, baseValue: number): number {
    return localProgress.get(entryId) ?? baseValue;
  }

  // Phase sections in canonical order
  for (const sec of SECTION_ORDER) {
    const sectionSteps = stepsBySection.get(sec) ?? [];
    if (sectionSteps.length === 0) continue;

    // Compute phase summary dates from children
    let phaseStart: Date | null = null;
    let phaseEnd: Date | null = null;
    let totalPct = 0;

    sectionSteps.forEach((e) => {
      if (e.type !== "step") return;
      const { startDate, endDate } = getDates(e.id, e.stepStartDate, e.stepDueDate);
      if (startDate && (!phaseStart || startDate < phaseStart)) phaseStart = startDate;
      if (endDate && (!phaseEnd || endDate > phaseEnd)) phaseEnd = endDate;
      totalPct += STATUS_PERCENT[e.stepStatus] ?? 0;
    });

    const phasePercent = sectionSteps.length > 0 ? Math.round(totalPct / sectionSteps.length) : 0;

    // Virtual phase row
    rows.push({
      id: `phase-${sec}`,
      type: "phase",
      isVirtual: true,
      entryId: null,
      workflowStepId: null,
      workflowStepKey: null,
      taskId: null,
      section: sec,
      title: SECTION_LABELS[sec] ?? sec,
      depth: 0,
      startDate: phaseStart,
      endDate: phaseEnd,
      percentComplete: phasePercent,
      status: phasePercent === 100 ? "Complete" : phasePercent > 0 ? "In Progress" : "Not Started",
      assigneeNames: [],
      customerVisible: true,
      sortOrder: 0,
      hasChildren: sectionSteps.length > 0,
      predecessorEntryIds: [],
    });

    // Step rows (sorted by sortOrder)
    const sortedSteps = [...sectionSteps].sort((a, b) => a.sortOrder - b.sortOrder);
    for (const e of sortedSteps) {
      if (e.type !== "step") continue;
      const { startDate, endDate } = getDates(e.id, e.stepStartDate, e.stepDueDate);
      const pct = getProgress(e.id, STATUS_PERCENT[e.stepStatus] ?? 0);
      const childTasks = tasksByStepId.get(e.workflowStepId) ?? [];

      rows.push({
        id: e.id,
        type: "step",
        isVirtual: false,
        entryId: e.id,
        workflowStepId: e.workflowStepId,
        workflowStepKey: e.stepKey,
        taskId: null,
        section: e.stepSection,
        title: e.stepName,
        depth: 1,
        startDate,
        endDate,
        percentComplete: pct,
        status: e.stepStatus,
        assigneeNames: e.stepOwnerName ? [e.stepOwnerName] : [],
        customerVisible: e.customerVisible,
        sortOrder: e.sortOrder,
        hasChildren: childTasks.length > 0,
        predecessorEntryIds: [],
      });

      // Task children when step is expanded
      if (expandedStepIds.has(e.id) && childTasks.length > 0) {
        const sortedTasks = [...childTasks].sort((a, b) => a.sortOrder - b.sortOrder);
        for (const te of sortedTasks) {
          if (te.type !== "task") continue;
          const { startDate: tStart, endDate: tEnd } = getDates(te.id, te.taskStartDate, te.taskDueDate);
          const tPct = getProgress(te.id, te.taskPercentComplete);
          rows.push({
            id: te.id,
            type: "task",
            isVirtual: false,
            entryId: te.id,
            workflowStepId: null,
            workflowStepKey: null,
            taskId: te.taskId,
            section: sec,
            title: te.taskTitle,
            depth: 2,
            startDate: tStart,
            endDate: tEnd,
            percentComplete: tPct,
            status: te.taskStatus,
            assigneeNames: te.taskAssigneeNames,
            customerVisible: te.customerVisible,
            sortOrder: te.sortOrder,
            hasChildren: false,
            predecessorEntryIds: [],
          });
        }
      }
    }
  }

  // Orphan tasks section (tasks not linked to any step in the Gantt)
  if (orphanTasks.length > 0) {
    let orphanStart: Date | null = null;
    let orphanEnd: Date | null = null;
    let orphanPctSum = 0;

    orphanTasks.forEach((e) => {
      if (e.type !== "task") return;
      const { startDate, endDate } = getDates(e.id, e.taskStartDate, e.taskDueDate);
      if (startDate && (!orphanStart || startDate < orphanStart)) orphanStart = startDate;
      if (endDate && (!orphanEnd || endDate > orphanEnd)) orphanEnd = endDate;
      orphanPctSum += e.taskPercentComplete;
    });

    rows.push({
      id: "phase-orphan-tasks",
      type: "phase",
      isVirtual: true,
      entryId: null,
      workflowStepId: null,
      workflowStepKey: null,
      taskId: null,
      section: "tasks",
      title: "Additional Tasks",
      depth: 0,
      startDate: orphanStart,
      endDate: orphanEnd,
      percentComplete: orphanTasks.length > 0 ? Math.round(orphanPctSum / orphanTasks.length) : 0,
      status: "In Progress",
      assigneeNames: [],
      customerVisible: true,
      sortOrder: 9999,
      hasChildren: true,
      predecessorEntryIds: [],
    });

    for (const e of orphanTasks) {
      if (e.type !== "task") continue;
      const { startDate, endDate } = getDates(e.id, e.taskStartDate, e.taskDueDate);
      const pct = getProgress(e.id, e.taskPercentComplete);
      rows.push({
        id: e.id,
        type: "task",
        isVirtual: false,
        entryId: e.id,
        workflowStepId: null,
        workflowStepKey: null,
        taskId: e.taskId,
        section: "tasks",
        title: e.taskTitle,
        depth: 1,
        startDate,
        endDate,
        percentComplete: pct,
        status: e.taskStatus,
        assigneeNames: e.taskAssigneeNames,
        customerVisible: e.customerVisible,
        sortOrder: e.sortOrder,
        hasChildren: false,
        predecessorEntryIds: [],
      });
    }
  }

  return rows;
}

// ─── Compute timeline date range ──────────────────────────────────────────────

function computeDateRange(
  rows: GanttDisplayRow[],
  zoom: ZoomLevel
): { start: Date; end: Date; totalDays: number } {
  const today = startOfDay(new Date());

  const scheduledRows = rows.filter((r) => r.startDate || r.endDate);
  if (scheduledRows.length === 0) {
    // Default: show 3 months starting ~2 weeks ago
    const start = addDays(today, -14);
    const end = addDays(today, zoom === "week" ? 56 : zoom === "month" ? 76 : 120);
    return { start, end, totalDays: Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY) };
  }

  let min = today;
  let max = addDays(today, 30);
  scheduledRows.forEach((r) => {
    if (r.startDate && r.startDate < min) min = r.startDate;
    if (r.endDate && r.endDate > max) max = r.endDate;
  });

  const padding = zoom === "week" ? 14 : zoom === "month" ? 14 : 30;
  const start = addDays(min, -padding);
  const end = addDays(max, padding);
  const totalDays = Math.max(60, Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY));
  return { start, end, totalDays };
}

// ─── Timeline header builder ──────────────────────────────────────────────────

function buildTimelineHeaders(
  rangeStart: Date,
  totalDays: number,
  pxPerDay: number,
  zoom: ZoomLevel
): { top: React.ReactNode[]; bottom: React.ReactNode[] } {
  const top: React.ReactNode[] = [];
  const bottom: React.ReactNode[] = [];
  const rangeEnd = addDays(rangeStart, totalDays);

  if (zoom === "week") {
    // Top: months, Bottom: week start dates (Mon)
    let cursor = new Date(rangeStart);
    while (cursor < rangeEnd) {
      const mo = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const nextMo = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const segEnd = nextMo < rangeEnd ? nextMo : rangeEnd;
      const days = (segEnd.getTime() - cursor.getTime()) / MS_PER_DAY;
      top.push(
        <div
          key={`top-${cursor.toISOString()}`}
          className="border-r border-border/60 px-2 flex items-center"
          style={{ width: days * pxPerDay, minWidth: days * pxPerDay }}
        >
          <span className="text-[11px] font-semibold text-muted-foreground truncate">
            {cursor.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </span>
        </div>
      );
      cursor = nextMo < rangeEnd ? nextMo : rangeEnd;
      if (cursor >= rangeEnd) break;
      cursor = mo; // reset — actual next block starts from nextMo
      cursor = segEnd;
    }

    // Bottom: days (M T W T F S S) with week separators
    cursor = new Date(rangeStart);
    while (cursor < rangeEnd) {
      const isMonday = cursor.getDay() === 1;
      const dayLabel = cursor.toLocaleDateString("en-US", { weekday: "narrow" });
      const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
      bottom.push(
        <div
          key={`bot-${cursor.toISOString()}`}
          className={cn(
            "border-r border-border/30 flex items-center justify-center",
            isMonday && "border-l border-l-border/60",
            isWeekend && "bg-muted/30"
          )}
          style={{ width: pxPerDay, minWidth: pxPerDay }}
        >
          <span className={cn("text-[10px]", isWeekend ? "text-muted-foreground/50" : "text-muted-foreground")}>
            {dayLabel}
          </span>
        </div>
      );
      cursor = addDays(cursor, 1);
    }
  } else if (zoom === "month") {
    // Top: year/month, Bottom: week numbers or every 5th day
    let cursor = new Date(rangeStart);
    while (cursor < rangeEnd) {
      const monthStart = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const nextMo = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const segEnd = nextMo < rangeEnd ? nextMo : rangeEnd;
      const segStart = cursor < monthStart ? monthStart : cursor;
      const days = (segEnd.getTime() - segStart.getTime()) / MS_PER_DAY;
      top.push(
        <div
          key={`top-${cursor.toISOString()}`}
          className="border-r border-border/60 px-2 flex items-center"
          style={{ width: days * pxPerDay, minWidth: days * pxPerDay }}
        >
          <span className="text-[11px] font-semibold text-muted-foreground truncate">
            {segStart.toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
          </span>
        </div>
      );
      cursor = segEnd;
    }

    // Bottom: week start days (every Mon)
    cursor = new Date(rangeStart);
    // Advance to first Monday if not already
    const dow = cursor.getDay();
    if (dow !== 1) cursor = addDays(cursor, dow === 0 ? 1 : 8 - dow);
    while (cursor < rangeEnd) {
      const leftPx = dateToX(cursor, rangeStart, pxPerDay);
      bottom.push(
        <div
          key={`bot-${cursor.toISOString()}`}
          className="absolute top-0 bottom-0 border-l border-border/30 px-1 flex items-center"
          style={{ left: leftPx, width: 7 * pxPerDay }}
        >
          <span className="text-[10px] text-muted-foreground">
            {cursor.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}
          </span>
        </div>
      );
      cursor = addDays(cursor, 7);
    }
  } else {
    // Quarter / Year: Top = year, Bottom = months
    let cursor = new Date(rangeStart.getFullYear(), 0, 1);
    while (cursor < rangeEnd) {
      const nextYear = new Date(cursor.getFullYear() + 1, 0, 1);
      const segEnd = nextYear < rangeEnd ? nextYear : rangeEnd;
      const segStart = cursor < rangeStart ? rangeStart : cursor;
      const days = (segEnd.getTime() - segStart.getTime()) / MS_PER_DAY;
      top.push(
        <div
          key={`top-${cursor.toISOString()}`}
          className="border-r border-border/60 px-2 flex items-center"
          style={{ width: days * pxPerDay, minWidth: days * pxPerDay }}
        >
          <span className="text-[11px] font-semibold text-muted-foreground">
            {segStart.getFullYear()}
          </span>
        </div>
      );
      cursor = nextYear;
    }

    // Bottom: months
    cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    while (cursor < rangeEnd) {
      const nextMo = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const segEnd = nextMo < rangeEnd ? nextMo : rangeEnd;
      const segStart = cursor < rangeStart ? rangeStart : cursor;
      const days = (segEnd.getTime() - segStart.getTime()) / MS_PER_DAY;
      if (days > 0) {
        bottom.push(
          <div
            key={`bot-${cursor.toISOString()}`}
            className="border-r border-border/30 px-1 flex items-center"
            style={{ width: days * pxPerDay, minWidth: days * pxPerDay }}
          >
            <span className="text-[10px] text-muted-foreground truncate">
              {segStart.toLocaleDateString("en-US", { month: "short" })}
            </span>
          </div>
        );
      }
      cursor = nextMo;
    }
  }

  return { top, bottom };
}

// ─── Main component ───────────────────────────────────────────────────────────

export function GanttContainer({
  projectId,
  initialEntries,
  allSteps,
  allTasks,
  users: _users,
  canEdit,
  isViewAs,
}: GanttContainerProps) {
  const editable = canEdit && !isViewAs;

  // ── State ──────────────────────────────────────────────────────────────────

  const [entries, setEntries] = useState<GanttEntryFull[]>(initialEntries);
  const [zoom, setZoom] = useState<ZoomLevel>("month");
  const [expandedStepIds, setExpandedStepIds] = useState<Set<string>>(new Set());
  const [hiddenEntryIds, setHiddenEntryIds] = useState<Set<string>>(new Set());
  const [localDates, setLocalDates] = useState<Map<string, { start: Date | null; end: Date | null }>>(new Map());
  const [localProgress, setLocalProgress] = useState<Map<string, number>>(new Map());
  const [dragState, setDragState] = useState<BarDragState | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [showImport, setShowImport] = useState(false);
  const [saving, setSaving] = useState<string | null>(null); // entryId being saved

  // ── Refs ───────────────────────────────────────────────────────────────────

  const wbsBodyRef = useRef<HTMLDivElement>(null);
  const timelineBodyRef = useRef<HTMLDivElement>(null);
  const syncingScroll = useRef(false);
  const pxPerDayRef = useRef(PX_PER_DAY[zoom]);

  // ── Derived ────────────────────────────────────────────────────────────────

  const pxPerDay = PX_PER_DAY[zoom];
  pxPerDayRef.current = pxPerDay;

  const allDisplayRows = useMemo(
    () => buildDisplayRows(entries, expandedStepIds, localDates, localProgress),
    [entries, expandedStepIds, localDates, localProgress]
  );

  const visibleRows = useMemo(
    () => allDisplayRows.filter((r) => !hiddenEntryIds.has(r.id)),
    [allDisplayRows, hiddenEntryIds]
  );

  const { start: rangeStart, totalDays } = useMemo(
    () => computeDateRange(visibleRows, zoom),
    [visibleRows, zoom]
  );

  const totalTimelineW = totalDays * pxPerDay;

  const { top: headerTop, bottom: headerBottom } = useMemo(
    () => buildTimelineHeaders(rangeStart, totalDays, pxPerDay, zoom),
    [rangeStart, totalDays, pxPerDay, zoom]
  );

  const todayX = useMemo(
    () => dateToX(startOfDay(new Date()), rangeStart, pxPerDay),
    [rangeStart, pxPerDay]
  );

  const entryStepIds = useMemo(
    () => new Set(entries.filter((e) => e.type === "step").map((e) => (e as { workflowStepId: string }).workflowStepId)),
    [entries]
  );
  const entryTaskIds = useMemo(
    () => new Set(entries.filter((e) => e.type === "task").map((e) => (e as { taskId: string }).taskId)),
    [entries]
  );

  // ── Scroll sync ────────────────────────────────────────────────────────────

  const handleWBSScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (syncingScroll.current) return;
    syncingScroll.current = true;
    if (timelineBodyRef.current) timelineBodyRef.current.scrollTop = (e.currentTarget as HTMLDivElement).scrollTop;
    syncingScroll.current = false;
  }, []);

  const handleTimelineScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (syncingScroll.current) return;
    syncingScroll.current = true;
    if (wbsBodyRef.current) wbsBodyRef.current.scrollTop = (e.currentTarget as HTMLDivElement).scrollTop;
    syncingScroll.current = false;
  }, []);

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const startBarDrag = useCallback(
    (
      e: React.PointerEvent,
      entryId: string,
      dragType: BarDragState["dragType"],
      startDate: Date,
      endDate: Date
    ) => {
      if (!editable) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setDragState({
        entryId,
        dragType,
        startPointerX: e.clientX,
        originalStartDate: startDate,
        originalEndDate: endDate,
        previewStartDate: startDate,
        previewEndDate: endDate,
      });
    },
    [editable]
  );

  useEffect(() => {
    if (!dragState) return;

    const handleMove = (e: PointerEvent) => {
      const delta = Math.round((e.clientX - dragState.startPointerX) / pxPerDayRef.current);
      setDragState((prev) => {
        if (!prev) return null;
        if (prev.dragType === "move") {
          return {
            ...prev,
            previewStartDate: addDays(prev.originalStartDate, delta),
            previewEndDate: addDays(prev.originalEndDate, delta),
          };
        }
        if (prev.dragType === "resize-end") {
          const newEnd = addDays(prev.originalEndDate, delta);
          const minEnd = addDays(prev.originalStartDate, 1);
          return {
            ...prev,
            previewEndDate: newEnd > minEnd ? newEnd : minEnd,
          };
        }
        if (prev.dragType === "resize-start") {
          const newStart = addDays(prev.originalStartDate, delta);
          const maxStart = addDays(prev.originalEndDate, -1);
          return {
            ...prev,
            previewStartDate: newStart < maxStart ? newStart : maxStart,
          };
        }
        return prev;
      });
    };

    const handleUp = async () => {
      setDragState((prev) => {
        if (!prev) return null;
        const { entryId, previewStartDate, previewEndDate } = prev;

        // Optimistic update
        setLocalDates((map) => {
          const next = new Map(map);
          next.set(entryId, { start: previewStartDate, end: previewEndDate });
          return next;
        });

        // Find the entry to determine type
        setEntries((es) => {
          const entry = es.find((e) => e.id === entryId);
          if (!entry) return es;

          setSaving(entryId);
          if (entry.type === "step") {
            updateGanttStepDates(entry.workflowStepId, previewStartDate, previewEndDate).finally(() =>
              setSaving(null)
            );
          } else if (entry.type === "task") {
            updateGanttTaskDates(entry.taskId, previewStartDate, previewEndDate).finally(() =>
              setSaving(null)
            );
          }
          return es;
        });

        return null;
      });
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
  }, [dragState]);

  // ── Cell editing ───────────────────────────────────────────────────────────

  function commitDateEdit(rowId: string, field: "startDate" | "endDate", value: string) {
    setEditingCell(null);
    const row = allDisplayRows.find((r) => r.id === rowId);
    if (!row || row.isVirtual) return;

    const newDate = value ? new Date(value + "T12:00:00") : null;
    const current = localDates.get(rowId) ?? { start: row.startDate, end: row.endDate };
    const updated =
      field === "startDate"
        ? { start: newDate, end: current.end }
        : { start: current.start, end: newDate };

    setLocalDates((m) => new Map(m).set(rowId, updated));

    const entry = entries.find((e) => e.id === rowId);
    if (!entry) return;
    if (entry.type === "step") {
      updateGanttStepDates(entry.workflowStepId, updated.start, updated.end);
    } else if (entry.type === "task") {
      updateGanttTaskDates(entry.taskId, updated.start, updated.end);
    }
  }

  function commitProgressEdit(rowId: string, value: string) {
    setEditingCell(null);
    const pct = Math.max(0, Math.min(100, parseInt(value) || 0));
    setLocalProgress((m) => new Map(m).set(rowId, pct));
    const entry = entries.find((e) => e.id === rowId);
    if (entry?.type === "task") {
      updateGanttTaskProgress(entry.taskId, pct);
    }
  }

  // ── Visibility toggle ──────────────────────────────────────────────────────

  function toggleHidden(rowId: string) {
    setHiddenEntryIds((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
      return next;
    });
  }

  async function toggleCustomerVisible(entryId: string, current: boolean) {
    // Optimistic — update entries immediately
    setEntries((es) =>
      es.map((e) => (e.id === entryId ? { ...e, customerVisible: !current } : e))
    );
    await updateGanttEntryVisibility(entryId, !current);
  }

  // ── Remove from Gantt ──────────────────────────────────────────────────────

  async function handleRemoveEntry(entryId: string) {
    setEntries((es) => es.filter((e) => e.id !== entryId));
    await removeGanttEntry(entryId);
  }

  // ── Import ─────────────────────────────────────────────────────────────────

  function handleImportDone(newEntries: GanttEntryFull[]) {
    setEntries((es) => {
      const existingIds = new Set(es.map((e) => e.id));
      return [...es, ...newEntries.filter((e) => !existingIds.has(e.id))];
    });
    setShowImport(false);
  }

  // ── Bar geometry ───────────────────────────────────────────────────────────

  function barGeometry(row: GanttDisplayRow): {
    left: number;
    width: number;
    scheduled: boolean;
    preview: boolean;
  } {
    if (!row.entryId) {
      // Virtual phase row
      if (!row.startDate || !row.endDate)
        return { left: 8, width: 0, scheduled: false, preview: false };
      return {
        left: Math.max(0, dateToX(row.startDate, rangeStart, pxPerDay)),
        width: Math.max(MIN_BAR_W, dateToX(row.endDate, rangeStart, pxPerDay) - dateToX(row.startDate, rangeStart, pxPerDay) + pxPerDay),
        scheduled: true,
        preview: false,
      };
    }

    // Check drag preview
    if (dragState && dragState.entryId === row.entryId) {
      const { previewStartDate, previewEndDate } = dragState;
      return {
        left: Math.max(0, dateToX(previewStartDate, rangeStart, pxPerDay)),
        width: Math.max(
          MIN_BAR_W,
          dateToX(previewEndDate, rangeStart, pxPerDay) - dateToX(previewStartDate, rangeStart, pxPerDay) + pxPerDay
        ),
        scheduled: true,
        preview: true,
      };
    }

    if (!row.startDate && !row.endDate)
      return { left: 8, width: 0, scheduled: false, preview: false };

    const start = row.startDate ?? row.endDate!;
    const end = row.endDate ?? row.startDate!;
    return {
      left: Math.max(0, dateToX(start, rangeStart, pxPerDay)),
      width: Math.max(MIN_BAR_W, dateToX(end, rangeStart, pxPerDay) - dateToX(start, rangeStart, pxPerDay) + pxPerDay),
      scheduled: true,
      preview: false,
    };
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const isEmpty = entries.length === 0;

  return (
    <div className="flex flex-col gap-0 rounded-xl border bg-card shadow-sm overflow-hidden" style={{ height: "calc(100vh - 260px)", minHeight: 400 }}>
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/20 flex-wrap flex-none" data-print-hide>
        <div className="flex items-center gap-1 mr-2">
          <Calendar className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Gantt</span>
        </div>

        {/* Zoom controls */}
        <div className="flex items-center rounded-md border bg-card divide-x overflow-hidden">
          {(["week", "month", "quarter", "year"] as ZoomLevel[]).map((z) => (
            <button
              key={z}
              type="button"
              onClick={() => setZoom(z)}
              className={cn(
                "px-2.5 py-1 text-xs font-medium transition-colors",
                zoom === z
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              {z.charAt(0).toUpperCase() + z.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto">
          {hiddenEntryIds.size > 0 && (
            <Button variant="outline" size="sm" onClick={() => setHiddenEntryIds(new Set())}>
              <Eye className="mr-1.5 size-3.5" />
              Show all
            </Button>
          )}
          {editable && (
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
              <Upload className="mr-1.5 size-3.5" />
              Import from Workflow
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Download className="mr-1.5 size-3.5" />
            Export
          </Button>
        </div>
      </div>

      {/* ── Empty state ──────────────────────────────────────────────────────── */}
      {isEmpty ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-8">
          <div className="size-14 rounded-full bg-muted flex items-center justify-center">
            <Calendar className="size-7 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-medium">Your schedule is empty</p>
            <p className="text-xs text-muted-foreground mt-1">
              Import steps and tasks from the project workflow to start scheduling.
            </p>
          </div>
          {editable && (
            <Button size="sm" onClick={() => setShowImport(true)}>
              <Upload className="mr-1.5 size-3.5" />
              Import from Workflow
            </Button>
          )}
        </div>
      ) : (
        /* ── Split panel ─────────────────────────────────────────────────── */
        <div className="flex flex-1 overflow-hidden min-h-0">
          {/* ── WBS Panel ─────────────────────────────────────────────────── */}
          <div
            className="flex flex-col border-r shrink-0 overflow-y-auto"
            style={{ width: WBS_W }}
            ref={wbsBodyRef}
            onScroll={handleWBSScroll}
          >
            {/* WBS Column headers */}
            <div
              className="sticky top-0 z-10 flex items-center bg-muted/30 border-b text-[11px] font-semibold text-muted-foreground uppercase tracking-wide select-none"
              style={{ height: HEADER_ROW_H * 2 }}
            >
              <div className="flex-1 px-3 truncate">Name</div>
              <div className="w-16 text-center border-l px-1 shrink-0">Start</div>
              <div className="w-16 text-center border-l px-1 shrink-0">Finish</div>
              <div className="w-10 text-center border-l px-1 shrink-0">%</div>
              <div className="w-9 border-l shrink-0" />
            </div>

            {/* WBS Rows */}
            {visibleRows.map((row) => (
              <WBSRow
                key={row.id}
                row={row}
                editable={editable}
                saving={saving === row.entryId}
                editingCell={editingCell}
                expandedStepIds={expandedStepIds}
                hiddenEntryIds={hiddenEntryIds}
                onToggleExpand={(id) => setExpandedStepIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                onToggleHide={toggleHidden}
                onToggleCustomerVisible={toggleCustomerVisible}
                onRemove={handleRemoveEntry}
                onStartEdit={(cell) => editable && setEditingCell(cell)}
                onCommitDate={commitDateEdit}
                onCommitProgress={commitProgressEdit}
              />
            ))}
          </div>

          {/* ── Timeline Panel ────────────────────────────────────────────── */}
          <div
            className="flex-1 overflow-x-auto overflow-y-auto"
            ref={timelineBodyRef}
            onScroll={handleTimelineScroll}
          >
            <div style={{ width: totalTimelineW, position: "relative" }}>
              {/* Timeline header */}
              <div
                className="sticky top-0 z-10 bg-muted/30 border-b select-none"
                style={{ height: HEADER_ROW_H * 2 }}
              >
                {/* Top header row */}
                <div className="flex overflow-hidden" style={{ height: HEADER_ROW_H }}>
                  {headerTop}
                </div>
                {/* Bottom header row */}
                <div className={cn("relative overflow-hidden", zoom === "month" ? "relative" : "flex")} style={{ height: HEADER_ROW_H }}>
                  {headerBottom}
                </div>
              </div>

              {/* Bars area */}
              <div style={{ position: "relative", height: visibleRows.length * ROW_H }}>
                {/* Background grid lines */}
                <TimelineGrid rangeStart={rangeStart} totalDays={totalDays} pxPerDay={pxPerDay} zoom={zoom} visibleRows={visibleRows} />

                {/* Today marker */}
                {todayX >= 0 && todayX <= totalTimelineW && (
                  <div
                    className="absolute top-0 bottom-0 w-0.5 bg-primary/70 z-20 pointer-events-none"
                    style={{ left: todayX }}
                  >
                    <div className="absolute -top-0 left-0 -translate-x-1/2 w-2 h-2 rounded-full bg-primary" />
                  </div>
                )}

                {/* Bars */}
                {visibleRows.map((row, idx) => {
                  const geo = barGeometry(row);
                  const isPhaseBar = row.type === "phase";
                  const barH = isPhaseBar ? 12 : 20;
                  const barColor = STATUS_COLORS[row.status] ?? "bg-slate-300";
                  const isDragging = dragState?.entryId === row.entryId;

                  return (
                    <div
                      key={row.id}
                      className={cn(
                        "absolute flex items-center",
                        row.type === "phase" && "bg-muted/10"
                      )}
                      style={{ top: idx * ROW_H, height: ROW_H, left: 0, right: 0 }}
                    >
                      {geo.scheduled ? (
                        <div
                          className={cn(
                            "absolute rounded flex items-center overflow-hidden select-none",
                            barColor,
                            isDragging && "opacity-80 ring-2 ring-offset-1 ring-primary",
                            !row.isVirtual && editable && "cursor-grab active:cursor-grabbing"
                          )}
                          style={{
                            left: geo.left,
                            width: geo.width,
                            height: barH,
                            top: (ROW_H - barH) / 2,
                          }}
                          onPointerDown={
                            !row.isVirtual && editable
                              ? (e) =>
                                  startBarDrag(
                                    e,
                                    row.entryId!,
                                    "move",
                                    row.startDate ?? new Date(),
                                    row.endDate ?? new Date()
                                  )
                              : undefined
                          }
                        >
                          {/* Progress fill */}
                          {row.percentComplete > 0 && row.percentComplete < 100 && (
                            <div
                              className="absolute inset-y-0 left-0 bg-black/20 rounded-l"
                              style={{ width: `${row.percentComplete}%` }}
                            />
                          )}
                          {/* Label inside bar */}
                          {geo.width > 50 && (
                            <span className="relative z-10 px-1.5 text-[10px] font-medium text-white/90 truncate pointer-events-none">
                              {row.assigneeNames[0] || row.title}
                            </span>
                          )}
                          {/* Resize handle: right edge */}
                          {!row.isVirtual && editable && (
                            <div
                              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-10"
                              onPointerDown={(e) => {
                                e.stopPropagation();
                                startBarDrag(
                                  e,
                                  row.entryId!,
                                  "resize-end",
                                  row.startDate ?? new Date(),
                                  row.endDate ?? new Date()
                                );
                              }}
                            />
                          )}
                        </div>
                      ) : (
                        /* Unscheduled placeholder */
                        !row.isVirtual && (
                          <div
                            className="absolute flex items-center px-1.5 rounded border-2 border-dashed border-muted-foreground/25"
                            style={{ left: 8, height: barH, top: (ROW_H - barH) / 2, minWidth: 64 }}
                          >
                            <span className="text-[9px] text-muted-foreground/60 truncate">Unscheduled</span>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Import modal ──────────────────────────────────────────────────── */}
      {showImport && (
        <ImportWorkflowModal
          projectId={projectId}
          allSteps={allSteps}
          allTasks={allTasks}
          existingStepIds={entryStepIds}
          existingTaskIds={entryTaskIds}
          onDone={handleImportDone}
          onClose={() => setShowImport(false)}
        />
      )}
    </div>
  );
}

// ─── WBS Row ──────────────────────────────────────────────────────────────────

interface WBSRowProps {
  row: GanttDisplayRow;
  editable: boolean;
  saving: boolean;
  editingCell: EditingCell;
  expandedStepIds: Set<string>;
  hiddenEntryIds: Set<string>;
  onToggleExpand: (id: string) => void;
  onToggleHide: (id: string) => void;
  onToggleCustomerVisible: (id: string, current: boolean) => void;
  onRemove: (id: string) => void;
  onStartEdit: (cell: NonNullable<EditingCell>) => void;
  onCommitDate: (rowId: string, field: "startDate" | "endDate", value: string) => void;
  onCommitProgress: (rowId: string, value: string) => void;
}

function WBSRow({
  row,
  editable,
  saving,
  editingCell,
  expandedStepIds,
  hiddenEntryIds,
  onToggleExpand,
  onToggleHide,
  onToggleCustomerVisible,
  onRemove,
  onStartEdit,
  onCommitDate,
  onCommitProgress,
}: WBSRowProps) {
  const indent = row.depth * 16;
  const isExpanded = row.entryId ? expandedStepIds.has(row.entryId) : false;
  const isHidden = hiddenEntryIds.has(row.id);
  const isPhase = row.type === "phase";
  const isStep = row.type === "step";

  const dotColor = STATUS_COLORS[row.status] ?? "bg-slate-300";

  function formatDateShort(d: Date | null): string {
    if (!d) return "—";
    return d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" });
  }

  const isEditingStart = editingCell?.rowId === row.id && editingCell.field === "startDate";
  const isEditingEnd = editingCell?.rowId === row.id && editingCell.field === "endDate";
  const isEditingPct = editingCell?.rowId === row.id && editingCell.field === "percentComplete";

  return (
    <div
      className={cn(
        "group flex items-center border-b last:border-b-0 text-sm transition-colors",
        isPhase ? "bg-muted/10 font-semibold" : "hover:bg-muted/10",
        isHidden && "opacity-50",
        saving && "opacity-60"
      )}
      style={{ height: ROW_H }}
    >
      {/* Name cell */}
      <div
        className="flex items-center gap-1 flex-1 min-w-0 pr-1 overflow-hidden"
        style={{ paddingLeft: indent + 12 }}
      >
        {/* Expand toggle */}
        {row.hasChildren ? (
          <button
            type="button"
            className="shrink-0 text-muted-foreground hover:text-foreground"
            onClick={() => row.entryId && onToggleExpand(row.entryId)}
          >
            {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        ) : (
          <span className="size-3.5 shrink-0" />
        )}

        {/* Status dot */}
        <span className={cn("size-2 shrink-0 rounded-full flex-none", dotColor)} />

        {/* Title */}
        <span className={cn("truncate min-w-0 text-[13px]", isPhase && "font-semibold text-foreground", isStep && "font-medium")}>
          {row.title}
        </span>
      </div>

      {/* Start date cell */}
      <div
        className={cn(
          "w-16 text-center border-l shrink-0 text-[11px] text-muted-foreground px-1",
          editable && !row.isVirtual && "cursor-pointer hover:bg-accent hover:text-foreground"
        )}
        style={{ height: ROW_H, lineHeight: `${ROW_H}px` }}
        onClick={() => editable && !row.isVirtual && onStartEdit({ rowId: row.id, field: "startDate" })}
      >
        {isEditingStart ? (
          <input
            type="date"
            autoFocus
            defaultValue={row.startDate ? toDateStr(row.startDate) : ""}
            className="w-full border-0 bg-transparent text-[11px] text-center p-0 focus:outline-none focus:ring-1 focus:ring-primary rounded"
            onBlur={(e) => onCommitDate(row.id, "startDate", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") onCommitDate(row.id, "startDate", row.startDate ? toDateStr(row.startDate) : "");
            }}
          />
        ) : (
          formatDateShort(row.startDate)
        )}
      </div>

      {/* End date cell */}
      <div
        className={cn(
          "w-16 text-center border-l shrink-0 text-[11px] text-muted-foreground px-1",
          editable && !row.isVirtual && "cursor-pointer hover:bg-accent hover:text-foreground"
        )}
        style={{ height: ROW_H, lineHeight: `${ROW_H}px` }}
        onClick={() => editable && !row.isVirtual && onStartEdit({ rowId: row.id, field: "endDate" })}
      >
        {isEditingEnd ? (
          <input
            type="date"
            autoFocus
            defaultValue={row.endDate ? toDateStr(row.endDate) : ""}
            className="w-full border-0 bg-transparent text-[11px] text-center p-0 focus:outline-none focus:ring-1 focus:ring-primary rounded"
            onBlur={(e) => onCommitDate(row.id, "endDate", e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") onCommitDate(row.id, "endDate", row.endDate ? toDateStr(row.endDate) : "");
            }}
          />
        ) : (
          formatDateShort(row.endDate)
        )}
      </div>

      {/* % Complete cell */}
      <div
        className={cn(
          "w-10 text-center border-l shrink-0 text-[11px] text-muted-foreground px-1",
          editable && !row.isVirtual && row.type === "task" && "cursor-pointer hover:bg-accent hover:text-foreground"
        )}
        style={{ height: ROW_H, lineHeight: `${ROW_H}px` }}
        onClick={() => editable && !row.isVirtual && row.type === "task" && onStartEdit({ rowId: row.id, field: "percentComplete" })}
      >
        {isEditingPct ? (
          <input
            type="number"
            min={0}
            max={100}
            autoFocus
            defaultValue={row.percentComplete}
            className="w-full border-0 bg-transparent text-[11px] text-center p-0 focus:outline-none focus:ring-1 focus:ring-primary rounded"
            onBlur={(e) => onCommitProgress(row.id, e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") onCommitProgress(row.id, String(row.percentComplete));
            }}
          />
        ) : (
          `${row.percentComplete}%`
        )}
      </div>

      {/* Actions cell */}
      <div className="w-9 border-l shrink-0 flex items-center justify-center gap-0">
        {!row.isVirtual && (
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              type="button"
              title={isHidden ? "Show" : "Hide from view"}
              onClick={() => onToggleHide(row.id)}
              className="p-1 text-muted-foreground hover:text-foreground"
            >
              {isHidden ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
            </button>
            {editable && (
              <>
                <button
                  type="button"
                  title={row.customerVisible ? "Visible to customer (click to hide)" : "Hidden from customer (click to show)"}
                  onClick={() => row.entryId && onToggleCustomerVisible(row.entryId, row.customerVisible)}
                  className={cn(
                    "p-1",
                    row.customerVisible ? "text-blue-500" : "text-muted-foreground/40"
                  )}
                >
                  <Users className="size-3" />
                </button>
                <button
                  type="button"
                  title="Remove from Gantt"
                  onClick={() => row.entryId && onRemove(row.entryId)}
                  className="p-1 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="size-3" />
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Timeline grid ────────────────────────────────────────────────────────────

function TimelineGrid({
  rangeStart,
  totalDays,
  pxPerDay,
  zoom,
  visibleRows,
}: {
  rangeStart: Date;
  totalDays: number;
  pxPerDay: number;
  zoom: ZoomLevel;
  visibleRows: GanttDisplayRow[];
}) {
  const lines: { x: number; strong: boolean }[] = [];

  if (zoom === "week") {
    // Vertical lines every day; stronger on Monday
    for (let d = 0; d < totalDays; d++) {
      const date = addDays(rangeStart, d);
      lines.push({ x: d * pxPerDay, strong: date.getDay() === 1 });
    }
  } else if (zoom === "month") {
    // Vertical lines every week (Monday)
    let cursor = new Date(rangeStart);
    const dow = cursor.getDay();
    if (dow !== 1) cursor = addDays(cursor, dow === 0 ? 1 : 8 - dow);
    while (cursor < addDays(rangeStart, totalDays)) {
      lines.push({
        x: dateToX(cursor, rangeStart, pxPerDay),
        strong: cursor.getDate() <= 7,
      });
      cursor = addDays(cursor, 7);
    }
  } else {
    // Month boundaries
    let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    while (cursor < addDays(rangeStart, totalDays)) {
      if (cursor >= rangeStart)
        lines.push({ x: dateToX(cursor, rangeStart, pxPerDay), strong: cursor.getMonth() === 0 });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
  }

  // Alternating phase row backgrounds
  const bgStripes = visibleRows
    .map((row, idx) => ({ idx, isPhase: row.type === "phase" }))
    .filter((r) => r.isPhase);

  return (
    <>
      {bgStripes.map(({ idx }) => (
        <div
          key={idx}
          className="absolute inset-x-0 bg-muted/10"
          style={{ top: idx * ROW_H, height: ROW_H }}
        />
      ))}
      {lines.map(({ x, strong }) => (
        <div
          key={x}
          className={cn("absolute top-0 bottom-0 pointer-events-none", strong ? "border-l border-border/50" : "border-l border-border/20")}
          style={{ left: x }}
        />
      ))}
    </>
  );
}
