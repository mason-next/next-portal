"use server";

import { UserRole as PrismaRole, type User as PrismaUser } from "@prisma/client";
import { db } from "@/lib/db";
import type { AppUser, NewUserInput, UserRole } from "@/types/user";

// ─── Enum converters ──────────────────────────────────────────────────────────

// Prisma TypeScript enum values use no spaces ("ProjectManager"); the @map values
// ("Project Manager") only affect what Postgres stores, not what the client sees.
const ROLE_FROM_DB: Record<PrismaRole, UserRole> = {
  [PrismaRole.Administrator]: "Administrator",
  [PrismaRole.ProjectManager]: "Project Manager",
  [PrismaRole.EngineeringManager]: "Engineering Manager",
  [PrismaRole.ProcurementManager]: "Procurement Manager",
  [PrismaRole.Member]: "Member",
};

const ROLE_TO_DB: Record<UserRole, PrismaRole> = {
  Administrator: PrismaRole.Administrator,
  "Project Manager": PrismaRole.ProjectManager,
  "Engineering Manager": PrismaRole.EngineeringManager,
  "Procurement Manager": PrismaRole.ProcurementManager,
  Member: PrismaRole.Member,
};

// ─── Type mapper ──────────────────────────────────────────────────────────────

function toAppUser(p: PrismaUser): AppUser {
  return {
    id: p.id,
    name: p.name,
    title: p.title,
    email: p.email,
    phone: p.phone,
    avatarUrl: p.avatarUrl,
    role: ROLE_FROM_DB[p.role] ?? "Member",
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getUsers(): Promise<AppUser[]> {
  const rows = await db.user.findMany({ orderBy: { name: "asc" } });
  return rows.map(toAppUser);
}

export async function getUser(id: string): Promise<AppUser | null> {
  const row = await db.user.findUnique({ where: { id } });
  return row ? toAppUser(row) : null;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createUser(input: NewUserInput): Promise<AppUser> {
  const row = await db.user.create({
    data: {
      id: crypto.randomUUID(),
      name: input.name,
      title: input.title,
      email: input.email,
      phone: input.phone,
      avatarUrl: input.avatarUrl,
      role: ROLE_TO_DB[input.role],
      isActive: input.isActive,
    },
  });
  return toAppUser(row);
}

export async function updateUser(id: string, patch: Partial<AppUser>): Promise<AppUser> {
  const data: Parameters<typeof db.user.update>[0]["data"] = {};
  if ("name" in patch)      data.name = patch.name;
  if ("title" in patch)     data.title = patch.title;
  if ("email" in patch)     data.email = patch.email;
  if ("phone" in patch)     data.phone = patch.phone ?? "";
  if ("avatarUrl" in patch) data.avatarUrl = patch.avatarUrl ?? null;
  if ("role" in patch && patch.role) data.role = ROLE_TO_DB[patch.role];
  if ("isActive" in patch)  data.isActive = patch.isActive;

  const row = await db.user.update({ where: { id }, data });
  return toAppUser(row);
}

export async function deleteUser(id: string): Promise<void> {
  await db.user.delete({ where: { id } });
}
