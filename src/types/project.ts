// Status is no longer stored — it's derived from workflow step progress, see
// modules/project-command-center/engine/workflow-engine.ts.
export const PROJECT_HEALTH = ["Ahead", "On Track", "At Risk", "Off Track"] as const;

export type ProjectHealth = (typeof PROJECT_HEALTH)[number];

export interface Project {
  id: string;
  name: string;
  projectNumber: string;
  customerName: string;
  siteAddress: string;
  coordinatorGroup: string;
  contractValue: number;
  grossProfit: number;
  solutionsExecutiveId: string | null;
  solutionsEngineerId: string | null;
  leadTechnicianId: string | null;
  fieldProjectManagerId: string | null;
  seniorInsideId: string | null;
  projectManagerId: string | null;
  insidePMId: string | null;
  targetCompletionDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewProjectInput {
  name: string;
  projectNumber: string;
  customerName: string;
  siteAddress: string;
  coordinatorGroup: string;
}
