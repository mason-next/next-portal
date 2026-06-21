import type { Release } from "@/types/release";
import { readProjectScoped, writeProjectScoped } from "@/lib/storage/local-store";

const RELEASES_KEY = "releases";

export async function getReleases(projectId: string): Promise<Release[]> {
  return readProjectScoped<Release[]>(projectId, RELEASES_KEY) ?? [];
}

export async function createRelease(projectId: string, release: Release): Promise<Release> {
  const existing = await getReleases(projectId);
  writeProjectScoped(projectId, RELEASES_KEY, [...existing, release]);
  return release;
}

export async function updateRelease(
  projectId: string,
  releaseId: string,
  patch: Partial<Release>
): Promise<Release> {
  const all = await getReleases(projectId);
  const index = all.findIndex((r) => r.id === releaseId);
  if (index === -1) throw new Error(`Release not found: ${releaseId}`);

  const updated: Release = { ...all[index], ...patch, id: releaseId };
  const next = [...all];
  next[index] = updated;
  writeProjectScoped(projectId, RELEASES_KEY, next);
  return updated;
}
