import type { AppUser, NewUserInput } from "@/types/user";
import { SAMPLE_USERS } from "@/lib/mock/users.mock";
import { readGlobal, writeGlobal } from "@/lib/storage/local-store";

const USERS_KEY = "users";

// Backfills fields added after a user may have already been saved to localStorage under the
// old shape — without this, older stored users would have `undefined` role/isActive and break
// the @-mention eligibility filter (lib/mentions/mentionable-users.ts).
function withUserDefaults(user: AppUser): AppUser {
  return {
    ...user,
    role: user.role ?? "Member",
    isActive: user.isActive ?? true,
  };
}

function loadAll(): AppUser[] {
  const stored = readGlobal<AppUser[]>(USERS_KEY);
  if (stored) return stored.map(withUserDefaults);
  writeGlobal(USERS_KEY, SAMPLE_USERS);
  return SAMPLE_USERS;
}

export async function getUsers(): Promise<AppUser[]> {
  return loadAll();
}

export async function getUser(id: string): Promise<AppUser | null> {
  return loadAll().find((u) => u.id === id) ?? null;
}

export async function createUser(input: NewUserInput): Promise<AppUser> {
  const all = loadAll();
  const now = new Date().toISOString();
  const user: AppUser = {
    id: crypto.randomUUID(),
    name: input.name,
    title: input.title,
    email: input.email,
    avatarUrl: input.avatarUrl,
    role: input.role,
    isActive: input.isActive,
    createdAt: now,
    updatedAt: now,
  };
  writeGlobal(USERS_KEY, [...all, user]);
  return user;
}

export async function updateUser(id: string, patch: Partial<AppUser>): Promise<AppUser> {
  const all = loadAll();
  const index = all.findIndex((u) => u.id === id);
  if (index === -1) throw new Error(`User not found: ${id}`);
  const updated: AppUser = { ...all[index], ...patch, id, updatedAt: new Date().toISOString() };
  const next = [...all];
  next[index] = updated;
  writeGlobal(USERS_KEY, next);
  return updated;
}

export async function deleteUser(id: string): Promise<void> {
  const all = loadAll();
  writeGlobal(USERS_KEY, all.filter((u) => u.id !== id));
}
