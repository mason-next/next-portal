import type { StatusTone } from "@/components/shared/StatusBadge";
import type { ProjectSectionKey, WorkflowStep, WorkflowStepKey, WorkflowStepStatus } from "@/types/workflow";

export type { ProjectSectionKey };
export { PROJECT_SECTION_KEYS } from "@/types/workflow";

export interface WorkflowStepTemplateEntry {
  key: WorkflowStepKey;
  name: string;
  sortOrder: number;
  section: ProjectSectionKey;
}

// Canonical source of truth for name/sortOrder/section, used to seed a project's real
// WorkflowStep[] records (lib/mock/workflow.mock.ts). Not consulted at render time — once
// seeded, a step's own fields are authoritative, so a future per-project override is a data
// edit, not a code change. Per-step weight isn't part of the template anymore — it's
// computed at seed time (and on every add/remove/edit) by redistributeWeights below, split
// evenly across each section's PHASE_WEIGHT budget unless a step's weight is overridden.
export const WORKFLOW_STEP_TEMPLATE: WorkflowStepTemplateEntry[] = [
  { key: "opportunityWon", name: "Opportunity Won", sortOrder: 1, section: "setup" },
  { key: "projectCreated", name: "Project Created", sortOrder: 2, section: "setup" },
  { key: "assignTeam", name: "Assign Team", sortOrder: 3, section: "setup" },
  { key: "sendWelcomeLetter", name: "Send Welcome Letter", sortOrder: 4, section: "setup" },
  { key: "scheduleInternalKickoff", name: "Schedule Internal Kickoff", sortOrder: 5, section: "setup" },
  { key: "scheduleTechnicalKickoff", name: "Schedule Technical Kickoff", sortOrder: 6, section: "setup" },
  { key: "cadReview", name: "CAD Review", sortOrder: 7, section: "engineering" },
  { key: "bomReview", name: "BOM Review", sortOrder: 8, section: "engineering" },
  { key: "procurement", name: "Procurement", sortOrder: 9, section: "procurement" },
  { key: "installation", name: "Installation", sortOrder: 10, section: "implementation" },
  { key: "programming", name: "Programming", sortOrder: 11, section: "implementation" },
  { key: "commissioning", name: "Commissioning", sortOrder: 12, section: "implementation" },
  { key: "closeout", name: "Closeout", sortOrder: 13, section: "closeout" },
];

// Each phase's fixed weight budget — independent of how many steps currently exist in it.
// Adding/removing a step within a phase only ever redistributes this same total, so a
// project's overall progress % never drifts just because someone added a checklist item.
// Sums to 100.
export const PHASE_WEIGHT: Record<ProjectSectionKey, number> = {
  setup: 15,
  engineering: 15,
  procurement: 20,
  implementation: 45,
  closeout: 5,
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
  procurement: "Procurement",
  implementation: "Implementation",
  closeout: "Closeout",
};

export function stepPhaseLabel(section: ProjectSectionKey): string {
  return SECTION_LABEL[section];
}

// Steps with a real dedicated task page override the default "go to this step's section
// page" destination. Add an entry here as future modules (Welcome Letter, Kickoff
// automation, etc.) get their own pages.
const STEP_ACTION_OVERRIDES: Partial<Record<string, string>> = {
  bomReview: "/engineering/bom-review",
  assignTeam: "", // Project Overview (where the team is assigned) lives on the Dashboard itself
  sendWelcomeLetter: "/setup/welcome-letter",
};

export function stepActionHref(projectId: string, step: WorkflowStep): string {
  const suffix = STEP_ACTION_OVERRIDES[step.key] ?? `/${step.section}`;
  return `/projects/${projectId}${suffix}`;
}

export const PROJECT_SECTIONS: { key: "dashboard" | ProjectSectionKey; label: string; href: string }[] = [
  { key: "dashboard", label: "Dashboard", href: "" },
  { key: "setup", label: "Setup", href: "/setup" },
  { key: "engineering", label: "Engineering", href: "/engineering" },
  { key: "procurement", label: "Procurement", href: "/procurement" },
  { key: "implementation", label: "Implementation", href: "/implementation" },
  { key: "closeout", label: "Closeout", href: "/closeout" },
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
const MODULE_MANAGED_STEPS = new Set<string>(["bomReview", "assignTeam", "sendWelcomeLetter"]);

export function isModuleManagedStep(key: string): boolean {
  return MODULE_MANAGED_STEPS.has(key);
}
