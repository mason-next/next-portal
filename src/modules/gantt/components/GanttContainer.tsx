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
  Link2,
  Link2Off,
  Undo2,
  Redo2,
  GripVertical,
  Zap,
  Plus,
  X,
  PanelRightClose,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  updateGanttStepDates,
  updateGanttTaskDates,
  updateGanttTaskProgress,
  updateGanttEntryVisibility,
  removeGanttEntry,
  reorderGanttEntries,
  importGanttItems,
  getGanttEntries,
} from "@/lib/data/gantt";
import {
  addGanttDependency,
  removeGanttDependency,
  updateGanttScheduleMode,
} from "@/lib/data/gantt-deps";
import { addWorkflowStep, type AddWorkflowStepInput } from "@/lib/data/workflow";
import { createTask } from "@/lib/data/implementation";
import type { ProjectSectionKey } from "@/types/workflow";
import { computeAutoSchedule } from "@/modules/gantt/lib/gantt-schedule";
import { useGanttHistory } from "@/modules/gantt/hooks/useGanttHistory";
import { GanttDependencyLayer } from "./GanttDependencyLayer";
import { ImportWorkflowModal } from "./ImportWorkflowModal";
import type {
  GanttEntryFull,
  GanttDisplayRow,
  GanttDependencyRecord,
  BarDragState,
  RowDragState,
  LinkState,
  EditingCell,
  ZoomLevel,
  ScheduleMode,
} from "@/types/gantt";
import { ROW_H, WBS_W, PX_PER_DAY } from "@/types/gantt";
import type { WorkflowStep } from "@/types/workflow";
import type { ImplementationTask } from "@/types/implementation";
import type { AppUser } from "@/types/user";

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_BAR_W = 6;
const HEADER_ROW_H = 28;
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
  "Complete":   100,
  "Not Needed": 100,
  "In Progress": 50,
  "Blocked":     25,
  "Not Started":  0,
  "Cancelled":    0,
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface GanttContainerProps {
  projectId: string;
  initialEntries: GanttEntryFull[];
  initialDeps: GanttDependencyRecord[];
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
  localProgress: Map<string, number>,
  localScheduleModes: Map<string, ScheduleMode>,
  orderedEntryIds: string[],
  deps: GanttDependencyRecord[]
): GanttDisplayRow[] {
  // Sort entries by their position in orderedEntryIds (user-defined order)
  const orderIndex = new Map(orderedEntryIds.map((id, i) => [id, i]));
  const sortedEntries = [...entries].sort(
    (a, b) => (orderIndex.get(a.id) ?? 9999) - (orderIndex.get(b.id) ?? 9999)
  );

  const stepEntries = sortedEntries.filter((e) => e.type === "step");
  const taskEntries = sortedEntries.filter((e) => e.type === "task");

  const stepIdToEntryId = new Map<string, string>();
  stepEntries.forEach((e) => {
    if (e.type === "step") stepIdToEntryId.set(e.workflowStepId, e.id);
  });

  const stepsBySection = new Map<string, GanttEntryFull[]>();
  stepEntries.forEach((e) => {
    if (e.type !== "step") return;
    if (!stepsBySection.has(e.stepSection)) stepsBySection.set(e.stepSection, []);
    stepsBySection.get(e.stepSection)!.push(e);
  });

  const claimedTaskIds = new Set<string>();
  const tasksByStepId = new Map<string, GanttEntryFull[]>();
  taskEntries.forEach((e) => {
    if (e.type !== "task") return;
    const parentId = e.taskParentStepId;
    if (parentId && stepIdToEntryId.has(parentId)) {
      claimedTaskIds.add(e.id);
      if (!tasksByStepId.has(parentId)) tasksByStepId.set(parentId, []);
      tasksByStepId.get(parentId)!.push(e);
    }
  });
  const orphanTasks = taskEntries.filter((e) => !claimedTaskIds.has(e.id));

  // Predecessor map: entryId → fromEntryIds
  const predMap = new Map<string, string[]>();
  for (const dep of deps) {
    if (dep.type === "FS") {
      if (!predMap.has(dep.toEntryId)) predMap.set(dep.toEntryId, []);
      predMap.get(dep.toEntryId)!.push(dep.fromEntryId);
    }
  }

  const rows: GanttDisplayRow[] = [];

  function getDates(id: string, rawStart: string | null, rawEnd: string | null) {
    const ov = localDates.get(id);
    if (ov) return { startDate: ov.start, endDate: ov.end };
    return { startDate: rawStart ? new Date(rawStart) : null, endDate: rawEnd ? new Date(rawEnd) : null };
  }

  function getProgress(id: string, base: number) {
    return localProgress.get(id) ?? base;
  }

  function getMode(id: string, base: ScheduleMode): ScheduleMode {
    return localScheduleModes.get(id) ?? base;
  }

  for (const sec of SECTION_ORDER) {
    const sectionSteps = stepsBySection.get(sec) ?? [];
    if (sectionSteps.length === 0) continue;

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
      scheduleMode: "manual",
      assigneeNames: [],
      customerVisible: true,
      sortOrder: 0,
      hasChildren: sectionSteps.length > 0,
      predecessorEntryIds: [],
    });

    for (const e of sectionSteps) {
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
        scheduleMode: getMode(e.id, e.scheduleMode),
        assigneeNames: e.stepOwnerName ? [e.stepOwnerName] : [],
        customerVisible: e.customerVisible,
        sortOrder: e.sortOrder,
        hasChildren: childTasks.length > 0,
        predecessorEntryIds: predMap.get(e.id) ?? [],
      });

      if (expandedStepIds.has(e.id) && childTasks.length > 0) {
        for (const te of childTasks) {
          if (te.type !== "task") continue;
          const { startDate: tStart, endDate: tEnd } = getDates(te.id, te.taskStartDate, te.taskDueDate);
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
            percentComplete: getProgress(te.id, te.taskPercentComplete),
            status: te.taskStatus,
            scheduleMode: getMode(te.id, te.scheduleMode),
            assigneeNames: te.taskAssigneeNames,
            customerVisible: te.customerVisible,
            sortOrder: te.sortOrder,
            hasChildren: false,
            predecessorEntryIds: predMap.get(te.id) ?? [],
          });
        }
      }
    }
  }

  if (orphanTasks.length > 0) {
    let orphanStart: Date | null = null;
    let orphanEnd: Date | null = null;
    let sumPct = 0;
    orphanTasks.forEach((e) => {
      if (e.type !== "task") return;
      const { startDate, endDate } = getDates(e.id, e.taskStartDate, e.taskDueDate);
      if (startDate && (!orphanStart || startDate < orphanStart)) orphanStart = startDate;
      if (endDate && (!orphanEnd || endDate > orphanEnd)) orphanEnd = endDate;
      sumPct += e.taskPercentComplete;
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
      percentComplete: orphanTasks.length ? Math.round(sumPct / orphanTasks.length) : 0,
      status: "In Progress",
      scheduleMode: "manual",
      assigneeNames: [],
      customerVisible: true,
      sortOrder: 9999,
      hasChildren: true,
      predecessorEntryIds: [],
    });

    for (const e of orphanTasks) {
      if (e.type !== "task") continue;
      const { startDate, endDate } = getDates(e.id, e.taskStartDate, e.taskDueDate);
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
        percentComplete: getProgress(e.id, e.taskPercentComplete),
        status: e.taskStatus,
        scheduleMode: getMode(e.id, e.scheduleMode),
        assigneeNames: e.taskAssigneeNames,
        customerVisible: e.customerVisible,
        sortOrder: e.sortOrder,
        hasChildren: false,
        predecessorEntryIds: predMap.get(e.id) ?? [],
      });
    }
  }

  return rows;
}

// ─── Date range ───────────────────────────────────────────────────────────────

function computeDateRange(rows: GanttDisplayRow[], zoom: ZoomLevel) {
  const today = startOfDay(new Date());
  const scheduledRows = rows.filter((r) => r.startDate || r.endDate);

  if (scheduledRows.length === 0) {
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
  return { start, end, totalDays: Math.max(60, Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY)) };
}

// ─── Timeline header ──────────────────────────────────────────────────────────

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
    let cursor = new Date(rangeStart);
    while (cursor < rangeEnd) {
      const nextMo = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const segEnd = nextMo < rangeEnd ? nextMo : rangeEnd;
      const days = (segEnd.getTime() - cursor.getTime()) / MS_PER_DAY;
      top.push(
        <div key={cursor.toISOString()} className="border-r border-border/60 px-2 flex items-center shrink-0" style={{ width: days * pxPerDay, minWidth: days * pxPerDay }}>
          <span className="text-[11px] font-semibold text-muted-foreground truncate">
            {cursor.toLocaleDateString("en-US", { month: "short", year: "numeric" })}
          </span>
        </div>
      );
      cursor = segEnd;
    }
    cursor = new Date(rangeStart);
    while (cursor < rangeEnd) {
      const isWeekend = cursor.getDay() === 0 || cursor.getDay() === 6;
      const isMonday = cursor.getDay() === 1;
      bottom.push(
        <div key={cursor.toISOString()} className={cn("border-r border-border/20 flex items-center justify-center shrink-0", isMonday && "border-l border-l-border/60", isWeekend && "bg-muted/20")} style={{ width: pxPerDay, minWidth: pxPerDay }}>
          <span className={cn("text-[10px]", isWeekend ? "text-muted-foreground/40" : "text-muted-foreground")}>
            {cursor.toLocaleDateString("en-US", { weekday: "narrow" })}
          </span>
        </div>
      );
      cursor = addDays(cursor, 1);
    }
  } else if (zoom === "month") {
    let cursor = new Date(rangeStart);
    while (cursor < rangeEnd) {
      const nextMo = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const segEnd = nextMo < rangeEnd ? nextMo : rangeEnd;
      const days = (segEnd.getTime() - cursor.getTime()) / MS_PER_DAY;
      top.push(
        <div key={cursor.toISOString()} className="border-r border-border/60 px-2 flex items-center shrink-0" style={{ width: days * pxPerDay, minWidth: days * pxPerDay }}>
          <span className="text-[11px] font-semibold text-muted-foreground truncate">
            {cursor.toLocaleDateString("en-US", { month: "short", year: "2-digit" })}
          </span>
        </div>
      );
      cursor = segEnd;
    }
    cursor = new Date(rangeStart);
    const dow = cursor.getDay();
    if (dow !== 1) cursor = addDays(cursor, dow === 0 ? 1 : 8 - dow);
    while (cursor < rangeEnd) {
      bottom.push(
        <div key={cursor.toISOString()} className="absolute top-0 bottom-0 border-l border-border/25 px-1 flex items-center" style={{ left: dateToX(cursor, rangeStart, pxPerDay), width: 7 * pxPerDay }}>
          <span className="text-[10px] text-muted-foreground">{cursor.toLocaleDateString("en-US", { month: "numeric", day: "numeric" })}</span>
        </div>
      );
      cursor = addDays(cursor, 7);
    }
  } else {
    let cursor = new Date(rangeStart.getFullYear(), 0, 1);
    while (cursor < rangeEnd) {
      const nextYear = new Date(cursor.getFullYear() + 1, 0, 1);
      const segEnd = nextYear < rangeEnd ? nextYear : rangeEnd;
      const segStart = cursor < rangeStart ? rangeStart : cursor;
      const days = (segEnd.getTime() - segStart.getTime()) / MS_PER_DAY;
      if (days > 0) {
        top.push(
          <div key={cursor.toISOString()} className="border-r border-border/60 px-2 flex items-center shrink-0" style={{ width: days * pxPerDay, minWidth: days * pxPerDay }}>
            <span className="text-[11px] font-semibold text-muted-foreground">{segStart.getFullYear()}</span>
          </div>
        );
      }
      cursor = nextYear;
    }
    cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    while (cursor < rangeEnd) {
      const nextMo = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      const segEnd = nextMo < rangeEnd ? nextMo : rangeEnd;
      const segStart = cursor < rangeStart ? rangeStart : cursor;
      const days = (segEnd.getTime() - segStart.getTime()) / MS_PER_DAY;
      if (days > 0) {
        bottom.push(
          <div key={cursor.toISOString()} className="border-r border-border/25 px-1 flex items-center shrink-0" style={{ width: days * pxPerDay, minWidth: days * pxPerDay }}>
            <span className="text-[10px] text-muted-foreground truncate">{segStart.toLocaleDateString("en-US", { month: "short" })}</span>
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
  initialDeps,
  allSteps,
  allTasks,
  canEdit,
  isViewAs,
}: GanttContainerProps) {
  const editable = canEdit && !isViewAs;

  // ── Core data state ────────────────────────────────────────────────────────
  const [entries, setEntries] = useState<GanttEntryFull[]>(initialEntries);
  const [deps, setDeps] = useState<GanttDependencyRecord[]>(initialDeps);

  // ── View state ─────────────────────────────────────────────────────────────
  const [zoom, setZoom] = useState<ZoomLevel>("month");
  const [expandedStepIds, setExpandedStepIds] = useState<Set<string>>(new Set());
  const [hiddenEntryIds, setHiddenEntryIds] = useState<Set<string>>(new Set());

  // ── Local overrides (optimistic updates) ──────────────────────────────────
  const [localDates, setLocalDates] = useState<Map<string, { start: Date | null; end: Date | null }>>(new Map());
  const [localProgress, setLocalProgress] = useState<Map<string, number>>(new Map());
  const [localScheduleModes, setLocalScheduleModes] = useState<Map<string, ScheduleMode>>(
    new Map(initialEntries.map((e) => [e.id, e.scheduleMode]))
  );

  // ── Reorder state ──────────────────────────────────────────────────────────
  const [orderedEntryIds, setOrderedEntryIds] = useState<string[]>(
    [...initialEntries].sort((a, b) => a.sortOrder - b.sortOrder).map((e) => e.id)
  );
  const [rowDragState, setRowDragState] = useState<RowDragState | null>(null);

  // ── Interaction state ──────────────────────────────────────────────────────
  const [barDragState, setBarDragState] = useState<BarDragState | null>(null);
  const [editingCell, setEditingCell] = useState<EditingCell>(null);
  const [linkMode, setLinkMode] = useState<LinkState | null>(null);
  const [showImport, setShowImport] = useState(false);
  const [saving, setSaving] = useState<string | null>(null);

  // ── Panel / modal state ────────────────────────────────────────────────────
  const [wbsWidth, setWbsWidth] = useState(WBS_W);
  const wbsWidthRef = useRef(WBS_W);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [addLoading, setAddLoading] = useState(false);

  // ── Undo/redo ──────────────────────────────────────────────────────────────
  const history = useGanttHistory();

  // ── Refs ───────────────────────────────────────────────────────────────────
  const wbsBodyRef = useRef<HTMLDivElement>(null);
  const timelineBodyRef = useRef<HTMLDivElement>(null);
  const syncingScroll = useRef(false);
  const pxPerDayRef = useRef(PX_PER_DAY[zoom]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const pxPerDay = PX_PER_DAY[zoom];
  pxPerDayRef.current = pxPerDay;

  // Compute ordered IDs for row-drag preview
  const activeOrderedIds = useMemo(() => {
    if (!rowDragState) return orderedEntryIds;
    const { sourceId, startY, currentY } = rowDragState;
    const delta = Math.round((currentY - startY) / ROW_H);
    const srcIdx = orderedEntryIds.indexOf(sourceId);
    if (srcIdx < 0 || delta === 0) return orderedEntryIds;
    const result = [...orderedEntryIds];
    const targetIdx = Math.max(0, Math.min(result.length - 1, srcIdx + delta));
    result.splice(srcIdx, 1);
    result.splice(targetIdx, 0, sourceId);
    return result;
  }, [rowDragState, orderedEntryIds]);

  const allDisplayRows = useMemo(
    () => buildDisplayRows(entries, expandedStepIds, localDates, localProgress, localScheduleModes, activeOrderedIds, deps),
    [entries, expandedStepIds, localDates, localProgress, localScheduleModes, activeOrderedIds, deps]
  );

  const visibleRows = useMemo(
    () => allDisplayRows.filter((r) => !hiddenEntryIds.has(r.id)),
    [allDisplayRows, hiddenEntryIds]
  );

  const { start: rangeStart, totalDays } = useMemo(() => computeDateRange(visibleRows, zoom), [visibleRows, zoom]);
  const totalTimelineW = totalDays * pxPerDay;

  const { top: headerTop, bottom: headerBottom } = useMemo(
    () => buildTimelineHeaders(rangeStart, totalDays, pxPerDay, zoom),
    [rangeStart, totalDays, pxPerDay, zoom]
  );

  const todayX = useMemo(() => dateToX(startOfDay(new Date()), rangeStart, pxPerDay), [rangeStart, pxPerDay]);

  const entryStepIds = useMemo(
    () => new Set(entries.filter((e) => e.type === "step").map((e) => (e as { workflowStepId: string }).workflowStepId)),
    [entries]
  );
  const entryTaskIds = useMemo(
    () => new Set(entries.filter((e) => e.type === "task").map((e) => (e as { taskId: string }).taskId)),
    [entries]
  );

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        history.undo();
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === "y" || (e.key === "z" && e.shiftKey))) {
        e.preventDefault();
        history.redo();
      }
      if (e.key === "Escape" && linkMode) {
        setLinkMode(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [history, linkMode]);

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

  // ── Date update helper ─────────────────────────────────────────────────────
  async function applyDateUpdate(
    entryId: string,
    newStart: Date | null,
    newEnd: Date | null
  ) {
    setLocalDates((m) => new Map(m).set(entryId, { start: newStart, end: newEnd }));
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;
    if (entry.type === "step") {
      await updateGanttStepDates(entry.workflowStepId, newStart, newEnd);
    } else {
      await updateGanttTaskDates(entry.taskId, newStart, newEnd);
    }
    // Auto-scheduling cascade
    const cascaded = computeAutoSchedule(entries, deps, localScheduleModes, localDates);
    if (cascaded.size > 0) {
      setLocalDates((m) => {
        const next = new Map(m);
        cascaded.forEach((v, k) => next.set(k, v));
        return next;
      });
      // Persist cascaded dates
      for (const [cId, cDates] of cascaded) {
        const cEntry = entries.find((e) => e.id === cId);
        if (!cEntry) continue;
        if (cEntry.type === "step") updateGanttStepDates(cEntry.workflowStepId, cDates.start, cDates.end);
        else updateGanttTaskDates(cEntry.taskId, cDates.start, cDates.end);
      }
    }
  }

  // ── Bar drag ───────────────────────────────────────────────────────────────
  const startBarDrag = useCallback(
    (e: React.PointerEvent, entryId: string, dragType: BarDragState["dragType"], startDate: Date, endDate: Date) => {
      if (!editable) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setBarDragState({ entryId, dragType, startPointerX: e.clientX, originalStartDate: startDate, originalEndDate: endDate, previewStartDate: startDate, previewEndDate: endDate });
    },
    [editable]
  );

  useEffect(() => {
    if (!barDragState) return;
    const handleMove = (e: PointerEvent) => {
      const delta = Math.round((e.clientX - barDragState.startPointerX) / pxPerDayRef.current);
      setBarDragState((prev) => {
        if (!prev) return null;
        if (prev.dragType === "move") {
          return { ...prev, previewStartDate: addDays(prev.originalStartDate, delta), previewEndDate: addDays(prev.originalEndDate, delta) };
        }
        if (prev.dragType === "resize-end") {
          const newEnd = addDays(prev.originalEndDate, delta);
          return { ...prev, previewEndDate: newEnd > addDays(prev.originalStartDate, 1) ? newEnd : addDays(prev.originalStartDate, 1) };
        }
        if (prev.dragType === "resize-start") {
          const newStart = addDays(prev.originalStartDate, delta);
          return { ...prev, previewStartDate: newStart < addDays(prev.originalEndDate, -1) ? newStart : addDays(prev.originalEndDate, -1) };
        }
        return prev;
      });
    };
    const handleUp = () => {
      setBarDragState((prev) => {
        if (!prev) return null;
        const { entryId, previewStartDate, previewEndDate, originalStartDate, originalEndDate } = prev;
        const row = allDisplayRows.find((r) => r.entryId === entryId);
        if (!row) return null;

        // Optimistic update
        setLocalDates((m) => new Map(m).set(entryId, { start: previewStartDate, end: previewEndDate }));

        // Persist + push to history
        setSaving(entryId);
        const entry = entries.find((e) => e.id === entryId);
        if (entry) {
          history.push({
            description: `Moved "${row.title}"`,
            undo: async () => {
              await applyDateUpdate(entryId, originalStartDate, originalEndDate);
            },
            redo: async () => {
              await applyDateUpdate(entryId, previewStartDate, previewEndDate);
            },
          });
          applyDateUpdate(entryId, previewStartDate, previewEndDate).finally(() => setSaving(null));
        }
        return null;
      });
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => { window.removeEventListener("pointermove", handleMove); window.removeEventListener("pointerup", handleUp); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [barDragState]);

  // ── Row drag-to-reorder ────────────────────────────────────────────────────
  const startRowDrag = useCallback(
    (e: React.PointerEvent, entryId: string) => {
      if (!editable) return;
      e.preventDefault();
      e.currentTarget.setPointerCapture(e.pointerId);
      setRowDragState({ sourceId: entryId, startY: e.clientY, currentY: e.clientY });
    },
    [editable]
  );

  useEffect(() => {
    if (!rowDragState) return;
    const handleMove = (e: PointerEvent) => {
      setRowDragState((prev) => prev ? { ...prev, currentY: e.clientY } : null);
    };
    const handleUp = () => {
      setRowDragState((prev) => {
        if (!prev) return null;
        // Commit reorder
        const prevOrder = [...orderedEntryIds];
        setOrderedEntryIds(activeOrderedIds);
        const updates = activeOrderedIds.map((id, idx) => ({ id, sortOrder: idx }));
        setEntries((es) => es.map((e) => {
          const upd = updates.find((u) => u.id === e.id);
          return upd ? { ...e, sortOrder: upd.sortOrder } : e;
        }));
        history.push({
          description: "Reordered rows",
          undo: async () => { setOrderedEntryIds(prevOrder); await reorderGanttEntries(prevOrder.map((id, i) => ({ id, sortOrder: i }))); },
          redo: async () => { setOrderedEntryIds(activeOrderedIds); await reorderGanttEntries(updates); },
        });
        reorderGanttEntries(updates);
        return null;
      });
    };
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => { window.removeEventListener("pointermove", handleMove); window.removeEventListener("pointerup", handleUp); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowDragState]);

  // ── Cell editing ───────────────────────────────────────────────────────────
  function commitDateEdit(rowId: string, field: "startDate" | "endDate", value: string) {
    setEditingCell(null);
    const row = allDisplayRows.find((r) => r.id === rowId);
    if (!row || row.isVirtual) return;
    const newDate = value ? new Date(value + "T12:00:00") : null;
    const current = localDates.get(rowId) ?? { start: row.startDate, end: row.endDate };
    const prev = field === "startDate" ? { start: current.start, end: current.end } : { start: current.start, end: current.end };
    const updated = field === "startDate" ? { start: newDate, end: current.end } : { start: current.start, end: newDate };
    history.push({
      description: `Edit ${field === "startDate" ? "start" : "end"} date`,
      undo: async () => { await applyDateUpdate(rowId, prev.start, prev.end); },
      redo: async () => { await applyDateUpdate(rowId, updated.start, updated.end); },
    });
    applyDateUpdate(rowId, updated.start, updated.end);
  }

  function commitProgressEdit(rowId: string, value: string) {
    setEditingCell(null);
    const pct = Math.max(0, Math.min(100, parseInt(value) || 0));
    const prev = localProgress.get(rowId) ?? (allDisplayRows.find((r) => r.id === rowId)?.percentComplete ?? 0);
    setLocalProgress((m) => new Map(m).set(rowId, pct));
    const entry = entries.find((e) => e.id === rowId);
    if (entry?.type === "task") {
      history.push({
        description: "Edit progress",
        undo: async () => { setLocalProgress((m) => new Map(m).set(rowId, prev)); await updateGanttTaskProgress(entry.taskId, prev); },
        redo: async () => { setLocalProgress((m) => new Map(m).set(rowId, pct)); await updateGanttTaskProgress(entry.taskId, pct); },
      });
      updateGanttTaskProgress(entry.taskId, pct);
    }
  }

  // ── Schedule mode toggle ───────────────────────────────────────────────────
  function toggleScheduleMode(entryId: string) {
    const current = localScheduleModes.get(entryId) ?? "manual";
    const next: ScheduleMode = current === "manual" ? "auto" : "manual";
    setLocalScheduleModes((m) => new Map(m).set(entryId, next));
    updateGanttScheduleMode(entryId, next);
    // Trigger cascade if switching to auto
    if (next === "auto") {
      const cascaded = computeAutoSchedule(entries, deps, new Map(localScheduleModes).set(entryId, "auto"), localDates);
      if (cascaded.size > 0) {
        setLocalDates((m) => { const n = new Map(m); cascaded.forEach((v, k) => n.set(k, v)); return n; });
        cascaded.forEach((dates, cId) => {
          const e = entries.find((en) => en.id === cId);
          if (e?.type === "step") updateGanttStepDates(e.workflowStepId, dates.start, dates.end);
          else if (e?.type === "task") updateGanttTaskDates(e.taskId, dates.start, dates.end);
        });
      }
    }
  }

  // ── Link mode (add dependencies) ──────────────────────────────────────────
  function handleBarClickInLinkMode(entryId: string) {
    if (!linkMode) return;
    if (!linkMode.sourceEntryId) {
      setLinkMode({ sourceEntryId: entryId });
      return;
    }
    if (linkMode.sourceEntryId === entryId) {
      setLinkMode({ sourceEntryId: null });
      return;
    }
    // Create dependency
    const fromId = linkMode.sourceEntryId;
    const toId = entryId;
    addGanttDependency(projectId, fromId, toId, "FS", 0).then((dep) => {
      setDeps((d) => [...d, dep]);
    });
    setLinkMode(null);
  }

  // ── Remove dependency ──────────────────────────────────────────────────────
  function handleRemoveDep(depId: string) {
    const dep = deps.find((d) => d.id === depId);
    if (!dep) return;
    setDeps((d) => d.filter((x) => x.id !== depId));
    removeGanttDependency(depId).catch(() => {
      setDeps((d) => [...d, dep]);
    });
  }

  // ── Visibility ─────────────────────────────────────────────────────────────
  function toggleHidden(rowId: string) {
    setHiddenEntryIds((prev) => { const n = new Set(prev); n.has(rowId) ? n.delete(rowId) : n.add(rowId); return n; });
  }

  async function toggleCustomerVisible(entryId: string, current: boolean) {
    setEntries((es) => es.map((e) => (e.id === entryId ? { ...e, customerVisible: !current } : e)));
    await updateGanttEntryVisibility(entryId, !current);
  }

  async function handleRemoveEntry(entryId: string) {
    setEntries((es) => es.filter((e) => e.id !== entryId));
    setOrderedEntryIds((ids) => ids.filter((id) => id !== entryId));
    await removeGanttEntry(entryId);
  }

  function handleImportDone(newEntries: GanttEntryFull[]) {
    setEntries(newEntries);
    setOrderedEntryIds(newEntries.sort((a, b) => a.sortOrder - b.sortOrder).map((e) => e.id));
    setLocalScheduleModes((m) => {
      const n = new Map(m);
      newEntries.forEach((e) => { if (!n.has(e.id)) n.set(e.id, e.scheduleMode); });
      return n;
    });
    setShowImport(false);
  }

  // ── Add step / task ────────────────────────────────────────────────────────
  async function handleAddGanttItem(
    type: "step" | "task",
    name: string,
    section?: ProjectSectionKey,
    parentStepId?: string | null
  ) {
    setAddLoading(true);
    try {
      if (type === "step") {
        const input: AddWorkflowStepInput = { section: section ?? "implementation", name };
        const newStep = await addWorkflowStep(projectId, input);
        await importGanttItems(projectId, [{ stepId: newStep.id }]);
      } else {
        const newTask = await createTask({ projectId, title: name, workflowStepId: parentStepId ?? null });
        await importGanttItems(projectId, [{ taskId: newTask.id }]);
      }
      const refreshed = await getGanttEntries(projectId);
      setEntries(refreshed);
      setOrderedEntryIds(refreshed.sort((a, b) => a.sortOrder - b.sortOrder).map((e) => e.id));
      setLocalScheduleModes((m) => {
        const n = new Map(m);
        refreshed.forEach((e) => { if (!n.has(e.id)) n.set(e.id, e.scheduleMode); });
        return n;
      });
      setShowAddModal(false);
    } finally {
      setAddLoading(false);
    }
  }

  // ── WBS panel resize ───────────────────────────────────────────────────────
  function startWbsResize(e: React.PointerEvent) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = wbsWidthRef.current;
    function onMove(ev: PointerEvent) {
      const next = Math.max(220, Math.min(800, startW + (ev.clientX - startX)));
      setWbsWidth(next);
      wbsWidthRef.current = next;
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  // ── Bar geometry ───────────────────────────────────────────────────────────
  function barGeometry(row: GanttDisplayRow): { left: number; width: number; scheduled: boolean } {
    const drag = barDragState?.entryId === row.entryId ? barDragState : null;
    const startDate = drag ? drag.previewStartDate : (localDates.get(row.id)?.start ?? row.startDate);
    const endDate = drag ? drag.previewEndDate : (localDates.get(row.id)?.end ?? row.endDate);

    if (!startDate && !endDate) return { left: 8, width: 0, scheduled: false };
    const s = startDate ?? endDate!;
    const e = endDate ?? startDate!;
    return {
      left: Math.max(0, dateToX(s, rangeStart, pxPerDay)),
      width: Math.max(MIN_BAR_W, dateToX(e, rangeStart, pxPerDay) - dateToX(s, rangeStart, pxPerDay) + pxPerDay),
      scheduled: true,
    };
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  const isEmpty = entries.length === 0;
  const isLinkingFrom = linkMode?.sourceEntryId != null;

  return (
    <div
      className={cn(
        "flex flex-col gap-0 rounded-xl border bg-card shadow-sm overflow-hidden",
        linkMode && "cursor-crosshair"
      )}
      style={{ height: "calc(100vh - 260px)", minHeight: 400 }}
    >
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b bg-muted/20 flex-wrap flex-none" data-print-hide>
        <div className="flex items-center gap-1 mr-2">
          <Calendar className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Gantt</span>
        </div>

        {/* Zoom */}
        <div className="flex items-center rounded-md border bg-card divide-x overflow-hidden">
          {(["week", "month", "quarter", "year"] as ZoomLevel[]).map((z) => (
            <button key={z} type="button" onClick={() => setZoom(z)}
              className={cn("px-2.5 py-1 text-xs font-medium transition-colors", zoom === z ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground hover:bg-muted")}>
              {z.charAt(0).toUpperCase() + z.slice(1)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 ml-auto flex-wrap">
          {/* Undo / Redo */}
          {editable && (
            <>
              <Button variant="ghost" size="icon" className="size-8" title="Undo (Ctrl+Z)" disabled={!history.canUndo} onClick={history.undo}>
                <Undo2 className="size-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="size-8" title="Redo (Ctrl+Y)" disabled={!history.canRedo} onClick={history.redo}>
                <Redo2 className="size-3.5" />
              </Button>
            </>
          )}

          {/* Link mode */}
          {editable && (
            <Button
              variant={linkMode ? "default" : "outline"}
              size="sm"
              onClick={() => setLinkMode(linkMode ? null : { sourceEntryId: null })}
              title={linkMode ? "Exit link mode (Esc)" : "Add dependency — click a bar then its successor"}
            >
              {linkMode ? <Link2Off className="mr-1.5 size-3.5" /> : <Link2 className="mr-1.5 size-3.5" />}
              {linkMode ? (isLinkingFrom ? "Click successor…" : "Click a bar…") : "Link"}
            </Button>
          )}

          {hiddenEntryIds.size > 0 && (
            <Button variant="outline" size="sm" onClick={() => setHiddenEntryIds(new Set())}>
              <Eye className="mr-1.5 size-3.5" />
              Show all
            </Button>
          )}
          {editable && (
            <Button variant="outline" size="sm" onClick={() => setShowAddModal(true)}>
              <Plus className="mr-1.5 size-3.5" />
              Add
            </Button>
          )}
          {editable && (
            <Button variant="outline" size="sm" onClick={() => setShowImport(true)}>
              <Upload className="mr-1.5 size-3.5" />
              Import
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
            <p className="text-xs text-muted-foreground mt-1">Import steps and tasks from the project workflow to start scheduling.</p>
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
          {/* ── WBS ───────────────────────────────────────────────────────── */}
          <div
            className="flex flex-col shrink-0 overflow-y-auto"
            style={{ width: wbsWidth }}
            ref={wbsBodyRef}
            onScroll={handleWBSScroll}
          >
            {/* WBS column headers */}
            <div
              className="sticky top-0 z-10 flex items-center bg-muted/30 border-b text-[11px] font-semibold text-muted-foreground uppercase tracking-wide select-none"
              style={{ height: HEADER_ROW_H * 2 }}
            >
              <div className="w-5 shrink-0" />
              <div className="flex-1 px-2 truncate">Name</div>
              <div className="w-7 text-center border-l shrink-0 px-0.5" title="Schedule mode: M=Manual, A=Auto">M</div>
              <div className="w-16 text-center border-l shrink-0 px-1">Start</div>
              <div className="w-16 text-center border-l shrink-0 px-1">Finish</div>
              <div className="w-10 text-center border-l shrink-0 px-1">%</div>
              <div className="w-10 border-l shrink-0" />
            </div>

            {/* WBS rows */}
            {visibleRows.map((row, _idx) => (
              <WBSRow
                key={row.id}
                row={row}
                editable={editable}
                saving={saving === row.entryId}
                editingCell={editingCell}
                expandedStepIds={expandedStepIds}
                hiddenEntryIds={hiddenEntryIds}
                isDraggingRow={rowDragState?.sourceId === row.entryId}
                isSelected={selectedRowId === row.id || selectedRowId === row.entryId}
                onToggleExpand={(id) => setExpandedStepIds((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                onToggleHide={toggleHidden}
                onToggleCustomerVisible={toggleCustomerVisible}
                onRemove={handleRemoveEntry}
                onToggleScheduleMode={toggleScheduleMode}
                onStartEdit={(cell) => editable && !row.isVirtual && setEditingCell(cell)}
                onCommitDate={commitDateEdit}
                onCommitProgress={commitProgressEdit}
                onRowDragStart={startRowDrag}
                onSelect={(id) => setSelectedRowId((prev) => prev === id ? null : id)}
              />
            ))}
          </div>

          {/* ── Resize divider ────────────────────────────────────────────── */}
          <div
            className="w-1 bg-border/50 hover:bg-primary/50 cursor-ew-resize shrink-0 transition-colors select-none"
            onPointerDown={startWbsResize}
          />

          {/* ── Timeline ──────────────────────────────────────────────────── */}
          <div
            className="flex-1 overflow-x-auto overflow-y-auto"
            ref={timelineBodyRef}
            onScroll={handleTimelineScroll}
          >
            <div style={{ width: totalTimelineW, position: "relative" }}>
              {/* Timeline header */}
              <div className="sticky top-0 z-20 bg-muted/30 border-b select-none" style={{ height: HEADER_ROW_H * 2 }}>
                <div className="flex overflow-hidden" style={{ height: HEADER_ROW_H }}>{headerTop}</div>
                <div className={cn("overflow-hidden", zoom === "month" ? "relative" : "flex")} style={{ height: HEADER_ROW_H }}>
                  {headerBottom}
                </div>
              </div>

              {/* Bars area */}
              <div style={{ position: "relative", height: visibleRows.length * ROW_H }}>
                {/* Grid */}
                <TimelineGrid rangeStart={rangeStart} totalDays={totalDays} pxPerDay={pxPerDay} zoom={zoom} visibleRows={visibleRows} />

                {/* Today marker */}
                {todayX >= 0 && todayX <= totalTimelineW && (
                  <div className="absolute top-0 bottom-0 w-0.5 bg-primary/70 z-30 pointer-events-none" style={{ left: todayX }}>
                    <div className="absolute -top-0 left-0 -translate-x-1/2 w-2 h-2 rounded-full bg-primary" />
                  </div>
                )}

                {/* Bars */}
                {visibleRows.map((row, idx) => {
                  const geo = barGeometry(row);
                  const isPhaseBar = row.type === "phase";
                  const barH = isPhaseBar ? 12 : 20;
                  const barColor = STATUS_COLORS[row.status] ?? "bg-slate-300";
                  const isDragging = barDragState?.entryId === row.entryId;
                  const isLinkSource = linkMode?.sourceEntryId === row.entryId;
                  const isInLinkMode = linkMode !== null;

                  return (
                    <div
                      key={row.id}
                      className={cn("absolute flex items-center", row.type === "phase" && "bg-muted/5", rowDragState?.sourceId === row.entryId && "opacity-50")}
                      style={{ top: idx * ROW_H, height: ROW_H, left: 0, right: 0 }}
                    >
                      {geo.scheduled ? (
                        <div
                          className={cn(
                            "absolute rounded flex items-center overflow-hidden select-none",
                            barColor,
                            isDragging && "opacity-80 ring-2 ring-offset-1 ring-primary",
                            isLinkSource && "ring-2 ring-offset-1 ring-emerald-400",
                            isInLinkMode && !isLinkSource && !row.isVirtual && "ring-1 ring-offset-1 ring-muted-foreground/30 hover:ring-primary cursor-pointer",
                            !isInLinkMode && !row.isVirtual && editable && "cursor-grab active:cursor-grabbing"
                          )}
                          style={{ left: geo.left, width: geo.width, height: barH, top: (ROW_H - barH) / 2 }}
                          onPointerDown={
                            isInLinkMode
                              ? undefined
                              : (!row.isVirtual && editable
                                ? (e) => startBarDrag(e, row.entryId!, "move", row.startDate ?? new Date(), row.endDate ?? new Date())
                                : undefined)
                          }
                          onClick={isInLinkMode && row.entryId ? () => handleBarClickInLinkMode(row.entryId!) : undefined}
                        >
                          {/* Progress fill */}
                          {row.percentComplete > 0 && row.percentComplete < 100 && (
                            <div className="absolute inset-y-0 left-0 bg-black/20 rounded-l" style={{ width: `${row.percentComplete}%` }} />
                          )}
                          {/* Label */}
                          {geo.width > 50 && (
                            <span className="relative z-10 px-1.5 text-[10px] font-medium text-white/90 truncate pointer-events-none">
                              {row.assigneeNames[0] || row.title}
                            </span>
                          )}
                          {/* Resize handle */}
                          {!row.isVirtual && editable && !isInLinkMode && (
                            <div
                              className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize z-10"
                              onPointerDown={(e) => { e.stopPropagation(); startBarDrag(e, row.entryId!, "resize-end", row.startDate ?? new Date(), row.endDate ?? new Date()); }}
                            />
                          )}
                        </div>
                      ) : (
                        !row.isVirtual && (
                          <div
                            className={cn("absolute flex items-center px-1.5 rounded border-2 border-dashed border-muted-foreground/25", isInLinkMode && row.entryId && "cursor-pointer hover:border-primary/50")}
                            style={{ left: 8, height: barH, top: (ROW_H - barH) / 2, minWidth: 64 }}
                            onClick={isInLinkMode && row.entryId ? () => handleBarClickInLinkMode(row.entryId!) : undefined}
                          >
                            <span className="text-[9px] text-muted-foreground/60 truncate">Unscheduled</span>
                          </div>
                        )
                      )}
                    </div>
                  );
                })}

                {/* Dependency arrows SVG overlay */}
                <GanttDependencyLayer
                  deps={deps}
                  visibleRows={visibleRows}
                  rangeStart={rangeStart}
                  pxPerDay={pxPerDay}
                  totalWidth={totalTimelineW}
                  totalHeight={visibleRows.length * ROW_H}
                  dragPreview={
                    barDragState
                      ? { entryId: barDragState.entryId, startDate: barDragState.previewStartDate, endDate: barDragState.previewEndDate }
                      : null
                  }
                  onRemove={editable ? handleRemoveDep : undefined}
                />
              </div>
            </div>
          </div>

          {/* ── Row detail panel ──────────────────────────────────────────── */}
          {selectedRowId && (() => {
            const selRow = allDisplayRows.find((r) => r.id === selectedRowId || r.entryId === selectedRowId);
            if (!selRow || selRow.isVirtual) return null;
            return (
              <GanttRowDetailPanel
                row={selRow}
                deps={deps}
                allDisplayRows={allDisplayRows}
                editable={editable}
                editingCell={editingCell}
                onClose={() => setSelectedRowId(null)}
                onRemoveDep={handleRemoveDep}
                onStartLinkFrom={(entryId) => {
                  setLinkMode({ sourceEntryId: entryId });
                  setSelectedRowId(null);
                }}
                onStartEdit={(cell) => setEditingCell(cell)}
                onCommitDate={commitDateEdit}
                onCommitProgress={commitProgressEdit}
              />
            );
          })()}
        </div>
      )}

      {/* Import modal */}
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

      {/* Add modal */}
      {showAddModal && (
        <GanttAddModal
          allSteps={allSteps}
          loading={addLoading}
          onAdd={handleAddGanttItem}
          onClose={() => setShowAddModal(false)}
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
  isDraggingRow: boolean;
  isSelected: boolean;
  onToggleExpand: (id: string) => void;
  onToggleHide: (id: string) => void;
  onToggleCustomerVisible: (id: string, current: boolean) => void;
  onRemove: (id: string) => void;
  onToggleScheduleMode: (id: string) => void;
  onStartEdit: (cell: NonNullable<EditingCell>) => void;
  onCommitDate: (rowId: string, field: "startDate" | "endDate", value: string) => void;
  onCommitProgress: (rowId: string, value: string) => void;
  onRowDragStart: (e: React.PointerEvent, entryId: string) => void;
  onSelect: (id: string) => void;
}

function WBSRow({
  row,
  editable,
  saving,
  editingCell,
  expandedStepIds,
  hiddenEntryIds,
  isDraggingRow,
  isSelected,
  onToggleExpand,
  onToggleHide,
  onToggleCustomerVisible,
  onRemove,
  onToggleScheduleMode,
  onStartEdit,
  onCommitDate,
  onCommitProgress,
  onRowDragStart,
  onSelect,
}: WBSRowProps) {
  const indent = row.depth * 16;
  const isExpanded = row.entryId ? expandedStepIds.has(row.entryId) : false;
  const isHidden = hiddenEntryIds.has(row.id);
  const isPhase = row.type === "phase";
  const isAuto = row.scheduleMode === "auto";

  const dotColor = STATUS_COLORS[row.status] ?? "bg-slate-300";

  const formatDateShort = (d: Date | null) =>
    d ? d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }) : "—";

  const isEditingStart = editingCell?.rowId === row.id && editingCell.field === "startDate";
  const isEditingEnd = editingCell?.rowId === row.id && editingCell.field === "endDate";
  const isEditingPct = editingCell?.rowId === row.id && editingCell.field === "percentComplete";

  return (
    <div
      className={cn(
        "group flex items-center border-b last:border-b-0 text-sm transition-colors",
        isPhase ? "bg-muted/10" : "hover:bg-muted/10",
        isSelected && !isPhase && "bg-primary/8 border-l-2 border-l-primary",
        isHidden && "opacity-50",
        saving && "opacity-60",
        isDraggingRow && "opacity-30 bg-primary/5"
      )}
      style={{ height: ROW_H }}
    >
      {/* Drag handle */}
      <div
        className={cn(
          "w-5 shrink-0 flex items-center justify-center transition-opacity",
          !row.isVirtual && editable ? "opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing" : "opacity-0 pointer-events-none"
        )}
        onPointerDown={row.entryId ? (e) => onRowDragStart(e, row.entryId!) : undefined}
      >
        <GripVertical className="size-3 text-muted-foreground" />
      </div>

      {/* Name cell */}
      <div className="flex items-center gap-1 flex-1 min-w-0 pr-1 overflow-hidden" style={{ paddingLeft: indent + 4 }}>
        {row.hasChildren ? (
          <button type="button" className="shrink-0 text-muted-foreground hover:text-foreground" onClick={() => row.entryId && onToggleExpand(row.entryId)}>
            {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
          </button>
        ) : <span className="size-3.5 shrink-0" />}
        <span className={cn("size-2 shrink-0 rounded-full flex-none", dotColor)} />
        <span
          className={cn(
            "truncate min-w-0 text-[13px]",
            isPhase && "font-semibold text-foreground",
            row.type === "step" && "font-medium",
            !isPhase && "cursor-pointer hover:text-primary hover:underline",
            isSelected && "text-primary"
          )}
          onClick={() => !isPhase && row.entryId && onSelect(row.entryId)}
        >
          {row.title}
        </span>
      </div>

      {/* Schedule mode badge */}
      <div className="w-7 text-center border-l shrink-0 flex items-center justify-center" style={{ height: ROW_H }}>
        {!row.isVirtual && editable ? (
          <button
            type="button"
            title={isAuto ? "Auto-scheduled (click for manual)" : "Manual scheduling (click for auto)"}
            onClick={() => row.entryId && onToggleScheduleMode(row.entryId)}
            className={cn("text-[10px] font-bold rounded px-0.5", isAuto ? "text-blue-500" : "text-muted-foreground/40 hover:text-muted-foreground")}
          >
            {isAuto ? <Zap className="size-3 text-blue-500" /> : "M"}
          </button>
        ) : null}
      </div>

      {/* Start */}
      <div
        className={cn("w-16 text-center border-l shrink-0 text-[11px] text-muted-foreground px-1 leading-none flex items-center justify-center", editable && !row.isVirtual && "cursor-pointer hover:bg-accent hover:text-foreground")}
        style={{ height: ROW_H }}
        onClick={() => editable && !row.isVirtual && onStartEdit({ rowId: row.id, field: "startDate" })}
      >
        {isEditingStart ? (
          <input type="date" autoFocus defaultValue={row.startDate ? toDateStr(row.startDate) : ""}
            className="w-full border-0 bg-transparent text-[11px] text-center p-0 focus:outline-none"
            onBlur={(e) => onCommitDate(row.id, "startDate", e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          />
        ) : formatDateShort(row.startDate)}
      </div>

      {/* Finish */}
      <div
        className={cn("w-16 text-center border-l shrink-0 text-[11px] text-muted-foreground px-1 leading-none flex items-center justify-center", editable && !row.isVirtual && "cursor-pointer hover:bg-accent hover:text-foreground")}
        style={{ height: ROW_H }}
        onClick={() => editable && !row.isVirtual && onStartEdit({ rowId: row.id, field: "endDate" })}
      >
        {isEditingEnd ? (
          <input type="date" autoFocus defaultValue={row.endDate ? toDateStr(row.endDate) : ""}
            className="w-full border-0 bg-transparent text-[11px] text-center p-0 focus:outline-none"
            onBlur={(e) => onCommitDate(row.id, "endDate", e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          />
        ) : formatDateShort(row.endDate)}
      </div>

      {/* % */}
      <div
        className={cn("w-10 text-center border-l shrink-0 text-[11px] text-muted-foreground px-1 leading-none flex items-center justify-center", editable && !row.isVirtual && row.type === "task" && "cursor-pointer hover:bg-accent hover:text-foreground")}
        style={{ height: ROW_H }}
        onClick={() => editable && !row.isVirtual && row.type === "task" && onStartEdit({ rowId: row.id, field: "percentComplete" })}
      >
        {isEditingPct ? (
          <input type="number" min={0} max={100} autoFocus defaultValue={row.percentComplete}
            className="w-full border-0 bg-transparent text-[11px] text-center p-0 focus:outline-none"
            onBlur={(e) => onCommitProgress(row.id, e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
          />
        ) : `${row.percentComplete}%`}
      </div>

      {/* Actions */}
      <div className="w-10 border-l shrink-0 flex items-center justify-center">
        {!row.isVirtual && (
          <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity gap-0.5">
            <button type="button" title={isHidden ? "Show" : "Hide"} onClick={() => onToggleHide(row.id)} className="p-0.5 text-muted-foreground hover:text-foreground">
              {isHidden ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
            </button>
            {editable && (
              <>
                <button
                  type="button"
                  title={row.customerVisible ? "Visible to customer" : "Hidden from customer"}
                  onClick={() => row.entryId && onToggleCustomerVisible(row.entryId, row.customerVisible)}
                  className={cn("p-0.5", row.customerVisible ? "text-blue-500" : "text-muted-foreground/30")}
                >
                  <Users className="size-3" />
                </button>
                <button type="button" title="Remove from schedule" onClick={() => row.entryId && onRemove(row.entryId)} className="p-0.5 text-muted-foreground hover:text-destructive">
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

function TimelineGrid({ rangeStart, totalDays, pxPerDay, zoom, visibleRows }: {
  rangeStart: Date; totalDays: number; pxPerDay: number; zoom: ZoomLevel; visibleRows: GanttDisplayRow[];
}) {
  const lines: { x: number; strong: boolean; isWeekend?: boolean }[] = [];

  if (zoom === "week") {
    for (let d = 0; d < totalDays; d++) {
      const date = addDays(rangeStart, d);
      const isWeekend = date.getDay() === 0 || date.getDay() === 6;
      lines.push({ x: d * pxPerDay, strong: date.getDay() === 1, isWeekend });
    }
  } else if (zoom === "month") {
    let cursor = new Date(rangeStart);
    const dow = cursor.getDay();
    if (dow !== 1) cursor = addDays(cursor, dow === 0 ? 1 : 8 - dow);
    while (cursor < addDays(rangeStart, totalDays)) {
      lines.push({ x: dateToX(cursor, rangeStart, pxPerDay), strong: cursor.getDate() <= 7 });
      cursor = addDays(cursor, 7);
    }
  } else {
    let cursor = new Date(rangeStart.getFullYear(), rangeStart.getMonth(), 1);
    while (cursor < addDays(rangeStart, totalDays)) {
      if (cursor >= rangeStart) lines.push({ x: dateToX(cursor, rangeStart, pxPerDay), strong: cursor.getMonth() === 0 });
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    }
  }

  return (
    <>
      {visibleRows.map((row, idx) => row.type === "phase" ? (
        <div key={idx} className="absolute inset-x-0 bg-muted/8" style={{ top: idx * ROW_H, height: ROW_H }} />
      ) : null)}
      {lines.filter((l) => l.isWeekend).map(({ x }) => (
        <div key={`we-${x}`} className="absolute top-0 bottom-0 bg-muted/15 pointer-events-none" style={{ left: x, width: pxPerDay }} />
      ))}
      {lines.filter((l) => !l.isWeekend).map(({ x, strong }) => (
        <div key={x} className={cn("absolute top-0 bottom-0 pointer-events-none", strong ? "border-l border-border/40" : "border-l border-border/15")} style={{ left: x }} />
      ))}
    </>
  );
}

// ─── Row detail panel ─────────────────────────────────────────────────────────

function GanttRowDetailPanel({
  row,
  deps,
  allDisplayRows,
  editable,
  editingCell,
  onClose,
  onRemoveDep,
  onStartLinkFrom,
  onStartEdit,
  onCommitDate,
  onCommitProgress,
}: {
  row: GanttDisplayRow;
  deps: GanttDependencyRecord[];
  allDisplayRows: GanttDisplayRow[];
  editable: boolean;
  editingCell: EditingCell;
  onClose: () => void;
  onRemoveDep: (depId: string) => void;
  onStartLinkFrom: (entryId: string) => void;
  onStartEdit: (cell: NonNullable<EditingCell>) => void;
  onCommitDate: (rowId: string, field: "startDate" | "endDate", value: string) => void;
  onCommitProgress: (rowId: string, value: string) => void;
}) {
  const predecessors = deps.filter((d) => d.toEntryId === row.entryId);
  const successors = deps.filter((d) => d.fromEntryId === row.entryId);
  const getTitle = (entryId: string) => allDisplayRows.find((r) => r.entryId === entryId)?.title ?? "Unknown";

  const isEditingStart = editingCell?.rowId === row.id && editingCell.field === "startDate";
  const isEditingEnd = editingCell?.rowId === row.id && editingCell.field === "endDate";
  const isEditingPct = editingCell?.rowId === row.id && editingCell.field === "percentComplete";
  const dotColor = STATUS_COLORS[row.status] ?? "bg-slate-300";

  return (
    <div className="w-72 border-l flex flex-col shrink-0 overflow-y-auto bg-card">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b sticky top-0 bg-card z-10">
        <span className={cn("size-2 rounded-full shrink-0", dotColor)} />
        <span className="flex-1 text-sm font-semibold truncate">{row.title}</span>
        <button onClick={onClose} className="p-0.5 text-muted-foreground hover:text-foreground rounded">
          <PanelRightClose className="size-4" />
        </button>
      </div>

      {/* Type + Status */}
      <div className="px-3 py-2 border-b">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span className="capitalize font-medium">{row.type}</span>
          <span>·</span>
          <span>{row.status}</span>
          {row.assigneeNames.length > 0 && (
            <>
              <span>·</span>
              <span className="truncate">{row.assigneeNames[0]}</span>
            </>
          )}
        </div>
      </div>

      {/* Schedule */}
      <div className="px-3 py-3 border-b space-y-2.5">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Schedule</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <div className="text-[10px] text-muted-foreground mb-1">Start</div>
            {isEditingStart ? (
              <input
                type="date"
                autoFocus
                defaultValue={row.startDate ? toDateStr(row.startDate) : ""}
                className="w-full text-xs border rounded px-1.5 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                onBlur={(e) => onCommitDate(row.id, "startDate", e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              />
            ) : (
              <div
                className={cn("text-xs py-1 rounded", editable && "cursor-pointer hover:text-primary hover:underline")}
                onClick={() => editable && onStartEdit({ rowId: row.id, field: "startDate" })}
              >
                {row.startDate
                  ? row.startDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })
                  : <span className="text-muted-foreground">Not set</span>}
              </div>
            )}
          </div>
          <div>
            <div className="text-[10px] text-muted-foreground mb-1">End</div>
            {isEditingEnd ? (
              <input
                type="date"
                autoFocus
                defaultValue={row.endDate ? toDateStr(row.endDate) : ""}
                className="w-full text-xs border rounded px-1.5 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                onBlur={(e) => onCommitDate(row.id, "endDate", e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              />
            ) : (
              <div
                className={cn("text-xs py-1 rounded", editable && "cursor-pointer hover:text-primary hover:underline")}
                onClick={() => editable && onStartEdit({ rowId: row.id, field: "endDate" })}
              >
                {row.endDate
                  ? row.endDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })
                  : <span className="text-muted-foreground">Not set</span>}
              </div>
            )}
          </div>
        </div>
        {row.type === "task" && (
          <div>
            <div className="text-[10px] text-muted-foreground mb-1">Progress</div>
            {isEditingPct ? (
              <input
                type="number"
                min={0}
                max={100}
                autoFocus
                defaultValue={row.percentComplete}
                className="w-20 text-xs border rounded px-1.5 py-1 bg-background focus:outline-none focus:ring-1 focus:ring-primary/40"
                onBlur={(e) => onCommitProgress(row.id, e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
              />
            ) : (
              <div
                className={cn("text-xs py-1 rounded flex items-center gap-2", editable && "cursor-pointer hover:text-primary")}
                onClick={() => editable && onStartEdit({ rowId: row.id, field: "percentComplete" })}
              >
                <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full" style={{ width: `${row.percentComplete}%` }} />
                </div>
                <span>{row.percentComplete}%</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dependencies */}
      <div className="px-3 py-3 flex-1 space-y-3">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Dependencies</p>

        {predecessors.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">Predecessors</p>
            <div className="space-y-1">
              {predecessors.map((dep) => (
                <div key={dep.id} className="flex items-center gap-1.5 text-xs group/dep">
                  <span className="flex-1 truncate">{getTitle(dep.fromEntryId)}</span>
                  <span className="text-muted-foreground/60 text-[10px] shrink-0">
                    {dep.type}{dep.lagDays ? `+${dep.lagDays}d` : ""}
                  </span>
                  {editable && (
                    <button
                      onClick={() => onRemoveDep(dep.id)}
                      className="p-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover/dep:opacity-100 transition-opacity shrink-0"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {successors.length > 0 && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5">Successors</p>
            <div className="space-y-1">
              {successors.map((dep) => (
                <div key={dep.id} className="flex items-center gap-1.5 text-xs group/dep">
                  <span className="flex-1 truncate">{getTitle(dep.toEntryId)}</span>
                  <span className="text-muted-foreground/60 text-[10px] shrink-0">
                    {dep.type}{dep.lagDays ? `+${dep.lagDays}d` : ""}
                  </span>
                  {editable && (
                    <button
                      onClick={() => onRemoveDep(dep.id)}
                      className="p-0.5 text-muted-foreground hover:text-destructive opacity-0 group-hover/dep:opacity-100 transition-opacity shrink-0"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {predecessors.length === 0 && successors.length === 0 && (
          <p className="text-xs text-muted-foreground">No dependencies set.</p>
        )}

        {editable && row.entryId && (
          <Button
            variant="outline"
            size="sm"
            className="w-full text-xs mt-1"
            onClick={() => onStartLinkFrom(row.entryId!)}
          >
            <Link2 className="mr-1.5 size-3" />
            Add dependency
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Add item modal ───────────────────────────────────────────────────────────

function GanttAddModal({
  allSteps,
  loading,
  onAdd,
  onClose,
}: {
  allSteps: WorkflowStep[];
  loading: boolean;
  onAdd: (type: "step" | "task", name: string, section?: ProjectSectionKey, parentStepId?: string | null) => void;
  onClose: () => void;
}) {
  const [type, setType] = useState<"step" | "task">("step");
  const [name, setName] = useState("");
  const [section, setSection] = useState<ProjectSectionKey>("implementation");
  const [parentStepId, setParentStepId] = useState<string>("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd(
      type,
      name.trim(),
      type === "step" ? section : undefined,
      type === "task" ? (parentStepId || null) : null
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-card rounded-xl shadow-xl border w-full max-w-sm mx-4">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="text-sm font-semibold">Add to Schedule</h3>
          <button onClick={onClose} className="p-1 text-muted-foreground hover:text-foreground rounded">
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Type toggle */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Type</label>
            <div className="flex rounded-md border overflow-hidden divide-x">
              {(["step", "task"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-medium capitalize transition-colors",
                    type === t ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  {t === "step" ? "Phase Step" : "Task"}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">
              {type === "step" ? "Step Name" : "Task Title"}
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === "step" ? "e.g. Site Survey" : "e.g. Configure switches"}
              className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              required
            />
          </div>

          {/* Section (steps only) */}
          {type === "step" && (
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Phase</label>
              <select
                value={section}
                onChange={(e) => setSection(e.target.value as ProjectSectionKey)}
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {SECTION_ORDER.map((s) => (
                  <option key={s} value={s}>{SECTION_LABELS[s] ?? s}</option>
                ))}
              </select>
            </div>
          )}

          {/* Parent step (tasks only) */}
          {type === "task" && (
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Parent Step (optional)</label>
              <select
                value={parentStepId}
                onChange={(e) => setParentStepId(e.target.value)}
                className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="">— No parent step —</option>
                {allSteps.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <Button type="button" variant="outline" size="sm" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" size="sm" className="flex-1" disabled={loading || !name.trim()}>
              {loading ? "Adding…" : "Add to Schedule"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
