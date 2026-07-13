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
import { toSessionRoleTypes } from "@/lib/auth/role-mapper";
import type { AppUser, NewUserInput, UserCertification } from "@/types/user";

// ─── DB helpers ───────────────────────────────────────────────────────────────

// Map legacy DB roleType values to current canonical names (for backward compat reads).
const ROLE_TYPE_BY_STRING: Record<string, string> = {
  Sales: "Sales",
  Engineering: "Engineering",
  ProjectManagement: "ProjectManagement",
  Management: "Management",
  Installation: "Installation",
  Finance: "Finance",
  Customer: "Customer",
  Subcontractor: "Subcontractor",
  // Legacy → current
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
  lastActiveAt?: Date | null;
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
    roleTypes?: string[];
    location?: string;
    emergencyContact?: string;
    mustChangePassword?: boolean;
  };

  // Prefer the new roleTypes column; fall back to deriving from accountType + roleType.
  const roleTypes =
    pAny.roleTypes && pAny.roleTypes.length > 0
      ? pAny.roleTypes
      : toSessionRoleTypes(p.accountType as string, ROLE_TYPE_BY_STRING[p.roleType as string] ?? "Management");

  return {
    id: p.id,
    name: p.name,
    title: p.title,
    email: p.email,
    phone: p.phone,
    avatarUrl: p.avatarUrl,
    roleTypes,
    isActive: p.isActive,
    mustChangePassword: pAny.mustChangePassword ?? false,
    location: pAny.location ?? "",
    emergencyContact: pAny.emergencyContact ?? "",
    certifications: (p.certifications ?? []).map(toCert),
    lastActiveAt: p.lastActiveAt?.toISOString() ?? null,
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
  // Derive legacy DB columns from roleTypes for backward compat with old code paths.
  const isAdminRole = input.roleTypes.includes("Administrator");
  const dbAccountType = isAdminRole ? PrismaAccountType.Administrator : PrismaAccountType.Member;
  const nonAdminRole = input.roleTypes.find((r) => r !== "Administrator") ?? "Management";
  const dbRoleType = (ROLE_TYPE_BY_STRING[nonAdminRole] ?? "Management") as unknown as PrismaRoleType;

  const row = await (db.user.create as (args: unknown) => Promise<PrismaUserWithCerts>)({
    data: {
      id: crypto.randomUUID(),
      name: input.name,
      title: input.title,
      email: input.email,
      phone: input.phone,
      avatarUrl: input.avatarUrl,
      accountType: dbAccountType,
      roleType: dbRoleType,
      roleTypes: input.roleTypes,
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
  if ("isActive" in patch)         data.isActive = patch.isActive;
  if ("mustChangePassword" in patch) data.mustChangePassword = patch.mustChangePassword;
  if ("location" in patch)         data.location = patch.location ?? "";
  if ("emergencyContact" in patch) data.emergencyContact = patch.emergencyContact ?? "";

  if ("roleTypes" in patch && patch.roleTypes) {
    data.roleTypes = patch.roleTypes;
    // Keep legacy DB columns in sync.
    const isAdminRole = patch.roleTypes.includes("Administrator");
    data.accountType = isAdminRole ? PrismaAccountType.Administrator : PrismaAccountType.Member;
    const nonAdminRole = patch.roleTypes.find((r) => r !== "Administrator") ?? "Management";
    data.roleType = (ROLE_TYPE_BY_STRING[nonAdminRole] ?? "Management") as unknown as PrismaRoleType;
  }

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
  const isAdminOverride = session?.roleTypes.includes("Administrator") && session.id !== userId;

  if (!isAdminOverride) {
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
