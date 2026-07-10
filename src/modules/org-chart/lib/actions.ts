"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import type {
  OrgChartVersion,
  CreatePositionInput,
  UpdatePositionInput,
  CreateDepartmentInput,
  CreateLocationInput,
  CreateVersionInput,
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

export async function createOrgPosition(input: CreatePositionInput) {
  const { assignedUserId, targetHireDate, ...rest } = input;

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
    // Sync status to "filled" if a user is assigned
    if (position.status !== "filled") {
      await db.orgPosition.update({
        where: { id: position.id },
        data: { status: "filled" },
      });
    }
  }

  revalidatePath("/org-chart");
  return position;
}

export async function updateOrgPosition(id: string, input: UpdatePositionInput) {
  const { assignedUserId, targetHireDate, ...rest } = input;

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
