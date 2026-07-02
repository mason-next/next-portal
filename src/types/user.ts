export const ACCOUNT_TYPES = ["Administrator", "Member", "Viewer"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ROLE_TYPES = [
  "Engineer",
  "Salesperson",
  "ProjectManager",
  "Technician",
  "Operations",
  "Finance",
  "Executive",
  "HR",
  "FieldTechnician",
  "Customer",
  "Vendor",
  "Subcontractor",
  "Other",
] as const;
export type RoleType = (typeof ROLE_TYPES)[number];

export const ROLE_TYPE_LABELS: Record<RoleType, string> = {
  Engineer: "Engineering",
  Salesperson: "Sales",
  ProjectManager: "Project Management",
  Technician: "Field Technician",
  Operations: "Operations",
  Finance: "Finance",
  Executive: "Executive / Management",
  HR: "HR",
  FieldTechnician: "Field Technician (External)",
  Customer: "Customer",
  Vendor: "Vendor",
  Subcontractor: "Subcontractor",
  Other: "Other",
};

export interface UserCertification {
  id: string;
  userId: string;
  name: string;
  issuingOrg: string;
  expirationDate: string | null;
  notes: string;
}

export interface AppUser {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  accountType: AccountType;
  roleType: RoleType;
  isActive: boolean;
  department: string;
  location: string;
  region: string;
  emergencyContact: string;
  adminNotes: string;
  certifications: UserCertification[];
  createdAt: string;
  updatedAt: string;
}

export interface NewUserInput {
  name: string;
  title: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  accountType: AccountType;
  roleType: RoleType;
  isActive: boolean;
  department?: string;
  location?: string;
  region?: string;
  emergencyContact?: string;
  adminNotes?: string;
}
