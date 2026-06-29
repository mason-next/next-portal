"use server";

import {
  AccountType as PrismaAccountType,
  RoleType as PrismaRoleType,
  type User as PrismaUser,
} from "@prisma/client";
import { db } from "@/lib/db";
import type { AccountType, AppUser, NewUserInput, RoleType } from "@/types/user";

// ─── Enum converters ──────────────────────────────────────────────────────────

// AccountType and RoleType enum values have no @map in the schema, so Prisma
// TypeScript enum values equal the DB string values exactly.

const ACCOUNT_TYPE_FROM_DB: Record<PrismaAccountType, AccountType> = {
  [PrismaAccountType.Administrator]: "Administrator",
  [PrismaAccountType.Member]: "Member",
  [PrismaAccountType.Viewer]: "Viewer",
};

const ACCOUNT_TYPE_TO_DB: Record<AccountType, PrismaAccountType> = {
  Administrator: PrismaAccountType.Administrator,
  Member: PrismaAccountType.Member,
  Viewer: PrismaAccountType.Viewer,
};

const ROLE_TYPE_FROM_DB: Record<PrismaRoleType, RoleType> = {
  [PrismaRoleType.Engineer]: "Engineer",
  [PrismaRoleType.Salesperson]: "Salesperson",
  [PrismaRoleType.ProjectManager]: "ProjectManager",
  [PrismaRoleType.Technician]: "Technician",
  [PrismaRoleType.Operations]: "Operations",
  [PrismaRoleType.Finance]: "Finance",
  [PrismaRoleType.Executive]: "Executive",
  [PrismaRoleType.Other]: "Other",
};

const ROLE_TYPE_TO_DB: Record<RoleType, PrismaRoleType> = {
  Engineer: PrismaRoleType.Engineer,
  Salesperson: PrismaRoleType.Salesperson,
  ProjectManager: PrismaRoleType.ProjectManager,
  Technician: PrismaRoleType.Technician,
  Operations: PrismaRoleType.Operations,
  Finance: PrismaRoleType.Finance,
  Executive: PrismaRoleType.Executive,
  Other: PrismaRoleType.Other,
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
    accountType: ACCOUNT_TYPE_FROM_DB[p.accountType] ?? "Member",
    roleType: ROLE_TYPE_FROM_DB[p.roleType] ?? "Other",
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
      accountType: ACCOUNT_TYPE_TO_DB[input.accountType],
      roleType: ROLE_TYPE_TO_DB[input.roleType],
      isActive: input.isActive,
    },
  });
  return toAppUser(row);
}

export async function updateUser(id: string, patch: Partial<AppUser>): Promise<AppUser> {
  const data: Parameters<typeof db.user.update>[0]["data"] = {};
  if ("name" in patch)        data.name = patch.name;
  if ("title" in patch)       data.title = patch.title;
  if ("email" in patch)       data.email = patch.email;
  if ("phone" in patch)       data.phone = patch.phone ?? "";
  if ("avatarUrl" in patch)   data.avatarUrl = patch.avatarUrl ?? null;
  if ("accountType" in patch && patch.accountType) data.accountType = ACCOUNT_TYPE_TO_DB[patch.accountType];
  if ("roleType" in patch && patch.roleType)       data.roleType = ROLE_TYPE_TO_DB[patch.roleType];
  if ("isActive" in patch)    data.isActive = patch.isActive;

  const row = await db.user.update({ where: { id }, data });
  return toAppUser(row);
}

export async function deleteUser(id: string): Promise<void> {
  await db.user.delete({ where: { id } });
}
