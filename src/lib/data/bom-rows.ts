import type { BomRow } from "@/types/bom";
import { SAMPLE_PROJECT } from "@/lib/mock/projects.mock";
import { SAMPLE_BOM_ROWS } from "@/lib/mock/bom-rows.mock";
import { readProjectScoped, writeProjectScoped } from "@/lib/storage/local-store";

const BOM_ROWS_KEY = "bom-rows";

export async function getBomRows(projectId: string): Promise<BomRow[]> {
  const stored = readProjectScoped<BomRow[]>(projectId, BOM_ROWS_KEY);
  if (stored) return stored;
  const seeded = projectId === SAMPLE_PROJECT.id ? SAMPLE_BOM_ROWS : [];
  writeProjectScoped(projectId, BOM_ROWS_KEY, seeded);
  return seeded;
}

export async function saveBomRows(projectId: string, rows: BomRow[]): Promise<void> {
  writeProjectScoped(projectId, BOM_ROWS_KEY, rows);
}
