export const TASK_STATUSES = [
  "Not Started",
  "In Progress",
  "Blocked",
  "Complete",
  "Cancelled",
] as const;

export type ImplementationTaskStatus = (typeof TASK_STATUSES)[number];

export const TASK_PRIORITIES = ["Low", "Medium", "High", "Critical"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface ImplementationTask {
  id: string;
  projectId: string | null;
  isPersonal: boolean;
  title: string;
  description: string;
  status: ImplementationTaskStatus;
  priority: TaskPriority;
  percentComplete: number; // 0–100
  assignees: { id: string; name: string }[];
  createdById: string | null;
  startDate: string | null; // ISO
  dueDate: string | null;   // ISO
  completedAt: string | null;
  sortOrder: number;
  parentTaskId: string | null;
  notes: string;
  tags: string[];
  subtaskCount: number;
  completedSubtaskCount: number;
  commentCount: number;
  workflowStepId: string | null;
  workflowStepName: string | null;
  dependencyCount: number;
  calendarScheduledAt: string | null;
  calendarEventUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ImplementationTaskComment {
  id: string;
  taskId: string;
  userId: string | null;
  userName: string;
  richContent: Record<string, unknown> | null;
  plainText: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: ImplementationTaskStatus;
  priority?: TaskPriority;
  percentComplete?: number;
  assigneeIds?: string[];
  workflowStepId?: string | null;
  startDate?: string | null;
  dueDate?: string | null;
  parentTaskId?: string | null;
  notes?: string;
  tags?: string[];
  projectId?: string | null;
  isPersonal?: boolean;
}

export interface UpdateTaskInput extends Partial<CreateTaskInput> {
  completedAt?: string | null;
  calendarScheduledAt?: string | null;
  calendarEventUrl?: string | null;
}

export interface TaskDependencyRef {
  depId: string;      // ImplementationTaskDep.id
  taskId: string;
  dependsOnId: string;
  dependsOnTitle: string;
  dependsOnStatus: ImplementationTaskStatus;
}
