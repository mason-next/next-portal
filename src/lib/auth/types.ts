import type { AccountType, RoleType } from "@/types/user";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  accountType: AccountType;
  roleType: RoleType;
}
