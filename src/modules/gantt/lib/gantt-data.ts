import type { WorkflowStep } from "@/types/workflow";
import type { ImplementationTask } from "@/types/implementation";

export type GanttItemType = "phase" | "step" | "task";

export interface GanttItem {
  id: string;
  type: GanttItemType;
  title: string;
  /** Phase / section key for grouping. */
  section: string;
  sectionLabel: string;
  parentId: string | null;
  startDate: Date | null;
  endDate: Date | null;
  status: string;
  percentComplete: number;
  assigneeNames: string[];
  /** Workflow-level dependency step keys (for steps) or task dep IDs (tasks). */
  dependsOnIds: string[];
  sortOrder: number;
}

const SECTION_LABELS: Record<string, string> = {
  setup:          "Setup",
  engineering:    "Engineering",
  procurement:    "Procurement",
  implementation: "Implementation",
  closeout:       "Closeout",
  serviceWarranty: "Service & Warranty",
};

/**
 * Build a flat list of GanttItems from workflow steps + tasks.
 * Hierarchy: phase-header → step → task (tasks nested under their step).
 */
export function buildGanttItems(
  steps: WorkflowStep[],
  tasks: ImplementationTask[],
  users: Map<string, string>   // userId → name
): GanttItem[] {
  const items: GanttItem[] = [];

  // Group steps by section to build phase-level summary rows.
  const sections = [...new Set(steps.map((s) => s.section))];

  for (const section of sections) {
    const sectionSteps = steps.filter((s) => s.section === section);
    const sectionLabel = SECTION_LABELS[section] ?? section;

    // Phase summary row — date range spans all child steps.
    const stepDates = sectionSteps.flatMap((s) => [
      s.dueDate ? new Date(s.dueDate) : null,
      s.completedDate ? new Date(s.completedDate) : null,
    ]).filter(Boolean) as Date[];

    const phaseId = `phase-${section}`;

    items.push({
      id: phaseId,
      type: "phase",
      title: sectionLabel,
      section,
      sectionLabel,
      parentId: null,
      startDate: stepDates.length ? new Date(Math.min(...stepDates.map((d) => d.getTime()))) : null,
      endDate:   stepDates.length ? new Date(Math.max(...stepDates.map((d) => d.getTime()))) : null,
      status: derivePhaseStatus(sectionSteps),
      percentComplete: derivePhasePercent(sectionSteps),
      assigneeNames: [],
      dependsOnIds: [],
      sortOrder: sectionSortOrder(section),
    });

    // Step rows.
    for (const step of sectionSteps.sort((a, b) => a.sortOrder - b.sortOrder)) {
      const stepTasks = tasks.filter((t) => t.workflowStepId === step.id);
      const assigneeName = step.ownerId ? (users.get(step.ownerId) ?? null) : null;

      items.push({
        id: step.id,
        type: "step",
        title: step.name,
        section,
        sectionLabel,
        parentId: phaseId,
        startDate: deriveDateFromTasks(stepTasks, "start"),
        endDate: step.dueDate ? new Date(step.dueDate) : deriveDateFromTasks(stepTasks, "end"),
        status: step.status,
        percentComplete: deriveStepPercent(step, stepTasks),
        assigneeNames: assigneeName ? [assigneeName] : [],
        dependsOnIds: step.dependsOnKeys,
        sortOrder: step.sortOrder,
      });

      // Task rows nested under this step.
      for (const task of stepTasks.sort((a, b) => a.sortOrder - b.sortOrder)) {
        items.push(taskToGanttItem(task, step.id, section, sectionLabel, users));
      }
    }

    // Tasks not linked to any step (unlinked tasks in this project)
    // — attach them under a virtual "Unlinked" step inside implementation.
  }

  // Unlinked tasks (no workflowStepId) grouped at the end.
  const unlinked = tasks.filter((t) => !t.workflowStepId);
  if (unlinked.length > 0) {
    const ulPhaseId = "phase-unlinked";
    items.push({
      id: ulPhaseId,
      type: "phase",
      title: "Unlinked Tasks",
      section: "unlinked",
      sectionLabel: "Unlinked Tasks",
      parentId: null,
      startDate: deriveDateFromTasks(unlinked, "start"),
      endDate:   deriveDateFromTasks(unlinked, "end"),
      status: deriveTasksPhaseStatus(unlinked),
      percentComplete: Math.round(unlinked.reduce((s, t) => s + t.percentComplete, 0) / unlinked.length),
      assigneeNames: [],
      dependsOnIds: [],
      sortOrder: 99,
    });
    for (const task of unlinked) {
      items.push(taskToGanttItem(task, ulPhaseId, "unlinked", "Unlinked Tasks", users));
    }
  }

  return items;
}

function taskToGanttItem(
  task: ImplementationTask,
  parentId: string,
  section: string,
  sectionLabel: string,
  users: Map<string, string>
): GanttItem {
  return {
    id: task.id,
    type: "task",
    title: task.title,
    section,
    sectionLabel,
    parentId,
    startDate: task.startDate ? new Date(task.startDate) : null,
    endDate:   task.dueDate   ? new Date(task.dueDate)   : null,
    status: task.status,
    percentComplete: task.percentComplete,
    assigneeNames: task.assignees.map((a) => users.get(a.id) ?? a.name),
    dependsOnIds: [],
    sortOrder: task.sortOrder,
  };
}

/** Earliest startDate across tasks. */
function deriveDateFromTasks(tasks: ImplementationTask[], which: "start" | "end"): Date | null {
  const dates = tasks
    .map((t) => (which === "start" ? t.startDate : t.dueDate))
    .filter(Boolean)
    .map((d) => new Date(d!));
  if (!dates.length) return null;
  return which === "start"
    ? new Date(Math.min(...dates.map((d) => d.getTime())))
    : new Date(Math.max(...dates.map((d) => d.getTime())));
}

function derivePhaseStatus(steps: WorkflowStep[]): string {
  if (steps.every((s) => s.status === "Complete" || s.status === "Not Needed")) return "Complete";
  if (steps.some((s) => s.status === "In Progress")) return "In Progress";
  return "Not Started";
}

function deriveTasksPhaseStatus(tasks: ImplementationTask[]): string {
  if (tasks.every((t) => t.status === "Complete" || t.status === "Cancelled")) return "Complete";
  if (tasks.some((t) => t.status === "In Progress")) return "In Progress";
  return "Not Started";
}

function derivePhasePercent(steps: WorkflowStep[]): number {
  const active = steps.filter((s) => s.status !== "Not Needed");
  if (!active.length) return 100;
  const complete = active.filter((s) => s.status === "Complete").length;
  return Math.round((complete / active.length) * 100);
}

function deriveStepPercent(step: WorkflowStep, tasks: ImplementationTask[]): number {
  if (step.status === "Complete") return 100;
  if (step.status === "Not Needed") return 100;
  if (!tasks.length) return step.status === "In Progress" ? 50 : 0;
  return Math.round(tasks.reduce((s, t) => s + t.percentComplete, 0) / tasks.length);
}

function sectionSortOrder(section: string): number {
  const order: Record<string, number> = {
    setup: 0, engineering: 1, procurement: 2,
    implementation: 3, closeout: 4, serviceWarranty: 5,
  };
  return order[section] ?? 6;
}

/** Returns the earliest and latest scheduled dates across all items (for axis range). */
export function ganttDateRange(items: GanttItem[]): { min: Date; max: Date } | null {
  const dates: Date[] = [];
  for (const item of items) {
    if (item.startDate) dates.push(item.startDate);
    if (item.endDate)   dates.push(item.endDate);
  }
  if (!dates.length) return null;
  return {
    min: new Date(Math.min(...dates.map((d) => d.getTime()))),
    max: new Date(Math.max(...dates.map((d) => d.getTime()))),
  };
}
