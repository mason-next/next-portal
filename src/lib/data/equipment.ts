import type { EquipmentRow, EquipmentUploadRecord } from "@/types/equipment";
import { SAMPLE_PROJECT } from "@/lib/mock/projects.mock";
import { SAMPLE_EQUIPMENT_ROWS } from "@/lib/mock/equipment-rows.mock";
import { readProjectScoped, writeProjectScoped } from "@/lib/storage/local-store";

const EQUIPMENT_ROWS_KEY = "equipment-rows";
const EQUIPMENT_UPLOADS_KEY = "equipment-uploads";

export async function getEquipmentRows(projectId: string): Promise<EquipmentRow[]> {
  const stored = readProjectScoped<EquipmentRow[]>(projectId, EQUIPMENT_ROWS_KEY);
  if (stored) return stored;
  const seeded = projectId === SAMPLE_PROJECT.id ? SAMPLE_EQUIPMENT_ROWS : [];
  writeProjectScoped(projectId, EQUIPMENT_ROWS_KEY, seeded);
  return seeded;
}

export async function saveEquipmentRows(projectId: string, rows: EquipmentRow[]): Promise<void> {
  writeProjectScoped(projectId, EQUIPMENT_ROWS_KEY, rows);
}

export async function getEquipmentUploadHistory(projectId: string): Promise<EquipmentUploadRecord[]> {
  return readProjectScoped<EquipmentUploadRecord[]>(projectId, EQUIPMENT_UPLOADS_KEY) ?? [];
}

export async function appendEquipmentUploadRecord(projectId: string, record: EquipmentUploadRecord): Promise<void> {
  const history = await getEquipmentUploadHistory(projectId);
  writeProjectScoped(projectId, EQUIPMENT_UPLOADS_KEY, [record, ...history]);
}
