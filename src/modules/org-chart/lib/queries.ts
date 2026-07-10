import { db } from "@/lib/db";
import type {
  OrgDepartment,
  OrgLocation,
  OrgChartVersion,
  OrgPosition,
  OrgChartStats,
  OrgCertification,
  OrgUserCertification,
  OrgSuccessor,
  OrgPositionRelationship,
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
        select: {
          id: true,
          positionId: true,
          userId: true,
          assignmentType: true,
          startDate: true,
          endDate: true,
          isActive: true,
        },
      },
      certifications: {
        include: { certification: true },
        orderBy: { createdAt: "asc" },
      },
      careerPathsFrom: {
        include: { toPosition: { select: { id: true, title: true } } },
        orderBy: { createdAt: "asc" },
      },
      successors: {
        orderBy: { rank: "asc" },
      },
      relationshipsFrom: {
        include: { toPosition: { select: { id: true, title: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  // Collect unique user IDs from assignments AND successors in one batch.
  // user_id is a plain scalar (no Prisma relation) so User model stays unmodified.
  const userIds = [
    ...new Set([
      ...rows.flatMap((r) => r.assignments.map((a) => a.userId)).filter((id): id is string => id !== null),
      ...rows.flatMap((r) => r.successors.map((s) => s.userId)),
    ]),
  ];
  const users =
    userIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true, avatarUrl: true },
        })
      : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

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
    salaryMin: r.salaryMin,
    salaryMid: r.salaryMid,
    salaryMax: r.salaryMax,
    payFrequency: r.payFrequency,
    budgetStatus: r.budgetStatus,
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
      user: a.userId ? (userMap.get(a.userId) ?? null) : null,
    })),
    certifications: r.certifications.map((c) => ({
      id: c.id,
      positionId: c.positionId,
      certificationId: c.certificationId,
      requirementLevel: c.requirementLevel as "required" | "preferred",
      certification: {
        ...c.certification,
        createdAt: c.certification.createdAt.toISOString(),
        updatedAt: c.certification.updatedAt.toISOString(),
      },
    })),
    careerPaths: r.careerPathsFrom.map((cp) => ({
      id: cp.id,
      fromPositionId: cp.fromPositionId,
      toPositionId: cp.toPositionId,
      toPositionTitle: cp.toPosition.title,
      typicalTimelineMonths: cp.typicalTimelineMonths,
      notes: cp.notes,
      createdAt: cp.createdAt.toISOString(),
    })),
    successors: r.successors.map((s) => ({
      id: s.id,
      positionId: s.positionId,
      userId: s.userId,
      rank: s.rank,
      notes: s.notes,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      user: userMap.get(s.userId) ?? null,
    })),
    relationships: r.relationshipsFrom.map((rel) => ({
      id: rel.id,
      fromPositionId: rel.fromPositionId,
      toPositionId: rel.toPositionId,
      toPositionTitle: rel.toPosition.title,
      relationshipType: rel.relationshipType,
      notes: rel.notes,
      createdAt: rel.createdAt.toISOString(),
    })),
  }));
}

// ─── Certifications ───────────────────────────────────────────────────────────

export async function getOrgCertifications(): Promise<OrgCertification[]> {
  const rows = await db.orgCertification.findMany({
    where: { status: "active" },
    orderBy: { name: "asc" },
  });
  return rows.map((r) => ({
    ...r,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }));
}

export async function getOrgUserCertifications(): Promise<OrgUserCertification[]> {
  const rows = await db.orgUserCertification.findMany({
    include: { certification: true },
    orderBy: { createdAt: "asc" },
  });

  const userIds = [...new Set(rows.map((r) => r.userId))];
  const users =
    userIds.length > 0
      ? await db.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
  const userMap = new Map(users.map((u) => [u.id, u]));

  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    certificationId: r.certificationId,
    issuedDate: serializeDate(r.issuedDate),
    expiryDate: serializeDate(r.expiryDate),
    credentialId: r.credentialId,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
    certification: {
      ...r.certification,
      createdAt: r.certification.createdAt.toISOString(),
      updatedAt: r.certification.updatedAt.toISOString(),
    },
    user: userMap.get(r.userId) ?? null,
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
