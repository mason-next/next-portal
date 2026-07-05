import type { AccountType, RoleType } from "@/types/user";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  accountType: AccountType;
  roleType: RoleType;
  /** True when the user must change their password before accessing the app. */
  mustChangePassword?: boolean;
}
