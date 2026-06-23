export type ProjectSectionKey =
  | "setup"
  | "engineering"
  | "procurement"
  | "implementation"
  | "closeout";

export const PROJECT_SECTION_KEYS: ProjectSectionKey[] = [
  "setup",
  "engineering",
  "procurement",
  "implementation",
  "closeout",
];

export const WORKFLOW_STEP_KEYS = [
  "opportunityWon",
  "projectCreated",
  "assignTeam",
  "sendWelcomeLetter",
  "scheduleInternalKickoff",
  "scheduleTechnicalKickoff",
  "cadReview",
  "bomReview",
  "procurement",
  "installation",
  "programming",
  "commissioning",
  "closeout",
] as const;

// The fixed, built-in steps every project is seeded with. A WorkflowStep.key is no longer
// restricted to this set — user-added custom steps (see lib/data/workflow.ts addWorkflowStep)
// get a generated key — but the template/seed logic still only ever produces these.
export type WorkflowStepKey = (typeof WORKFLOW_STEP_KEYS)[number];

export const WORKFLOW_STEP_STATUSES = ["Not Started", "In Progress", "Complete", "Not Needed"] as const;

export type WorkflowStepStatus = (typeof WORKFLOW_STEP_STATUSES)[number];

export interface WorkflowStep {
  id: string;
  projectId: string;
  key: string; // a WorkflowStepKey for built-in steps, or a generated id for custom ones
  name: string;
  section: ProjectSectionKey;
  weight: number; // percentage points; all steps in a section sum to that section's PHASE_WEIGHT
  status: WorkflowStepStatus;
  ownerId: string | null;
  dueDate: string | null;
  completedDate: string | null; // auto-stamped on entering/leaving Complete/Not Needed, see lib/data/workflow.ts
  sortOrder: number;
  updatedAt: string; // ISO 8601
  // True once a user has manually set the status on a step whose status is normally
  // computed by a MODULE_PROGRESS_PROVIDERS entry (bomReview, assignTeam, sendWelcomeLetter)
  // — tells getWorkflowStepsWithProgress to leave it alone instead of recalculating it.
  statusOverridden: boolean;
  // True once a user has manually set this step's weight — tells redistributeWeights to
  // leave it alone and split the section's remaining budget across the other steps instead.
  weightOverridden: boolean;
  // True for user-added steps (see addWorkflowStep) — only these can be deleted.
  isCustom: boolean;
}
