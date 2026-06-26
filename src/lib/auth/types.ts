import type { UserRole } from "@/types/user";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}
