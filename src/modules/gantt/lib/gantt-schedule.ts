import type {
  GanttEntryFull,
  GanttDependencyRecord,
  ScheduleMode,
} from "@/types/gantt";

const MS_PER_DAY = 86_400_000;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

function durationDays(start: Date, end: Date): number {
  return Math.max(1, Math.ceil((end.getTime() - start.getTime()) / MS_PER_DAY));
}

export interface DateOverride {
  start: Date | null;
  end: Date | null;
}

// Topologically sort entry IDs based on FS dependencies using Kahn's algorithm.
// Returns sorted IDs; entries not in deps appear in input order at the front.
function topoSort(entryIds: string[], deps: GanttDependencyRecord[]): string[] {
  const inDegree = new Map<string, number>();
  const successors = new Map<string, string[]>();

  for (const id of entryIds) {
    inDegree.set(id, 0);
    successors.set(id, []);
  }

  const fsDeps = deps.filter((d) => d.type === "FS");
  for (const d of fsDeps) {
    if (!inDegree.has(d.fromEntryId) || !inDegree.has(d.toEntryId)) continue;
    inDegree.set(d.toEntryId, (inDegree.get(d.toEntryId) ?? 0) + 1);
    successors.get(d.fromEntryId)!.push(d.toEntryId);
  }

  const queue = entryIds.filter((id) => (inDegree.get(id) ?? 0) === 0);
  const result: string[] = [];

  while (queue.length > 0) {
    const id = queue.shift()!;
    result.push(id);
    for (const suc of successors.get(id) ?? []) {
      const deg = (inDegree.get(suc) ?? 1) - 1;
      inDegree.set(suc, deg);
      if (deg === 0) queue.push(suc);
    }
  }

  // If there's a cycle, remaining nodes still need to be included
  for (const id of entryIds) {
    if (!result.includes(id)) result.push(id);
  }

  return result;
}

// Compute cascaded dates for auto-scheduled entries.
// Returns a NEW localDates map containing only changed entries.
// Call this after any date commit to propagate FS dependencies.
export function computeAutoSchedule(
  entries: GanttEntryFull[],
  deps: GanttDependencyRecord[],
  scheduleModes: Map<string, ScheduleMode>,
  localDates: Map<string, DateOverride>
): Map<string, DateOverride> {
  const allIds = entries.map((e) => e.id);
  const sorted = topoSort(allIds, deps);

  // Build predecessor map: entryId → [dep records where toEntryId === id]
  const incomingFS = new Map<string, GanttDependencyRecord[]>();
  for (const id of allIds) incomingFS.set(id, []);
  for (const d of deps) {
    if (d.type === "FS" && incomingFS.has(d.toEntryId)) {
      incomingFS.get(d.toEntryId)!.push(d);
    }
  }

  // Effective end date for an entry (local override → entry data)
  function effectiveEnd(id: string): Date | null {
    const ov = localDates.get(id);
    if (ov?.end !== undefined) return ov.end;
    const entry = entries.find((e) => e.id === id);
    if (!entry) return null;
    const raw = entry.type === "step" ? entry.stepDueDate : entry.taskDueDate;
    return raw ? new Date(raw) : null;
  }

  function effectiveDuration(id: string): number | null {
    const ov = localDates.get(id);
    const s = ov?.start ?? null;
    const e = ov?.end ?? null;
    if (s && e) return durationDays(s, e);
    const entry = entries.find((en) => en.id === id);
    if (!entry) return null;
    const rawS = entry.type === "step" ? entry.stepStartDate : entry.taskStartDate;
    const rawE = entry.type === "step" ? entry.stepDueDate : entry.taskDueDate;
    if (!rawS || !rawE) return null;
    return durationDays(new Date(rawS), new Date(rawE));
  }

  // Working copy — we mutate this as we propagate
  const working = new Map<string, DateOverride>(localDates);
  const changed = new Map<string, DateOverride>();

  for (const id of sorted) {
    const mode = scheduleModes.get(id) ?? "manual";
    if (mode !== "auto") continue;

    const preds = incomingFS.get(id) ?? [];
    if (preds.length === 0) continue;

    // Find latest end date among all FS predecessors
    let latestEnd: Date | null = null;
    let maxLag = 0;
    for (const dep of preds) {
      const predEnd = effectiveEnd(dep.fromEntryId);
      if (!predEnd) continue;
      if (!latestEnd || predEnd > latestEnd) {
        latestEnd = predEnd;
        maxLag = dep.lagDays;
      }
    }

    if (!latestEnd) continue;

    const newStart = addDays(latestEnd, 1 + maxLag);
    const duration = effectiveDuration(id);
    const newEnd = duration ? addDays(newStart, duration - 1) : null;

    const override: DateOverride = { start: newStart, end: newEnd };
    working.set(id, override);
    changed.set(id, override);
  }

  return changed;
}
