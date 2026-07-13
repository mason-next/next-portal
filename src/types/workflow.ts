export type ProjectSectionKey =
  | "setup"
  | "engineering"
  | "procurement"
  | "implementation"
  | "closeout"
  | "serviceWarranty";

export const PROJECT_SECTION_KEYS: ProjectSectionKey[] = [
  "setup",
  "engineering",
  "procurement",
  "implementation",
  "closeout",
  "serviceWarranty",
];

export const WORKFLOW_STEP_KEYS = [
  // Setup
  "opportunityWon",
  "projectCreated",
  "assignTeam",
  "sendWelcomeLetter",
  "initiateProcurementTracking",
  "scheduleInternalKickoff",
  "scheduleTechnicalKickoff",
  "bomReview",
  // Engineering
  "cadReview",
  "pullSchedule",
  "ipScopeSwitchports",
  "functionalNarrative",
  "programmingMockups",
  "engineeringPacket",
  // Procurement & Kickoff Prep
  "equipmentTracking",
  "scheduleResources",
  "onsiteWalkthrough",
  "engineeringPacketReview",
  "submitPmReview",
  // Implementation
  "installation",
  "programming",
  "commissioning",
  "roughIn",       // SC: replaces installation
  "termination",   // SC: replaces programming
  "certification", // SC: replaces commissioning
  // Closeout
  "customerTraining",
  "finalDayDocumentation",
  "closeoutPacket",
  "processRmas",
  "closeout",
  // Service & Warranty
  "serviceWarranty",
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
  // True for user-added steps (see addWorkflowStep).
  isCustom: boolean;
  // True when the user explicitly removes a built-in template step. The DB record is
  // kept so reconcileTemplateStepsDb won't re-seed it; it's filtered out before returning.
  isExcluded?: boolean;
  description: string;
  // Keys of other WorkflowSteps that must be Complete or Not Needed before this step is available.
  dependsOnKeys: string[];
  // "manual" = user sets status; "module" = auto-computed by a MODULE_PROGRESS_PROVIDERS entry.
  completionRule: "manual" | "module";
}
