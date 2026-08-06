"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireSession } from "@/lib/auth/server";
import { getRolePermissions } from "@/lib/data/role-permissions";
import { canManageOrgChart } from "./permissions";
import type {
  OrgChartVersion,
  OrgCertification,
  OrgDivision,
  CreateDivisionInput,
  CreatePositionInput,
  UpdatePositionInput,
  CreateDepartmentInput,
  CreateLocationInput,
  CreateVersionInput,
  CreateCertificationInput,
  AddUserCertificationInput,
  SuccessorEntry,
  RelationshipEntry,
} from "./types";

// ─── Versions ─────────────────────────────────────────────────────────────────

async function requireAdmin(): Promise<void> {
  const session = await requireSession();
  const permConfig = await getRolePermissions();
  if (!canManageOrgChart(session.roleTypes, permConfig)) throw new Error("Forbidden");
}

// ─── Versions ─────────────────────────────────────────────────────────────────

export async function createOrgVersion(input: CreateVersionInput): Promise<OrgChartVersion> {
  await requireAdmin();
  const version = await db.orgChartVersion.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      versionType: input.versionType,
      isActive: true,
    },
  });
  revalidatePath("/org-chart");
  return {
    ...version,
    createdAt: version.createdAt.toISOString(),
    updatedAt: version.updatedAt.toISOString(),
  };
}

// ─── Positions ────────────────────────────────────────────────────────────────

async function applyRelationships(positionId: string, relationships: RelationshipEntry[]) {
  await db.orgPositionRelationship.deleteMany({ where: { fromPositionId: positionId } });
  if (relationships.length > 0) {
    await db.orgPositionRelationship.createMany({
      data: relationships.map((r) => ({
        fromPositionId: positionId,
        toPositionId: r.toPositionId,
        relationshipType: r.relationshipType,
        notes: r.notes ?? null,
      })),
    });
  }
}

async function applySuccessors(positionId: string, successors: SuccessorEntry[]) {
  await db.orgSuccessor.deleteMany({ where: { positionId } });
  if (successors.length > 0) {
    await db.orgSuccessor.createMany({
      data: successors.map((s, i) => ({
        positionId,
        userId: s.userId,
        rank: i + 1,
        notes: s.notes ?? null,
      })),
    });
  }
}

export async function createOrgPosition(input: CreatePositionInput) {
  await requireAdmin();
  const { assignedUserId, targetHireDate, certifications, careerPathsTo, successors, relationships, ...rest } = input;

  const position = await db.orgPosition.create({
    data: {
      ...rest,
      departmentId: input.departmentId ?? null,
      locationId: input.locationId ?? null,
      reportsToPositionId: input.reportsToPositionId ?? null,
      targetHireDate: targetHireDate ? new Date(targetHireDate) : null,
    },
  });

  if (assignedUserId) {
    await db.orgPositionAssignment.create({
      data: {
        positionId: position.id,
        userId: assignedUserId,
        assignmentType: "primary",
        isActive: true,
      },
    });
    if (position.status !== "filled") {
      await db.orgPosition.update({
        where: { id: position.id },
        data: { status: "filled" },
      });
    }
  }

  if (certifications && certifications.length > 0) {
    await db.orgPositionCertification.createMany({
      data: certifications.map((c) => ({
        positionId: position.id,
        certificationId: c.certificationId,
        requirementLevel: c.requirementLevel,
      })),
    });
  }

  if (careerPathsTo && careerPathsTo.length > 0) {
    await db.orgCareerPath.createMany({
      data: careerPathsTo.map((toId) => ({
        fromPositionId: position.id,
        toPositionId: toId,
      })),
    });
  }

  if (successors && successors.length > 0) {
    await applySuccessors(position.id, successors);
  }

  if (relationships && relationships.length > 0) {
    await applyRelationships(position.id, relationships);
  }

  revalidatePath("/org-chart");
  return position;
}

export async function updateOrgPosition(id: string, input: UpdatePositionInput) {
  await requireAdmin();
  const { assignedUserId, targetHireDate, certifications, careerPathsTo, successors, relationships, ...rest } = input;

  await db.orgPosition.update({
    where: { id },
    data: {
      ...rest,
      targetHireDate: targetHireDate !== undefined
        ? targetHireDate ? new Date(targetHireDate) : null
        : undefined,
    },
  });

  // Update assignment: deactivate existing primary, create new if provided
  if (assignedUserId !== undefined) {
    await db.orgPositionAssignment.updateMany({
      where: { positionId: id, assignmentType: "primary", isActive: true },
      data: { isActive: false, endDate: new Date() },
    });
    if (assignedUserId) {
      await db.orgPositionAssignment.create({
        data: {
          positionId: id,
          userId: assignedUserId,
          assignmentType: "primary",
          isActive: true,
        },
      });
    }
    // Sync status based on assignment
    const newStatus = assignedUserId ? "filled" : rest.status ?? "open";
    if (rest.status === undefined) {
      await db.orgPosition.update({
        where: { id },
        data: { status: newStatus },
      });
    }
  }

  // Replace certifications (delete all, recreate)
  if (certifications !== undefined) {
    await db.orgPositionCertification.deleteMany({ where: { positionId: id } });
    if (certifications.length > 0) {
      await db.orgPositionCertification.createMany({
        data: certifications.map((c) => ({
          positionId: id,
          certificationId: c.certificationId,
          requirementLevel: c.requirementLevel,
        })),
      });
    }
  }

  // Replace career paths (delete all from-side, recreate)
  if (careerPathsTo !== undefined) {
    await db.orgCareerPath.deleteMany({ where: { fromPositionId: id } });
    if (careerPathsTo.length > 0) {
      await db.orgCareerPath.createMany({
        data: careerPathsTo.map((toId) => ({ fromPositionId: id, toPositionId: toId })),
      });
    }
  }

  // Replace successors (ranked order = array index + 1)
  if (successors !== undefined) {
    await applySuccessors(id, successors);
  }

  // Replace matrix relationships (delete-all-recreate)
  if (relationships !== undefined) {
    await applyRelationships(id, relationships);
  }

  revalidatePath("/org-chart");
}

export async function deleteOrgPosition(id: string) {
  await requireAdmin();
  // Clear any self-referential children first (set their parent to null)
  await db.orgPosition.updateMany({
    where: { reportsToPositionId: id },
    data: { reportsToPositionId: null },
  });
  await db.orgPosition.delete({ where: { id } });
  revalidatePath("/org-chart");
}

// ─── Divisions ────────────────────────────────────────────────────────────────

export async function createOrgDivision(input: CreateDivisionInput): Promise<OrgDivision> {
  await requireAdmin();
  const div = await db.orgDivision.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? "#6366f1",
      status: input.status ?? "active",
    },
  });
  revalidatePath("/org-chart");
  return {
    ...div,
    createdAt: div.createdAt.toISOString(),
    updatedAt: div.updatedAt.toISOString(),
  };
}

export async function updateOrgDivision(id: string, input: Partial<CreateDivisionInput>) {
  await requireAdmin();
  await db.orgDivision.update({ where: { id }, data: input });
  revalidatePath("/org-chart");
}

export async function deleteOrgDivision(id: string) {
  await requireAdmin();
  // Unlink departments from this division (SetNull in schema handles the FK,
  // but we updateMany here to keep the Prisma client in sync within the same tx)
  await db.orgDepartment.updateMany({
    where: { divisionId: id },
    data: { divisionId: null },
  });
  await db.orgDivision.delete({ where: { id } });
  revalidatePath("/org-chart");
}

// ─── Departments ──────────────────────────────────────────────────────────────

export async function createOrgDepartment(input: CreateDepartmentInput) {
  await requireAdmin();
  const dept = await db.orgDepartment.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      color: input.color ?? "#6366f1",
      status: input.status ?? "active",
      divisionId: input.divisionId ?? null,
    },
  });
  revalidatePath("/org-chart");
  return dept;
}

export async function updateOrgDepartment(id: string, input: Partial<CreateDepartmentInput>) {
  await requireAdmin();
  await db.orgDepartment.update({
    where: { id },
    data: {
      ...(input.name        !== undefined && { name:        input.name }),
      ...(input.description !== undefined && { description: input.description }),
      ...(input.color       !== undefined && { color:       input.color }),
      ...(input.status      !== undefined && { status:      input.status }),
      ...("divisionId" in input          && { divisionId:  input.divisionId ?? null }),
    },
  });
  revalidatePath("/org-chart");
}

export async function deleteOrgDepartment(id: string) {
  await requireAdmin();
  // Unlink positions from this department before deleting
  await db.orgPosition.updateMany({
    where: { departmentId: id },
    data: { departmentId: null },
  });
  await db.orgDepartment.delete({ where: { id } });
  revalidatePath("/org-chart");
}

// ─── Locations ────────────────────────────────────────────────────────────────

export async function createOrgLocation(input: CreateLocationInput) {
  await requireAdmin();
  const loc = await db.orgLocation.create({
    data: {
      name: input.name,
      address: input.address ?? null,
      city: input.city ?? null,
      state: input.state ?? null,
      region: input.region ?? null,
      status: input.status ?? "active",
    },
  });
  revalidatePath("/org-chart");
  return loc;
}

export async function updateOrgLocation(id: string, input: Partial<CreateLocationInput>) {
  await requireAdmin();
  await db.orgLocation.update({ where: { id }, data: input });
  revalidatePath("/org-chart");
}

export async function deleteOrgLocation(id: string) {
  await requireAdmin();
  await db.orgPosition.updateMany({
    where: { locationId: id },
    data: { locationId: null },
  });
  await db.orgLocation.delete({ where: { id } });
  revalidatePath("/org-chart");
}

// ─── Certifications ───────────────────────────────────────────────────────────

export async function createOrgCertification(
  input: CreateCertificationInput,
): Promise<OrgCertification> {
  await requireAdmin();
  const cert = await db.orgCertification.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      issuingBody: input.issuingBody ?? null,
    },
  });
  revalidatePath("/org-chart");
  return { ...cert, createdAt: cert.createdAt.toISOString(), updatedAt: cert.updatedAt.toISOString() };
}

export async function updateOrgCertification(
  id: string,
  input: Partial<CreateCertificationInput>,
): Promise<void> {
  await requireAdmin();
  await db.orgCertification.update({ where: { id }, data: input });
  revalidatePath("/org-chart");
}

export async function deleteOrgCertification(id: string): Promise<void> {
  await requireAdmin();
  // Junction rows cascade on delete; remove the cert from the library.
  await db.orgCertification.delete({ where: { id } });
  revalidatePath("/org-chart");
}

// ─── User Certifications ──────────────────────────────────────────────────────

export async function addUserCertification(input: AddUserCertificationInput): Promise<void> {
  await requireAdmin();
  await db.orgUserCertification.upsert({
    where: { userId_certificationId: { userId: input.userId, certificationId: input.certificationId } },
    create: {
      userId: input.userId,
      certificationId: input.certificationId,
      issuedDate: input.issuedDate ? new Date(input.issuedDate) : null,
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      credentialId: input.credentialId ?? null,
    },
    update: {
      issuedDate: input.issuedDate ? new Date(input.issuedDate) : null,
      expiryDate: input.expiryDate ? new Date(input.expiryDate) : null,
      credentialId: input.credentialId ?? null,
    },
  });
  revalidatePath("/org-chart");
}

export async function removeUserCertification(id: string): Promise<void> {
  await requireAdmin();
  await db.orgUserCertification.delete({ where: { id } });
  revalidatePath("/org-chart");
}

// ─── Bio Description ──────────────────────────────────────────────────────────

export async function updateUserBioDescription(
  userId: string,
  bio: string | null,
): Promise<void> {
  await requireAdmin();
  await db.user.update({ where: { id: userId }, data: { bioDescription: bio ?? null } });
  revalidatePath("/org-chart");
}

// ─── Position reorder ─────────────────────────────────────────────────────────
// Swaps sort_order between two sibling positions. The caller sends both IDs
// so the swap is atomic — no intermediate state where orders collide.

export async function swapOrgPositionOrder(
  idA: string,
  orderA: number,
  idB: string,
  orderB: number,
): Promise<void> {
  await requireAdmin();
  await db.$transaction([
    db.orgPosition.update({ where: { id: idA }, data: { sortOrder: orderB } }),
    db.orgPosition.update({ where: { id: idB }, data: { sortOrder: orderA } }),
  ]);
  revalidatePath("/org-chart");
}

// ─── Department reorder ───────────────────────────────────────────────────────

export async function swapOrgDepartmentOrder(
  idA: string,
  orderA: number,
  idB: string,
  orderB: number,
): Promise<void> {
  await requireAdmin();
  await db.$transaction([
    db.orgDepartment.update({ where: { id: idA }, data: { sortOrder: orderB } }),
    db.orgDepartment.update({ where: { id: idB }, data: { sortOrder: orderA } }),
  ]);
  revalidatePath("/org-chart");
}

// ─── Position layouts (manual drag-to-reposition) ────────────────────────────

export async function savePositionLayout(
  positionId: string,
  versionId: string,
  viewType: string,
  x: number,
  y: number,
): Promise<void> {
  await requireAdmin();
  await db.orgPositionLayout.upsert({
    where: { positionId_versionId_viewType: { positionId, versionId, viewType } },
    create: { positionId, versionId, viewType, layoutX: x, layoutY: y },
    update: { layoutX: x, layoutY: y },
  });
  // No revalidatePath — positions are tracked client-side; page reloads reflect DB state
}

export async function batchSavePositionLayouts(
  entries: Array<{ positionId: string; x: number; y: number }>,
  versionId: string,
  viewType: string,
): Promise<void> {
  await requireAdmin();
  await db.$transaction(
    entries.map(({ positionId, x, y }) =>
      db.orgPositionLayout.upsert({
        where: { positionId_versionId_viewType: { positionId, versionId, viewType } },
        create: { positionId, versionId, viewType, layoutX: x, layoutY: y },
        update: { layoutX: x, layoutY: y },
      }),
    ),
  );
}

export async function clearPositionLayouts(
  versionId: string,
  viewType: string,
): Promise<void> {
  await requireAdmin();
  await db.orgPositionLayout.deleteMany({ where: { versionId, viewType } });
  revalidatePath("/org-chart");
}

// ─── Dept group layouts (manual drag/resize of department boxes) ──────────────

export async function saveDeptLayout(
  deptId: string,
  versionId: string,
  viewType: string,
  x: number,
  y: number,
  w: number,
  h: number,
): Promise<void> {
  await requireAdmin();
  await db.orgDeptLayout.upsert({
    where: { deptId_versionId_viewType: { deptId, versionId, viewType } },
    create: { deptId, versionId, viewType, layoutX: x, layoutY: y, layoutW: w, layoutH: h },
    update: { layoutX: x, layoutY: y, layoutW: w, layoutH: h },
  });
}

export async function clearDeptLayouts(
  versionId: string,
  viewType: string,
): Promise<void> {
  await requireAdmin();
  await db.orgDeptLayout.deleteMany({ where: { versionId, viewType } });
  revalidatePath("/org-chart");
}

// ─── Reparent position (drag-to-restructure) ─────────────────────────────────

export async function reparentOrgPosition(
  id: string,
  newParentId: string | null,
): Promise<void> {
  await requireAdmin();
  await db.orgPosition.update({
    where: { id },
    data: { reportsToPositionId: newParentId },
  });
  revalidatePath("/org-chart");
}
