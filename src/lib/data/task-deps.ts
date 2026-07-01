"use server";

import { db } from "@/lib/db";
import { requireEditPermission } from "@/lib/access-control";
import type { TaskDependencyRef, ImplementationTaskStatus } from "@/types/implementation";

const STATUS_MAP: Record<string, ImplementationTaskStatus> = {
  NotStarted: "Not Started",
  InProgress: "In Progress",
  Blocked: "Blocked",
  Complete: "Complete",
  Cancelled: "Cancelled",
};

// BFS to detect cycles: from dependsOnId, follow its dependencies chain.
// If we reach taskId, adding this dep would create a cycle.
async function wouldCreateCycle(taskId: string, dependsOnId: string): Promise<boolean> {
  const visited = new Set<string>();
  const queue = [dependsOnId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === taskId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const deps = await db.implementationTaskDep.findMany({
      where: { taskId: current },
      select: { dependsOnId: true },
    });
    for (const dep of deps) queue.push(dep.dependsOnId);
  }
  return false;
}

export async function addTaskDependency(
  taskId: string,
  dependsOnId: string
): Promise<{ ok: boolean; error?: string }> {
  await requireEditPermission();

  if (taskId === dependsOnId) {
    return { ok: false, error: "A task cannot depend on itself." };
  }

  const cycle = await wouldCreateCycle(taskId, dependsOnId);
  if (cycle) {
    return { ok: false, error: "This would create a circular dependency." };
  }

  await db.implementationTaskDep.upsert({
    where: { taskId_dependsOnId: { taskId, dependsOnId } },
    create: { taskId, dependsOnId },
    update: {},
  });

  return { ok: true };
}

export async function removeTaskDependency(
  taskId: string,
  dependsOnId: string
): Promise<void> {
  await requireEditPermission();
  await db.implementationTaskDep.deleteMany({
    where: { taskId, dependsOnId },
  });
}

export async function getTaskDependencies(taskId: string): Promise<TaskDependencyRef[]> {
  const rows = await db.implementationTaskDep.findMany({
    where: { taskId },
    include: {
      dependsOn: { select: { id: true, title: true, status: true } },
    },
    orderBy: { id: "asc" },
  });

  return rows.map((r: { id: string; taskId: string; dependsOnId: string; dependsOn: { id: string; title: string; status: string } }) => ({
    depId: r.id,
    taskId: r.taskId,
    dependsOnId: r.dependsOnId,
    dependsOnTitle: r.dependsOn.title,
    dependsOnStatus: STATUS_MAP[r.dependsOn.status] ?? "Not Started",
  }));
}
