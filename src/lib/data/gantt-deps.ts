"use server";

import { db } from "@/lib/db";
import { requireEditPermission } from "@/lib/access-control";
import type { GanttDependencyRecord, DependencyType, ScheduleMode } from "@/types/gantt";

// ─── Read ─────────────────────────────────────────────────────────────────────

export async function getGanttDeps(projectId: string): Promise<GanttDependencyRecord[]> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const deps = await (db as any).ganttDependency.findMany({
    where: { projectId },
    orderBy: { createdAt: "asc" },
  });
  return deps.map((d: {
    id: string;
    projectId: string;
    fromEntryId: string;
    toEntryId: string;
    type: string;
    lagDays: number;
  }): GanttDependencyRecord => ({
    id: d.id,
    projectId: d.projectId,
    fromEntryId: d.fromEntryId,
    toEntryId: d.toEntryId,
    type: d.type as DependencyType,
    lagDays: d.lagDays,
  }));
}

// ─── Add dependency ───────────────────────────────────────────────────────────

export async function addGanttDependency(
  projectId: string,
  fromEntryId: string,
  toEntryId: string,
  type: DependencyType = "FS",
  lagDays = 0
): Promise<GanttDependencyRecord> {
  await requireEditPermission();

  // Prevent self-reference
  if (fromEntryId === toEntryId) throw new Error("An entry cannot depend on itself");

  // Prevent duplicate
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const existing = await (db as any).ganttDependency.findUnique({
    where: { fromEntryId_toEntryId: { fromEntryId, toEntryId } },
  });
  if (existing) return existing as GanttDependencyRecord;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const dep = await (db as any).ganttDependency.create({
    data: {
      id: crypto.randomUUID(),
      projectId,
      fromEntryId,
      toEntryId,
      type,
      lagDays,
    },
  });
  return dep as GanttDependencyRecord;
}

// ─── Remove dependency ────────────────────────────────────────────────────────

export async function removeGanttDependency(depId: string): Promise<void> {
  await requireEditPermission();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).ganttDependency.delete({ where: { id: depId } });
}

// ─── Update schedule mode ─────────────────────────────────────────────────────

export async function updateGanttScheduleMode(
  entryId: string,
  scheduleMode: ScheduleMode
): Promise<void> {
  await requireEditPermission();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (db as any).ganttEntry.update({ where: { id: entryId }, data: { scheduleMode } });
}
