import type { AppUser, NewUserInput } from "@/types/user";
import { SAMPLE_USERS } from "@/lib/mock/users.mock";
import { readGlobal, writeGlobal } from "@/lib/storage/local-store";

const USERS_KEY = "users";
// Tombstone of seed ids ever merged in by the backfill below — once a seed id has been applied,
// it's never re-applied, so deliberately deleting a seeded user (e.g. a duplicate) sticks instead
// of the backfill resurrecting it on the next load.
const SEEDED_IDS_KEY = "seeded-user-ids";

// Backfills fields added after a user may have already been saved to localStorage under the
// old shape — without this, older stored users would have `undefined` role/isActive and break
// the @-mention eligibility filter (lib/mentions/mentionable-users.ts).
function withUserDefaults(user: AppUser): AppUser {
  return {
    ...user,
    role: user.role ?? "Member",
    isActive: user.isActive ?? true,
    phone: user.phone ?? "",
  };
}

function loadAll(): AppUser[] {
  const stored = readGlobal<AppUser[]>(USERS_KEY);
  if (stored) {
    const withDefaults = stored.map(withUserDefaults);
    // Backfill any seeded users added after this browser already had a stored list (e.g. a new
    // standing contact added to SAMPLE_USERS) — but only the ones never applied before, so a
    // deliberate deletion of a seeded user isn't undone by this backfill on the next load.
    const appliedSeedIds = new Set(readGlobal<string[]>(SEEDED_IDS_KEY) ?? []);
    const existingIds = new Set(withDefaults.map((u) => u.id));
    const missingSeeded = SAMPLE_USERS.filter((u) => !existingIds.has(u.id) && !appliedSeedIds.has(u.id));
    if (missingSeeded.length === 0) return withDefaults;
    const merged = [...withDefaults, ...missingSeeded];
    writeGlobal(USERS_KEY, merged);
    writeGlobal(SEEDED_IDS_KEY, [...appliedSeedIds, ...missingSeeded.map((u) => u.id)]);
    return merged;
  }
  writeGlobal(USERS_KEY, SAMPLE_USERS);
  writeGlobal(SEEDED_IDS_KEY, SAMPLE_USERS.map((u) => u.id));
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
    phone: input.phone,
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
