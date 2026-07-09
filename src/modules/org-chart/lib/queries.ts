import { db } from "@/lib/db";
import type {
  OrgDepartment,
  OrgLocation,
  OrgChartVersion,
  OrgPosition,
  OrgChartStats,
} from "./types";

// ─── Serialization helpers ────────────────────────────────────────────────────

function serializeDate(d: Date | null | undefined): string | null {
  return d ? d.toISOString() : null;
}

// ─── Versions ─────────────────────────────────────────────────────────────────

export async function getOrgChartVersions(): Promise<OrgChartVersion[]> {
  const rows = await db.orgChartVersion.findMany({
    orderBy: { createdAt: "asc" },
  });
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getOrCreateDefaultVersion(): Promise<OrgChartVersion> {
  const existing = await db.orgChartVersion.findFirst({
    where: { versionType: "current", isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (existing) {
    return {
      ...existing,
      createdAt: existing.createdAt.toISOString(),
      updatedAt: existing.updatedAt.toISOString(),
    };
  }
  const created = await db.orgChartVersion.create({
    data: {
      name: "Current State",
      description: "Active organization chart",
      versionType: "current",
      isActive: true,
    },
  });
  return {
    ...created,
    createdAt: created.createdAt.toISOString(),
    updatedAt: created.updatedAt.toISOString(),
  };
}

// ─── Departments ──────────────────────────────────────────────────────────────

export async function getOrgDepartments(): Promise<OrgDepartment[]> {
  const rows = await db.orgDepartment.findMany({ orderBy: { name: "asc" } });
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

// ─── Locations ────────────────────────────────────────────────────────────────

export async function getOrgLocations(): Promise<OrgLocation[]> {
  const rows = await db.orgLocation.findMany({ orderBy: { name: "asc" } });
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

// ─── Positions ────────────────────────────────────────────────────────────────

export async function getOrgPositions(versionId?: string): Promise<OrgPosition[]> {
  const rows = await db.orgPosition.findMany({
    where: versionId ? { orgChartVersionId: versionId } : undefined,
    orderBy: { createdAt: "asc" },
    include: {
      department: true,
      location: true,
      assignments: {
        where: { isActive: true },
        include: {
          user: {
            select: { id: true, name: true, email: true, avatarUrl: true },
          },
        },
      },
    },
  });

  return rows.map((r) => ({
    id: r.id,
    orgChartVersionId: r.orgChartVersionId,
    title: r.title,
    departmentId: r.departmentId,
    locationId: r.locationId,
    reportsToPositionId: r.reportsToPositionId,
    status: r.status,
    targetHireDate: serializeDate(r.targetHireDate),
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    department: r.department
      ? {
          ...r.department,
          createdAt: r.department.createdAt.toISOString(),
          updatedAt: r.department.updatedAt.toISOString(),
        }
      : null,
    location: r.location
      ? {
          ...r.location,
          createdAt: r.location.createdAt.toISOString(),
          updatedAt: r.location.updatedAt.toISOString(),
        }
      : null,
    assignments: r.assignments.map((a) => ({
      id: a.id,
      positionId: a.positionId,
      userId: a.userId,
      assignmentType: a.assignmentType,
      startDate: serializeDate(a.startDate),
      endDate: serializeDate(a.endDate),
      isActive: a.isActive,
      user: a.user
        ? {
            id: a.user.id,
            name: a.user.name,
            email: a.user.email,
            avatarUrl: a.user.avatarUrl,
          }
        : null,
    })),
  }));
}

// ─── Stats ────────────────────────────────────────────────────────────────────

export async function getOrgChartStats(versionId?: string): Promise<OrgChartStats> {
  const [positions, departments, locations] = await Promise.all([
    db.orgPosition.findMany({
      where: versionId ? { orgChartVersionId: versionId } : undefined,
      select: { status: true },
    }),
    db.orgDepartment.count({ where: { status: "active" } }),
    db.orgLocation.count({ where: { status: "active" } }),
  ]);

  return {
    totalPositions: positions.length,
    filledPositions: positions.filter((p) => p.status === "filled").length,
    openPositions: positions.filter((p) => p.status === "open").length,
    plannedPositions: positions.filter((p) => p.status === "planned").length,
    totalDepartments: departments,
    totalLocations: locations,
  };
}
