// ─── Gantt Schedule Types ──────────────────────────────────────────────────────

export type ZoomLevel = "week" | "month" | "quarter" | "year";

export const PX_PER_DAY: Record<ZoomLevel, number> = {
  week: 28,
  month: 10,
  quarter: 4,
  year: 2,
};

export const ROW_H   = 40;  // px per row in the Gantt grid
export const WBS_W   = 480; // px width of the left WBS panel
export const HDR_H   = 52;  // px height of each header row (two rows stacked)

// ─── Raw server data ───────────────────────────────────────────────────────────

export interface GanttStepEntry {
  type: "step";
  id: string;          // GanttEntry.id
  projectId: string;
  customerVisible: boolean;
  sortOrder: number;
  workflowStepId: string;
  taskId: null;
  stepKey: string;
  stepName: string;
  stepSection: string;
  stepStatus: string;
  stepOwnerId: string | null;
  stepOwnerName: string | null;
  stepStartDate: string | null;
  stepDueDate: string | null;
}

export interface GanttTaskEntry {
  type: "task";
  id: string;          // GanttEntry.id
  projectId: string;
  customerVisible: boolean;
  sortOrder: number;
  workflowStepId: null;
  taskId: string;
  taskTitle: string;
  taskStatus: string;
  taskPercentComplete: number;
  taskAssigneeId: string | null;
  taskAssigneeName: string | null;
  taskAssigneeNames: string[];
  taskStartDate: string | null;
  taskDueDate: string | null;
  taskParentStepId: string | null; // WorkflowStep.id this task belongs to
}

export type GanttEntryFull = GanttStepEntry | GanttTaskEntry;

// ─── Display rows ─────────────────────────────────────────────────────────────

// Each row rendered in both the WBS and Timeline panels.
// Phase rows are virtual (not backed by a GanttEntry).
export interface GanttDisplayRow {
  id: string;              // entryId for real rows; `phase-${section}` for virtual phase rows
  type: "phase" | "step" | "task";
  isVirtual: boolean;

  entryId: string | null;
  workflowStepId: string | null;
  workflowStepKey: string | null;
  taskId: string | null;
  section: string;

  title: string;
  depth: number;           // 0 = phase, 1 = step, 2 = task

  startDate: Date | null;
  endDate: Date | null;
  percentComplete: number;
  status: string;

  assigneeNames: string[];
  customerVisible: boolean;
  sortOrder: number;
  hasChildren: boolean;

  predecessorEntryIds: string[]; // FS predecessor entry IDs (for dependency arrows)
}

// ─── Interaction state ─────────────────────────────────────────────────────────

export interface BarDragState {
  entryId: string;
  dragType: "move" | "resize-end" | "resize-start";
  startPointerX: number;
  originalStartDate: Date;
  originalEndDate: Date;
  previewStartDate: Date;
  previewEndDate: Date;
}

export type EditingCell = {
  rowId: string;
  field: "startDate" | "endDate" | "percentComplete";
} | null;
