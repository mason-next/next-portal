import type { StatusTone } from "@/components/shared/StatusBadge";
import type { ProjectSectionKey, WorkflowStep, WorkflowStepKey, WorkflowStepStatus } from "@/types/workflow";

export type { ProjectSectionKey };
export { PROJECT_SECTION_KEYS } from "@/types/workflow";

export const PROJECT_TYPES = ["Box Sale", "Structured Cabling", "Security", "Audio / Visual"] as const;
export type ProjectType = typeof PROJECT_TYPES[number];

// Role fields on Project that can be auto-assigned to workflow steps
export type StepOwnerRole =
  | "seniorInsideId"
  | "insidePMId"
  | "fieldProjectManagerId"
  | "solutionsEngineerId"
  | "solutionsExecutiveId";

export interface WorkflowStepTemplateEntry {
  key: WorkflowStepKey;
  name: string;
  sortOrder: number;
  section: ProjectSectionKey;
  defaultOwnerRole?: StepOwnerRole;
}

// Steps that do NOT apply to Box Sale projects (used by the legacy shouldIncludeStepForTypes).
export const BOX_SALE_EXCLUDED_STEPS = new Set<string>([
  "scheduleInternalKickoff",
  "scheduleTechnicalKickoff",
  "cadReview",
  "pullSchedule",
  "ipScopeSwitchports",
  "functionalNarrative",
  "programmingMockups",
  "engineeringPacket",
  "drawingReview",
  "scheduleResources",
  "onsiteWalkthrough",
  "engineeringPacketReview",
  "submitPmReview",
  "installation",
  "programming",
  "commissioning",
  "roughIn",
  "termination",
  "certification",
  "customerTraining",
  "finalDayDocumentation",
  "processRmas",
]);

// Returns true if this step should be included for the given project types.
// Empty array = no types set = all steps included (default/legacy behavior).
export function shouldIncludeStepForTypes(stepKey: string, projectTypes: string[]): boolean {
  if (projectTypes.length === 0) return true;
  const hasFullService = projectTypes.some((t) => t !== "Box Sale");
  if (hasFullService) return true;
  return !BOX_SALE_EXCLUDED_STEPS.has(stepKey);
}

// Canonical source of truth for name/sortOrder/section, used to seed a project's real
// WorkflowStep[] records (lib/mock/workflow.mock.ts). Not consulted at render time — once
// seeded, a step's own fields are authoritative, so a future per-project override is a data
// edit, not a code change. Per-step weight isn't part of the template anymore — it's
// computed at seed time (and on every add/remove/edit) by redistributeWeights below, split
// evenly across each section's PHASE_WEIGHT budget unless a step's weight is overridden.
export const WORKFLOW_STEP_TEMPLATE: WorkflowStepTemplateEntry[] = [
  // ── Setup ──────────────────────────────────────────────────────────────────
  { key: "opportunityWon",              name: "Opportunity Won",                        sortOrder: 1,  section: "setup" },
  { key: "projectCreated",              name: "Project Created",                        sortOrder: 2,  section: "setup" },
  { key: "assignTeam",                  name: "Assign Team",                            sortOrder: 3,  section: "setup",            defaultOwnerRole: "seniorInsideId" },
  { key: "sendWelcomeLetter",           name: "Send Welcome Letter",                    sortOrder: 4,  section: "setup",            defaultOwnerRole: "seniorInsideId" },
  { key: "initiateProcurementTracking", name: "Initiate Procurement Tracking",          sortOrder: 5,  section: "setup",            defaultOwnerRole: "insidePMId" },
  { key: "scheduleInternalKickoff",     name: "Internal Kickoff",                       sortOrder: 6,  section: "setup",            defaultOwnerRole: "insidePMId" },
  { key: "scheduleTechnicalKickoff",    name: "Customer Kickoff",                       sortOrder: 7,  section: "setup",            defaultOwnerRole: "solutionsEngineerId" },
  // ── Engineering ────────────────────────────────────────────────────────────
  { key: "bomReview",                   name: "BOM Review",                             sortOrder: 8,  section: "engineering",      defaultOwnerRole: "solutionsEngineerId" },
  { key: "cadReview",                   name: "CAD Review",                             sortOrder: 9,  section: "engineering",      defaultOwnerRole: "solutionsEngineerId" },
  { key: "ipScopeSwitchports",          name: "IP Scope & Switchport Assignments",      sortOrder: 10, section: "engineering",      defaultOwnerRole: "solutionsEngineerId" },
  { key: "functionalNarrative",         name: "Draft Functional Narrative",             sortOrder: 11, section: "engineering",      defaultOwnerRole: "solutionsEngineerId" },
  { key: "programmingMockups",          name: "Programming Mockups",                    sortOrder: 12, section: "engineering",      defaultOwnerRole: "solutionsEngineerId" },
  { key: "drawingReview",               name: "Drawing Review & Red Lines",             sortOrder: 13, section: "engineering",      defaultOwnerRole: "solutionsEngineerId" },
  { key: "pullSchedule",                name: "Pull Schedule",                          sortOrder: 14, section: "engineering",      defaultOwnerRole: "solutionsEngineerId" },
  { key: "engineeringPacket",           name: "Compile & Submit Packet to Hub",         sortOrder: 15, section: "engineering",      defaultOwnerRole: "solutionsEngineerId" },
  // ── Procurement & Preparation ──────────────────────────────────────────────
  { key: "equipmentTracking",           name: "Equipment Tracking",                     sortOrder: 16, section: "procurement",      defaultOwnerRole: "insidePMId" },
  { key: "scheduleResources",           name: "Schedule Resources",                     sortOrder: 17, section: "procurement",      defaultOwnerRole: "insidePMId" },
  { key: "engineeringPacketReview",     name: "Engineering Packet Review",              sortOrder: 18, section: "procurement",      defaultOwnerRole: "solutionsEngineerId" },
  { key: "onsiteWalkthrough",           name: "Onsite Walkthrough",                     sortOrder: 19, section: "procurement",      defaultOwnerRole: "fieldProjectManagerId" },
  { key: "submitPmReview",              name: "Submit PM Review",                       sortOrder: 20, section: "procurement",      defaultOwnerRole: "insidePMId" },
  // ── Implementation ─────────────────────────────────────────────────────────
  { key: "installation",                name: "Installation",                           sortOrder: 21, section: "implementation",   defaultOwnerRole: "fieldProjectManagerId" },
  { key: "programming",                 name: "Programming",                            sortOrder: 22, section: "implementation",   defaultOwnerRole: "fieldProjectManagerId" },
  { key: "commissioning",               name: "Commissioning",                          sortOrder: 23, section: "implementation",   defaultOwnerRole: "fieldProjectManagerId" },
  // ── Implementation (SC variants) ──────────────────────────────────────────
  { key: "roughIn",                     name: "Rough-In",                               sortOrder: 21, section: "implementation",   defaultOwnerRole: "fieldProjectManagerId" },
  { key: "termination",                 name: "Termination",                            sortOrder: 22, section: "implementation",   defaultOwnerRole: "fieldProjectManagerId" },
  { key: "certification",               name: "Certification",                          sortOrder: 23, section: "implementation",   defaultOwnerRole: "fieldProjectManagerId" },
  // ── Closeout ───────────────────────────────────────────────────────────────
  { key: "customerTraining",            name: "Customer Training",                      sortOrder: 24, section: "closeout",         defaultOwnerRole: "fieldProjectManagerId" },
  { key: "finalDayDocumentation",       name: "Final Day Documentation",                sortOrder: 25, section: "closeout",         defaultOwnerRole: "fieldProjectManagerId" },
  { key: "closeoutPacket",              name: "Compile Closeout Packet & Submit",       sortOrder: 26, section: "closeout",         defaultOwnerRole: "seniorInsideId" },
  { key: "processRmas",                 name: "Process RMAs & Return to Stock",         sortOrder: 27, section: "closeout",         defaultOwnerRole: "insidePMId" },
  { key: "closeout",                    name: "Closeout",                               sortOrder: 28, section: "closeout",         defaultOwnerRole: "seniorInsideId" },
  // ── Service & Warranty ─────────────────────────────────────────────────────
  { key: "serviceWarranty",             name: "Service & Warranty",                     sortOrder: 29, section: "serviceWarranty",  defaultOwnerRole: "fieldProjectManagerId" },
];

// Each phase's fixed weight budget — independent of how many steps currently exist in it.
// Adding/removing a step within a phase only ever redistributes this same total, so a
// project's overall progress % never drifts just because someone added a checklist item.
// Sums to 100.
export const PHASE_WEIGHT: Record<ProjectSectionKey, number> = {
  setup: 15,
  engineering: 15,
  procurement: 20,
  implementation: 40,
  closeout: 5,
  serviceWarranty: 5,
};

export function stepsForSection(steps: WorkflowStep[], section: ProjectSectionKey): WorkflowStep[] {
  return steps.filter((step) => step.section === section);
}

// Splits a section's fixed PHASE_WEIGHT evenly across its non-overridden steps, leaving
// weightOverridden ones untouched — so editing one step's weight (or adding/removing a step)
// keeps the section's total constant instead of letting it drift. Steps outside `section`
// pass through unchanged.
export function redistributeWeights(steps: WorkflowStep[], section: ProjectSectionKey): WorkflowStep[] {
  const budget = PHASE_WEIGHT[section];
  const sectionSteps = steps.filter((s) => s.section === section);
  if (sectionSteps.length === 0) return steps;

  const pinnedTotal = sectionSteps.filter((s) => s.weightOverridden).reduce((sum, s) => sum + s.weight, 0);
  const autoCount = sectionSteps.filter((s) => !s.weightOverridden).length;
  const evenShare = autoCount > 0 ? Math.max(budget - pinnedTotal, 0) / autoCount : 0;

  return steps.map((s) => (s.section === section && !s.weightOverridden ? { ...s, weight: evenShare } : s));
}

// These steps are just milestones reached elsewhere (a deal closing, a project record
// being created) — there's no dedicated task page or modal for them to open.
const NO_ACTION_STEPS = new Set<string>(["opportunityWon", "projectCreated"]);

export function stepHasAction(key: string): boolean {
  return !NO_ACTION_STEPS.has(key);
}

export const SECTION_LABEL: Record<ProjectSectionKey, string> = {
  setup: "Setup",
  engineering: "Engineering",
  procurement: "Procurement & Preparation",
  implementation: "Implementation",
  closeout: "Closeout",
  serviceWarranty: "Service & Warranty",
};

export function stepPhaseLabel(section: ProjectSectionKey): string {
  return SECTION_LABEL[section];
}

// Steps with a real dedicated task page override the default "go to this step's section
// page" destination. Add an entry here as future modules (Welcome Letter, Kickoff
// automation, etc.) get their own pages.
const STEP_ACTION_OVERRIDES: Partial<Record<string, string>> = {
  bomReview: "/engineering/bom-review", // page lives at engineering route until routing is updated
  assignTeam: "", // Project Overview (where the team is assigned) lives on the Dashboard itself
  sendWelcomeLetter: "/setup/welcome-letter",
  scheduleInternalKickoff: "/setup/internal-kickoff",
  scheduleTechnicalKickoff: "/setup/technical-kickoff",
  equipmentTracking: "/procurement/equipment-tracking",
};

export function stepActionHref(projectId: string, step: WorkflowStep): string {
  const suffix = STEP_ACTION_OVERRIDES[step.key] ?? `/${step.section}`;
  return `/projects/${projectId}${suffix}`;
}

export const PROJECT_SECTIONS: { key: "dashboard" | "meetingNotes" | "gantt" | ProjectSectionKey; label: string; href: string }[] = [
  { key: "dashboard", label: "Dashboard", href: "" },
  { key: "setup", label: "Setup", href: "/setup" },
  { key: "engineering", label: "Engineering", href: "/engineering" },
  { key: "procurement", label: "Procurement & Preparation", href: "/procurement" },
  { key: "implementation", label: "Implementation", href: "/implementation" },
  { key: "closeout", label: "Closeout", href: "/closeout" },
  { key: "serviceWarranty", label: "Service & Warranty", href: "/service-warranty" },
  { key: "meetingNotes", label: "Meeting Notes", href: "/meeting-notes" },
  { key: "gantt", label: "Gantt", href: "/gantt" },
];

export const WORKFLOW_STATUS_TONE: Record<WorkflowStepStatus, StatusTone> = {
  "Not Started": "neutral",
  "In Progress": "info",
  Complete: "success",
  "Not Needed": "warning",
};

// Steps whose status is normally computed by a MODULE_PROGRESS_PROVIDERS entry rather than
// set directly by a user — see engine/module-progress.ts. Editing their status manually
// requires an explicit override (statusOverridden) or it'd just get recalculated away on
// the next reconciled read.
const MODULE_MANAGED_STEPS = new Set<string>([
  "bomReview",
  "assignTeam",
  "sendWelcomeLetter",
  "scheduleInternalKickoff",
  "scheduleTechnicalKickoff",
  "equipmentTracking",
]);

export function isModuleManagedStep(key: string): boolean {
  return MODULE_MANAGED_STEPS.has(key);
}

// ─── Data-driven project type config ─────────────────────────────────────────

// Stored in AppSetting and editable via admin UI.
// exclusions[stepKey] = array of project types that EXCLUDE this step.
// A step is excluded from a project if ALL of the project's types are in exclusions[stepKey].
export interface ProjectTypeWorkflowConfig {
  exclusions: Record<string, string[]>;
  sectionLabelOverrides?: Record<string, Record<string, string>>;
}

// AV-only steps: excluded from all non-AV types.
const NON_AV = ["Box Sale", "Structured Cabling", "Security"] as const;
// AV + Security steps: excluded from Box Sale and Structured Cabling.
const BOX_SALE_AND_SC = ["Box Sale", "Structured Cabling"] as const;
// SC-only steps: excluded from all non-SC types.
const NON_SC = ["Box Sale", "Audio / Visual", "Security"] as const;

export const DEFAULT_PROJECT_TYPE_CONFIG: ProjectTypeWorkflowConfig = {
  exclusions: {
    // ── Box Sale excluded only (all three full-service types get these) ────────
    scheduleInternalKickoff:      ["Box Sale"],
    scheduleTechnicalKickoff:     ["Box Sale"],
    cadReview:                    ["Box Sale"],
    drawingReview:                ["Box Sale"],
    pullSchedule:                 ["Box Sale"],
    engineeringPacket:            ["Box Sale"],
    scheduleResources:            ["Box Sale"],
    onsiteWalkthrough:            ["Box Sale"],
    engineeringPacketReview:      ["Box Sale"],
    submitPmReview:               ["Box Sale"],
    finalDayDocumentation:        ["Box Sale"],
    processRmas:                  ["Box Sale"],

    // ── AV + Security only (SC uses roughIn / termination / certification) ─────
    installation:                 [...BOX_SALE_AND_SC],
    programming:                  [...BOX_SALE_AND_SC],
    commissioning:                [...BOX_SALE_AND_SC],
    ipScopeSwitchports:           [...BOX_SALE_AND_SC],
    customerTraining:             [...BOX_SALE_AND_SC],

    // ── AV only ───────────────────────────────────────────────────────────────
    functionalNarrative:          [...NON_AV],
    programmingMockups:           [...NON_AV],

    // ── SC only ───────────────────────────────────────────────────────────────
    roughIn:                      [...NON_SC],
    termination:                  [...NON_SC],
    certification:                [...NON_SC],
  },
};

// Returns the display label for a section, applying per-type overrides when all
// of a project's types agree on the same override (mixed-type projects use the default).
export function getSectionLabelForTypes(
  section: ProjectSectionKey,
  projectTypes: string[],
  config?: ProjectTypeWorkflowConfig
): string {
  const overrides = config?.sectionLabelOverrides?.[section];
  if (!overrides || projectTypes.length === 0) return SECTION_LABEL[section];
  const labels = projectTypes.map((t) => overrides[t] ?? SECTION_LABEL[section]);
  const unique = new Set(labels);
  return unique.size === 1 ? [...unique][0] : SECTION_LABEL[section];
}

// Config-aware version of shouldIncludeStepForTypes.
// config is optional for backward compat; falls back to the legacy BOX_SALE_EXCLUDED_STEPS check.
export function shouldIncludeStepForTypesWithConfig(
  stepKey: string,
  projectTypes: string[],
  config: ProjectTypeWorkflowConfig
): boolean {
  if (projectTypes.length === 0) return true;
  const excludedBy = config.exclusions[stepKey] ?? [];
  if (excludedBy.length === 0) return true;
  // Excluded only when ALL project types are in the exclusion list
  return !projectTypes.every((t) => excludedBy.includes(t));
}
