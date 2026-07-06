// Status is no longer stored — it's derived from workflow step progress, see
// modules/project-command-center/engine/workflow-engine.ts.
export const PROJECT_HEALTH = ["Ahead", "On Track", "At Risk", "Off Track"] as const;

export type ProjectHealth = (typeof PROJECT_HEALTH)[number];

import type { ProjectTechnicianEntry } from "@/types/subcontractor";

export interface Project {
  id: string;
  name: string;
  projectNumber: string;
  customerName: string;
  siteAddress: string;
  coordinatorGroup: string;
  contractValue: number;
  grossProfit: number;
  // Single-person role FKs. Display labels:
  //   fieldProjectManagerId → "Solution Project Manager"
  //   seniorInsideId        → "Senior Inside Project Manager"
  //   insidePMId            → "Inside Project Manager"
  solutionsExecutiveId: string | null;
  solutionsEngineerId: string | null;
  fieldProjectManagerId: string | null;
  seniorInsideId: string | null;
  insidePMId: string | null;
  // Multi-person technician assignments (internal users + subcontractors).
  // Populated by getProject(); getProjects() returns [] to keep the list query lean.
  technicians: ProjectTechnicianEntry[];
  technicianNotNeeded: boolean;
  projectTypes: string[];
  targetCompletionDate: string | null;
  connectwiseUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewProjectInput {
  name: string;
  projectNumber: string;
  customerName: string;
  siteAddress: string;
  coordinatorGroup: string;
  projectTypes: string[];
}
