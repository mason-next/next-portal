import { readProjectScoped, writeProjectScoped } from "@/lib/storage/local-store";

const LAST_VIEWED_KEY = "activity-last-viewed";

// Last-viewed tracking is intentionally per-device localStorage state.
// There is no ActivityLastViewed model in the schema — this is not a regression.
export function getActivityLastViewed(projectId: string): string | null {
  return readProjectScoped<string>(projectId, LAST_VIEWED_KEY);
}

export function markActivityViewed(projectId: string): void {
  writeProjectScoped(projectId, LAST_VIEWED_KEY, new Date().toISOString());
}
