"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type {
  OrgChartVersion,
  OrgCertification,
  CreatePositionInput,
  UpdatePositionInput,
  CreateDepartmentInput,
  CreateLocationInput,
  CreateVersionInput,
  CreateCertificationInput,
  AddUserCertificationInput,
  SuccessorEntry,
} from "./types";

// ─── Versions ─────────────────────────────────────────────────────────────────

export async function createOrgVersion(input: CreateVersionInput): Promise<OrgChartVersion> {
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
  const { assignedUserId, targetHireDate, certifications, careerPathsTo, successors, ...rest } = input;

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

  revalidatePath("/org-chart");
  return position;
}

export async function updateOrgPosition(id: string, input: UpdatePositionInput) {
  const { assignedUserId, targetHireDate, certifications, careerPathsTo, successors, ...rest } = input;

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

  revalidatePath("/org-chart");
}

export async function deleteOrgPosition(id: string) {
  // Clear any self-referential children first (set their parent to null)
  await db.orgPosition.updateMany({
    where: { reportsToPositionId: id },
    data: { reportsToPositionId: null },
  });
  await db.orgPosition.delete({ where: { id } });
  revalidatePath("/org-chart");
}

// ─── Departments ──────────────────────────────────────────────────────────────

export async function createOrgDepartment(input: CreateDepartmentInput) {
  const dept = await db.orgDepartment.create({
    data: {
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? "active",
    },
  });
  revalidatePath("/org-chart");
  return dept;
}

export async function updateOrgDepartment(id: string, input: Partial<CreateDepartmentInput>) {
  await db.orgDepartment.update({ where: { id }, data: input });
  revalidatePath("/org-chart");
}

export async function deleteOrgDepartment(id: string) {
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
  await db.orgLocation.update({ where: { id }, data: input });
  revalidatePath("/org-chart");
}

export async function deleteOrgLocation(id: string) {
  await db.orgPosition.updateMany({
    where: { locationId: id },
    data: { locationId: null },
  });
  await db.orgLocation.delete({ where: { id } });
  revalidatePath("/org-chart");
}

// ─── Certifications ───────────────────────────────────────────────────────────

export async function createOrgCertification(
  input: CreateCertificationInput
): Promise<OrgCertification> {
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
  input: Partial<CreateCertificationInput>
): Promise<void> {
  await db.orgCertification.update({ where: { id }, data: input });
  revalidatePath("/org-chart");
}

export async function deleteOrgCertification(id: string): Promise<void> {
  // Junction rows cascade on delete; remove the cert from the library.
  await db.orgCertification.delete({ where: { id } });
  revalidatePath("/org-chart");
}

// ─── User Certifications ──────────────────────────────────────────────────────

export async function addUserCertification(input: AddUserCertificationInput): Promise<void> {
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
  await db.orgUserCertification.delete({ where: { id } });
  revalidatePath("/org-chart");
}
