"use server";

import {
  AccountType as PrismaAccountType,
  RoleType as PrismaRoleType,
  type User as PrismaUser,
} from "@prisma/client";
import { db } from "@/lib/db";
import { getServerSession } from "@/lib/auth/server";
import { requireAdmin } from "@/lib/access-control";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import type { AccountType, AppUser, NewUserInput, RoleType, UserCertification } from "@/types/user";

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

// String-keyed maps avoid Record<PrismaRoleType, ...> exhaustiveness errors when
// the local Prisma client is behind the schema. Includes both current and legacy
// values so old DB rows are still handled gracefully after migration.
const ROLE_TYPE_BY_STRING: Record<string, RoleType> = {
  // Current values
  Sales: "Sales",
  Engineering: "Engineering",
  ProjectManagement: "ProjectManagement",
  Management: "Management",
  Installation: "Installation",
  Finance: "Finance",
  Customer: "Customer",
  Subcontractor: "Subcontractor",
  // Legacy → current mappings (post-migration fallback)
  Engineer: "Engineering",
  Salesperson: "Sales",
  ProjectManager: "ProjectManagement",
  Technician: "Installation",
  Operations: "Management",
  Executive: "Management",
  HR: "Management",
  FieldTechnician: "Installation",
  Vendor: "Subcontractor",
  Other: "Management",
};

function fromDbRoleType(r: PrismaRoleType): RoleType {
  return ROLE_TYPE_BY_STRING[r as string] ?? "Other";
}

// RoleType string values match Prisma enum member names exactly (no @map in schema),
// so a direct cast is safe and doesn't break when new values are added.
function toDbRoleType(r: RoleType): PrismaRoleType {
  return r as unknown as PrismaRoleType;
}

// ─── Type mappers ─────────────────────────────────────────────────────────────

type PrismaUserWithCerts = PrismaUser & {
  certifications?: {
    id: string;
    userId: string;
    name: string;
    issuingOrg: string;
    expirationDate: Date | null;
    notes: string;
  }[];
};

function toCert(c: { id: string; userId: string; name: string; issuingOrg: string; expirationDate: Date | null; notes: string }): UserCertification {
  return {
    id: c.id,
    userId: c.userId,
    name: c.name,
    issuingOrg: c.issuingOrg,
    expirationDate: c.expirationDate?.toISOString() ?? null,
    notes: c.notes,
  };
}

function toAppUser(p: PrismaUserWithCerts): AppUser {
  const pAny = p as unknown as {
    location?: string;
    emergencyContact?: string;
    mustChangePassword?: boolean;
  };
  return {
    id: p.id,
    name: p.name,
    title: p.title,
    email: p.email,
    phone: p.phone,
    avatarUrl: p.avatarUrl,
    accountType: ACCOUNT_TYPE_FROM_DB[p.accountType] ?? "Member",
    roleType: fromDbRoleType(p.roleType),
    isActive: p.isActive,
    mustChangePassword: pAny.mustChangePassword ?? false,
    location: pAny.location ?? "",
    emergencyContact: pAny.emergencyContact ?? "",
    certifications: (p.certifications ?? []).map(toCert),
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export async function getUsers(): Promise<AppUser[]> {
  const rows = await (db.user.findMany as (args: unknown) => Promise<PrismaUserWithCerts[]>)({
    orderBy: { name: "asc" },
    include: { certifications: true },
  });
  return rows.map(toAppUser);
}

export async function getUser(id: string): Promise<AppUser | null> {
  const row = await (db.user.findUnique as (args: unknown) => Promise<PrismaUserWithCerts | null>)({
    where: { id },
    include: { certifications: true },
  });
  return row ? toAppUser(row) : null;
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export async function createUser(input: NewUserInput): Promise<AppUser> {
  const row = await (db.user.create as (args: unknown) => Promise<PrismaUserWithCerts>)({
    data: {
      id: crypto.randomUUID(),
      name: input.name,
      title: input.title,
      email: input.email,
      phone: input.phone,
      avatarUrl: input.avatarUrl,
      accountType: ACCOUNT_TYPE_TO_DB[input.accountType],
      roleType: toDbRoleType(input.roleType),
      isActive: input.isActive,
      mustChangePassword: input.mustChangePassword ?? true,
      location: input.location ?? "",
      emergencyContact: input.emergencyContact ?? "",
    },
    include: { certifications: true },
  });
  return toAppUser(row);
}

export async function updateUser(id: string, patch: Partial<AppUser>): Promise<AppUser> {
  const data: Record<string, unknown> = {};
  if ("name" in patch)             data.name = patch.name;
  if ("title" in patch)            data.title = patch.title;
  if ("email" in patch)            data.email = patch.email;
  if ("phone" in patch)            data.phone = patch.phone ?? "";
  if ("avatarUrl" in patch)        data.avatarUrl = patch.avatarUrl ?? null;
  if ("accountType" in patch && patch.accountType) data.accountType = ACCOUNT_TYPE_TO_DB[patch.accountType];
  if ("roleType" in patch && patch.roleType)       data.roleType = toDbRoleType(patch.roleType);
  if ("isActive" in patch)           data.isActive = patch.isActive;
  if ("mustChangePassword" in patch) data.mustChangePassword = patch.mustChangePassword;
  if ("location" in patch)           data.location = patch.location ?? "";
  if ("emergencyContact" in patch) data.emergencyContact = patch.emergencyContact ?? "";

  const row = await (db.user.update as (args: unknown) => Promise<PrismaUserWithCerts>)({
    where: { id },
    data,
    include: { certifications: true },
  });
  return toAppUser(row);
}

export async function deleteUser(id: string): Promise<void> {
  await db.user.delete({ where: { id } });
}

// ─── Password ────────────────────────────────────────────────────────────────

export async function updateUserPassword(
  userId: string,
  currentPassword: string,
  newPassword: string
): Promise<void> {
  const session = await getServerSession();
  const isAdminOverride = session?.accountType === "Administrator" && session.id !== userId;

  if (!isAdminOverride) {
    // Self-edit: verify current password
    const user = await db.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user) throw new Error("User not found");
    if (user.passwordHash) {
      const valid = await verifyPassword(currentPassword, user.passwordHash);
      if (!valid) throw new Error("Current password is incorrect");
    }
  }

  const newHash = await hashPassword(newPassword);
  await db.user.update({ where: { id: userId }, data: { passwordHash: newHash } });
}

// ─── Certifications ──────────────────────────────────────────────────────────

export async function addCertification(
  userId: string,
  cert: Omit<UserCertification, "id" | "userId">
): Promise<UserCertification> {
  const row = await (db as unknown as {
    userCertification: {
      create: (args: unknown) => Promise<{ id: string; userId: string; name: string; issuingOrg: string; expirationDate: Date | null; notes: string }>;
    };
  }).userCertification.create({
    data: {
      userId,
      name: cert.name,
      issuingOrg: cert.issuingOrg,
      expirationDate: cert.expirationDate ? new Date(cert.expirationDate) : null,
      notes: cert.notes,
    },
  });
  return toCert(row);
}

export async function removeCertification(certId: string): Promise<void> {
  await (db as unknown as {
    userCertification: {
      delete: (args: unknown) => Promise<void>;
    };
  }).userCertification.delete({ where: { id: certId } });
}
