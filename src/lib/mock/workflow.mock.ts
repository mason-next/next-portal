import { SAMPLE_PROJECT } from "@/lib/mock/projects.mock";
import {
  redistributeWeights,
  shouldIncludeStepForTypesWithConfig,
  DEFAULT_PROJECT_TYPE_CONFIG,
  WORKFLOW_STEP_TEMPLATE,
} from "@/modules/project-command-center/lib/workflow-steps";
import { PROJECT_SECTION_KEYS, type WorkflowStep, type WorkflowStepKey } from "@/types/workflow";

// These are bootstrap milestones reached elsewhere (a deal closing, a project record being
// created), not real work — they're pinned to weight 0 forever instead of taking a share of
// the Setup phase's even split.
const WEIGHT_EXEMPT_STEPS = new Set<WorkflowStepKey>(["opportunityWon", "projectCreated"]);

function step(
  projectId: string,
  key: WorkflowStepKey,
  status: WorkflowStep["status"],
  ownerId: string | null,
  dueDate: string | null,
  completedDate: string | null,
  updatedAt: string
): WorkflowStep {
  const template = WORKFLOW_STEP_TEMPLATE.find((entry) => entry.key === key);
  if (!template) throw new Error(`Unknown workflow step key: ${key}`);
  const weightOverridden = WEIGHT_EXEMPT_STEPS.has(key);
  return {
    id: `${projectId}:${key}`,
    projectId,
    key,
    name: template.name,
    section: template.section,
    weight: 0, // filled in by withSeededWeights below
    sortOrder: template.sortOrder,
    status,
    ownerId,
    dueDate,
    completedDate,
    updatedAt,
    statusOverridden: false,
    weightOverridden,
    isCustom: false,
    description: "",
    dependsOnKeys: [],
    completionRule: "manual",
  };
}

// Runs the same even-split redistribution every section goes through on add/remove/edit, so
// a freshly seeded project's weights are computed by the identical rule, not hand-picked.
function withSeededWeights(steps: WorkflowStep[]): WorkflowStep[] {
  return PROJECT_SECTION_KEYS.reduce((acc, section) => redistributeWeights(acc, section), steps);
}

// Every project has, by definition, already had these two happen — seed them Complete
// rather than Not Started so a brand-new project's checklist doesn't look broken.
export function defaultWorkflowSteps(
  projectId: string,
  createdAt: string,
  projectTypes: string[] = []
): WorkflowStep[] {
  const raw = WORKFLOW_STEP_TEMPLATE
    .filter(({ key }) => shouldIncludeStepForTypesWithConfig(key, projectTypes, DEFAULT_PROJECT_TYPE_CONFIG))
    .map(({ key }) => {
      if (key === "opportunityWon" || key === "projectCreated") {
        return step(projectId, key, "Complete", null, createdAt, createdAt, createdAt);
      }
      return step(projectId, key, "Not Started", null, null, null, createdAt);
    });
  return withSeededWeights(raw);
}

// Hand-authored richer seed for the sample demo project, so it looks like a real
// in-flight engagement instead of an empty checklist.
export const SAMPLE_WORKFLOW_STEPS: WorkflowStep[] = withSeededWeights([
  step(SAMPLE_PROJECT.id, "opportunityWon", "Complete", "user-marcus-reed", "2025-12-10T00:00:00.000Z", "2025-12-10T00:00:00.000Z", "2025-12-10T00:00:00.000Z"),
  step(SAMPLE_PROJECT.id, "projectCreated", "Complete", "user-dana-whitfield", "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z", "2026-01-01T00:00:00.000Z"),
  step(SAMPLE_PROJECT.id, "assignTeam", "Complete", "user-dana-whitfield", "2026-01-05T00:00:00.000Z", "2026-01-05T00:00:00.000Z", "2026-01-05T00:00:00.000Z"),
  step(SAMPLE_PROJECT.id, "sendWelcomeLetter", "Complete", "user-dana-whitfield", "2026-01-08T00:00:00.000Z", "2026-01-08T00:00:00.000Z", "2026-01-08T00:00:00.000Z"),
  step(SAMPLE_PROJECT.id, "scheduleInternalKickoff", "Complete", "user-dana-whitfield", "2026-01-12T00:00:00.000Z", "2026-01-12T00:00:00.000Z", "2026-01-12T00:00:00.000Z"),
  step(SAMPLE_PROJECT.id, "scheduleTechnicalKickoff", "Complete", "user-priya-subramaniam", "2026-01-15T00:00:00.000Z", "2026-01-15T00:00:00.000Z", "2026-01-15T00:00:00.000Z"),
  step(SAMPLE_PROJECT.id, "cadReview", "Not Started", null, null, null, "2026-01-01T00:00:00.000Z"),
  step(SAMPLE_PROJECT.id, "bomReview", "In Progress", "user-priya-subramaniam", "2026-02-01T00:00:00.000Z", null, "2026-01-20T00:00:00.000Z"),
  step(SAMPLE_PROJECT.id, "equipmentTracking", "Not Started", null, null, null, "2026-01-01T00:00:00.000Z"),
  step(SAMPLE_PROJECT.id, "installation", "Not Started", null, null, null, "2026-01-01T00:00:00.000Z"),
  step(SAMPLE_PROJECT.id, "programming", "Not Started", null, null, null, "2026-01-01T00:00:00.000Z"),
  step(SAMPLE_PROJECT.id, "commissioning", "Not Started", null, null, null, "2026-01-01T00:00:00.000Z"),
  step(SAMPLE_PROJECT.id, "closeout", "Not Started", null, null, null, "2026-01-01T00:00:00.000Z"),
  step(SAMPLE_PROJECT.id, "serviceWarranty", "Not Started", null, null, null, "2026-01-01T00:00:00.000Z"),
]);
