export const USER_ROLES = [
  "Administrator",
  "Project Manager",
  "Engineering Manager",
  "Procurement Manager",
  "Member",
  "Salesperson",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface AppUser {
  id: string;
  name: string;
  title: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NewUserInput {
  name: string;
  title: string;
  email: string;
  phone: string;
  avatarUrl: string | null;
  role: UserRole;
  isActive: boolean;
}
