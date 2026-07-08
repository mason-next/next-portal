import {
  calculateActualProgress,
  calculatePhaseProgress,
  deriveProjectStatus,
  getProjectHealthSummary,
  isDoneStatus,
} from "@/modules/project-command-center/engine/workflow-engine";
import { SECTION_LABEL } from "@/modules/project-command-center/lib/workflow-steps";
import { ROLE_NOT_NEEDED } from "@/lib/role-assignment";
import { PROJECT_SECTION_KEYS } from "@/types/workflow";
import type { Project, ProjectHealth } from "@/types/project";
import type { ProjectSectionKey, WorkflowStep } from "@/types/workflow";
import type { AppUser } from "@/types/user";
import type { ProjectActivity } from "@/types/activity";

export interface ProjectBriefPhase {
  key: ProjectSectionKey;
  label: string;
  percent: number;
}

export interface ProjectBriefContact {
  role: string;
  name: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
}

export interface StatusUpdateEntry {
  date: string;    // formatted display date
  author: string;
  text: string;    // plain-text summary of the status comment
}

export interface ProjectBriefData {
  projectName: string;
  projectNumber: string;
  customerName: string;
  generatedAt: string;
  overallProgress: number;
  currentPhaseLabel: string;
  isComplete: boolean;
  health: ProjectHealth;
  targetCompletionDate: string | null;
  phases: ProjectBriefPhase[];
  recentMilestones: string[];
  contacts: ProjectBriefContact[];
  // Project Activity comments tagged "Status" — customer-facing status updates.
  statusUpdates: StatusUpdateEntry[];
}

function resolveUser(users: AppUser[], id: string | null): AppUser | null {
  if (!id || id === ROLE_NOT_NEEDED) return null;
  return users.find((u) => u.id === id) ?? null;
}

function formatStatusDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

// Snapshot of where a project currently stands, built from the same workflow-engine
// calculations that drive the internal Dashboard (Project Health / Phase Progress panels) —
// the customer-facing brief and the internal dashboard always read the same numbers.
export function buildProjectBriefData(params: {
  project: Project;
  steps: WorkflowStep[];
  users: AppUser[];
  now: Date;
  statusComments?: ProjectActivity[];
}): ProjectBriefData {
  const { project, steps, users, now, statusComments = [] } = params;
  const status = deriveProjectStatus(steps);
  const { health } = getProjectHealthSummary({
    steps,
    startDate: project.createdAt,
    targetCompletionDate: project.targetCompletionDate,
    now,
  });

  const phases = PROJECT_SECTION_KEYS.map((key) => ({
    key,
    label: SECTION_LABEL[key],
    percent: calculatePhaseProgress(steps, key),
  }));

  const recentMilestones = [...steps]
    .filter((s) => isDoneStatus(s.status))
    .sort(
      (a, b) =>
        new Date(b.completedDate ?? b.updatedAt).getTime() - new Date(a.completedDate ?? a.updatedAt).getTime()
    )
    .slice(0, 3)
    .map((s) => s.name);

  const fieldProjectManager = resolveUser(users, project.fieldProjectManagerId);
  const solutionsExecutive = resolveUser(users, project.solutionsExecutiveId);
  const contacts = [
    fieldProjectManager
      ? {
          role: "Field Project Manager",
          name: fieldProjectManager.name,
          email: fieldProjectManager.email,
          phone: fieldProjectManager.phone,
          avatarUrl: fieldProjectManager.avatarUrl,
        }
      : null,
    solutionsExecutive
      ? {
          role: "Solutions Executive",
          name: solutionsExecutive.name,
          email: solutionsExecutive.email,
          phone: solutionsExecutive.phone,
          avatarUrl: solutionsExecutive.avatarUrl,
        }
      : null,
  ].filter((c): c is ProjectBriefContact => c !== null);

  const statusUpdates: StatusUpdateEntry[] = statusComments.map((c) => ({
    date: formatStatusDate(c.createdAt),
    author: c.userName,
    text: c.message,
  }));

  return {
    projectName: project.name,
    projectNumber: project.projectNumber,
    customerName: project.customerName,
    generatedAt: now.toISOString(),
    overallProgress: calculateActualProgress(steps),
    currentPhaseLabel: status.label,
    isComplete: status.isComplete,
    health,
    targetCompletionDate: project.targetCompletionDate,
    phases,
    recentMilestones,
    contacts,
    statusUpdates,
  };
}
