// Constant defaults for org chart form sections.
// This file intentionally has NO "use server" directive so it can be safely
// imported by both server components/actions and client components.

import type { OrgChartFormSections } from "./types";

export const DEFAULT_FORM_SECTIONS: OrgChartFormSections = {
  bio: true,
  certifications: true,
  careerPaths: true,
  compensation: true,
  successors: true,
  matrixRelationships: true,
  targetHireDate: true,
  notes: true,
};
