"use server";

import { db } from "@/lib/db";
import type { Subcontractor, NewSubcontractorInput, ProjectTechnicianEntry } from "@/types/subcontractor";
import type {
  Subcontractor as PrismaSub,
  ProjectTechnician as PrismaTech,
  User,
} from "@prisma/client";

// ─── Mappers ──────────────────────────────────────────────────────────────────

function toSubcontractor(p: PrismaSub): Subcontractor {
  return {
    id: p.id,
    name: p.name,
    trade: p.trade,
    contactName: p.contactName,
    contactEmail: p.contactEmail,
    contactPhone: p.contactPhone,
    location: p.location,
    manpower: p.manpower,
    geographicalReach: p.geographicalReach,
    rating: p.rating,
    notes: p.notes,
    isActive: p.isActive,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

type PrismaTechWithRelations = PrismaTech & {
  user: Pick<User, "id" | "name" | "avatarUrl"> | null;
  subcontractor: Pick<PrismaSub, "id" | "name" | "trade"> | null;
};

function toTechnicianEntry(p: PrismaTechWithRelations): ProjectTechnicianEntry {
  return {
    id: p.id,
    userId: p.userId,
    userName: p.user?.name ?? null,
    avatarUrl: p.user?.avatarUrl ?? null,
    subcontractorId: p.subcontractorId,
    subcontractorName: p.subcontractor?.name ?? null,
    trade: p.subcontractor?.trade ?? "",
  };
}

const TECH_INCLUDE = {
  user: { select: { id: true, name: true, avatarUrl: true } },
  subcontractor: { select: { id: true, name: true, trade: true } },
} as const;

// ─── Subcontractor queries ────────────────────────────────────────────────────

// Active-only list — used by the technician picker on project overviews.
export async function getSubcontractors(): Promise<Subcontractor[]> {
  const rows = await db.subcontractor.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });
  return rows.map(toSubcontractor);
}

// All subcontractors including inactive — used by the admin management view.
export async function getAllSubcontractors(): Promise<Subcontractor[]> {
  const rows = await db.subcontractor.findMany({ orderBy: { name: "asc" } });
  return rows.map(toSubcontractor);
}

export async function createSubcontractor(input: NewSubcontractorInput): Promise<Subcontractor> {
  const row = await db.subcontractor.create({
    data: {
      id: crypto.randomUUID(),
      name: input.name.trim(),
      trade: input.trade.trim(),
      contactName: input.contactName.trim(),
      contactEmail: input.contactEmail.trim(),
      contactPhone: input.contactPhone.trim(),
      location: input.location.trim(),
      manpower: input.manpower,
      geographicalReach: input.geographicalReach.trim(),
      rating: input.rating,
      notes: input.notes.trim(),
      isActive: input.isActive,
    },
  });
  return toSubcontractor(row);
}

export async function updateSubcontractor(
  id: string,
  input: Partial<NewSubcontractorInput>
): Promise<Subcontractor> {
  const row = await db.subcontractor.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.trade !== undefined && { trade: input.trade.trim() }),
      ...(input.contactName !== undefined && { contactName: input.contactName.trim() }),
      ...(input.contactEmail !== undefined && { contactEmail: input.contactEmail.trim() }),
      ...(input.contactPhone !== undefined && { contactPhone: input.contactPhone.trim() }),
      ...(input.location !== undefined && { location: input.location.trim() }),
      ...(input.manpower !== undefined && { manpower: input.manpower }),
      ...(input.geographicalReach !== undefined && { geographicalReach: input.geographicalReach.trim() }),
      ...(input.rating !== undefined && { rating: input.rating }),
      ...(input.notes !== undefined && { notes: input.notes.trim() }),
      ...(input.isActive !== undefined && { isActive: input.isActive }),
    },
  });
  return toSubcontractor(row);
}

export async function deleteSubcontractor(id: string): Promise<void> {
  await db.subcontractor.delete({ where: { id } });
}

// Legacy inline-creation shim used by TechnicianMultiSelect — keeps old 2-arg signature.
export async function createSubcontractorQuick(name: string, trade = ""): Promise<Subcontractor> {
  return createSubcontractor({
    name, trade, contactName: "", contactEmail: "", contactPhone: "",
    location: "", manpower: 0, geographicalReach: "", rating: null, notes: "", isActive: true,
  });
}

// ─── Technician queries ───────────────────────────────────────────────────────

export async function getProjectTechnicians(projectId: string): Promise<ProjectTechnicianEntry[]> {
  const rows = await db.projectTechnician.findMany({
    where: { projectId },
    include: TECH_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
  return rows.map(toTechnicianEntry);
}

// Replace all technician assignments for a project in one atomic operation.
// `entries` is the desired final state — any existing rows not in the list are removed.
export async function setProjectTechnicians(
  projectId: string,
  entries: Array<{ userId?: string | null; subcontractorId?: string | null }>
): Promise<ProjectTechnicianEntry[]> {
  // Dedupe: userId and subcontractorId must each appear at most once per project
  const seen = new Set<string>();
  const deduped = entries.filter((e) => {
    const key = e.userId ? `u:${e.userId}` : e.subcontractorId ? `s:${e.subcontractorId}` : null;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  await db.$transaction([
    db.projectTechnician.deleteMany({ where: { projectId } }),
    ...(deduped.length > 0
      ? [
          db.projectTechnician.createMany({
            data: deduped.map((e) => ({
              id: crypto.randomUUID(),
              projectId,
              userId: e.userId ?? null,
              subcontractorId: e.subcontractorId ?? null,
            })),
          }),
        ]
      : []),
  ]);

  return getProjectTechnicians(projectId);
}
