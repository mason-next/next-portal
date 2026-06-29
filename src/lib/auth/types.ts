import type { AccountType } from "@/types/user";

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  accountType: AccountType;
}
