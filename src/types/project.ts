export const PROJECT_STATES = [
  "BOM Review",
  "In Procurement",
  "Released",
  "Closed",
] as const;

export type ProjectState = (typeof PROJECT_STATES)[number];

export interface Project {
  id: string;
  name: string;
  projectNumber: string;
  customerName: string;
  siteAddress: string;
  coordinatorGroup: string;
  state: ProjectState;
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
