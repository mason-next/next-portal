// AccountType kept for DB/migration reference — not used in AppUser or SessionUser.
export const ACCOUNT_TYPES = ["Administrator", "Member", "Viewer"] as const;
export type AccountType = (typeof ACCOUNT_TYPES)[number];

export const ROLE_TYPES = [
  "Administrator",
  "Sales",
  "Engineering",
  "ProjectManagement",
  "Management",
  "Installation",
  "Finance",
  "Customer",
  "Subcontractor",
] as const;
export type RoleType = (typeof ROLE_TYPES)[number];

export const ROLE_TYPE_LABELS: Record<RoleType, string> = {
  Administrator: "Administrator",
  Sales: "Sales",
  Engineering: "Engineering",
  ProjectManagement: "Project Management",
  Management: "Management",
  Installation: "Installation",
  Finance: "Finance",
  Customer: "Customer",
  Subcontractor: "Subcontractor",
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
  roleTypes: string[];
  isActive: boolean;
  mustChangePassword: boolean;
  location: string;
  emergencyContact: string;
  certifications: UserCertification[];
  lastActiveAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export type PresenceStatus = "online" | "away" | "offline";

/** Derives presence status from lastActiveAt. */
export function getPresenceStatus(lastActiveAt: string | null): PresenceStatus {
  if (!lastActiveAt) return "offline";
  const diffMs = Date.now() - new Date(lastActiveAt).getTime();
  if (diffMs < 2 * 60 * 1000) return "online";
  if (diffMs < 15 * 60 * 1000) return "away";
  return "offline";
}

export interface NewUserInput {
  name: string;
  title: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  roleTypes: string[];
  isActive: boolean;
  mustChangePassword?: boolean;
  location?: string;
  emergencyContact?: string;
}
