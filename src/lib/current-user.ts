import { getUsers } from "@/lib/data/users";

// Hardcoded placeholder until Phase 2 auth lands — see plan §8 (out of scope: auth/roles).
export const CURRENT_USER = "Juan Lazo";

// Backing AppUser id for CURRENT_USER (see lib/mock/users.mock.ts) — gives the one hardcoded
// "person using this browser" a stable id to anchor notifications to, without adding real auth.
export const CURRENT_USER_ID = "user-juan-lazo";

// Defensive lookup for the rare spot that wants to tolerate the seed record being renamed —
// most call sites should just use CURRENT_USER_ID directly.
export async function getCurrentUserId(): Promise<string | null> {
  const users = await getUsers();
  return users.find((u) => u.name === CURRENT_USER)?.id ?? null;
}
