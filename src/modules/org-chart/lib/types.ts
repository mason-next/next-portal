// ─── Org Chart Module — Type Definitions ─────────────────────────────────────
// All types are isolated to this module. No existing types are modified.

export type OrgPositionStatus = "filled" | "open" | "planned" | "inactive";
export type OrgChartVersionType = "current" | "future" | "one_year" | "three_year" | "scenario";
export type OrgAssignmentType = "primary" | "secondary";

export interface OrgDepartment {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrgLocation {
  id: string;
  name: string;
  address: string | null;
  city: string | null;
  state: string | null;
  region: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrgChartVersion {
  id: string;
  name: string;
  description: string | null;
  versionType: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrgAssignedUser {
  id: string;
  name: string;
  email: string;
  avatarUrl: string | null;
}

export interface OrgPositionAssignment {
  id: string;
  positionId: string;
  userId: string | null;
  assignmentType: string;
  startDate: string | null;
  endDate: string | null;
  isActive: boolean;
  user: OrgAssignedUser | null;
}

export interface OrgPosition {
  id: string;
  orgChartVersionId: string;
  title: string;
  departmentId: string | null;
  locationId: string | null;
  reportsToPositionId: string | null;
  status: string;
  targetHireDate: string | null;
  notes: string | null;
  salaryMin: number | null;
  salaryMid: number | null;
  salaryMax: number | null;
  payFrequency: string;
  budgetStatus: string;
  createdAt: string;
  updatedAt: string;
  department: OrgDepartment | null;
  location: OrgLocation | null;
  assignments: OrgPositionAssignment[];
  certifications: OrgPositionCertification[];
  careerPaths: OrgCareerPath[];
  successors: OrgSuccessor[];
  relationships: OrgPositionRelationship[];
}

export interface OrgChartStats {
  totalPositions: number;
  filledPositions: number;
  openPositions: number;
  plannedPositions: number;
  totalDepartments: number;
  totalLocations: number;
}

// ─── Phase 4: Certifications + Career Paths ───────────────────────────────────

export interface OrgCertification {
  id: string;
  name: string;
  description: string | null;
  issuingBody: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrgPositionCertification {
  id: string;
  positionId: string;
  certificationId: string;
  requirementLevel: "required" | "preferred";
  certification: OrgCertification;
}

export interface OrgUserCertification {
  id: string;
  userId: string;
  certificationId: string;
  issuedDate: string | null;
  expiryDate: string | null;
  credentialId: string | null;
  createdAt: string;
  updatedAt: string;
  certification: OrgCertification;
  user: { id: string; name: string; email: string } | null;
}

export interface OrgCareerPath {
  id: string;
  fromPositionId: string;
  toPositionId: string;
  toPositionTitle: string;
  typicalTimelineMonths: number | null;
  notes: string | null;
  createdAt: string;
}

export interface OrgSuccessor {
  id: string;
  positionId: string;
  userId: string;
  rank: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; name: string; email: string; avatarUrl: string | null } | null;
}

export interface OrgPositionRelationship {
  id: string;
  fromPositionId: string;
  toPositionId: string;
  toPositionTitle: string;
  relationshipType: string;
  notes: string | null;
  createdAt: string;
}

// Form input types for create/update operations

export type CertRequirement = { certificationId: string; requirementLevel: "required" | "preferred" };
export type RelationshipEntry = { toPositionId: string; relationshipType: string; notes: string | null };

export interface CreatePositionInput {
  orgChartVersionId: string;
  title: string;
  departmentId?: string | null;
  locationId?: string | null;
  reportsToPositionId?: string | null;
  status: string;
  targetHireDate?: string | null;
  notes?: string | null;
  assignedUserId?: string | null;
  salaryMin?: number | null;
  salaryMid?: number | null;
  salaryMax?: number | null;
  payFrequency?: string;
  budgetStatus?: string;
  certifications?: CertRequirement[];
  careerPathsTo?: string[];
  successors?: SuccessorEntry[];
  relationships?: RelationshipEntry[];
}

export interface UpdatePositionInput {
  title?: string;
  departmentId?: string | null;
  locationId?: string | null;
  reportsToPositionId?: string | null;
  status?: string;
  targetHireDate?: string | null;
  notes?: string | null;
  assignedUserId?: string | null;
  salaryMin?: number | null;
  salaryMid?: number | null;
  salaryMax?: number | null;
  payFrequency?: string;
  budgetStatus?: string;
  certifications?: CertRequirement[];
  careerPathsTo?: string[];
  successors?: SuccessorEntry[];
  relationships?: RelationshipEntry[];
}

export interface CreateCertificationInput {
  name: string;
  description?: string | null;
  issuingBody?: string | null;
}

export interface AddUserCertificationInput {
  userId: string;
  certificationId: string;
  issuedDate?: string | null;
  expiryDate?: string | null;
  credentialId?: string | null;
}

export type SuccessorEntry = { userId: string; notes: string | null };

export interface CreateDepartmentInput {
  name: string;
  description?: string | null;
  status?: string;
}

export interface CreateLocationInput {
  name: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  region?: string | null;
  status?: string;
}

export interface CreateVersionInput {
  name: string;
  versionType: OrgChartVersionType;
  description?: string | null;
}
