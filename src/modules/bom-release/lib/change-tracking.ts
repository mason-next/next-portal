import type { BomRow, BomRowSnapshot } from "@/types/bom";

export function snapshotRow(row: BomRow): BomRowSnapshot {
  return {
    seq: row.seq,
    mfr: row.mfr,
    part: row.part,
    desc: row.desc,
    qty: String(row.qty),
    unitCost: String(row.unitCost),
    status: row.status,
    release: row.release ?? "",
    notes: row.notes,
  };
}

export function snapshotRows(rows: BomRow[]): Record<string, BomRowSnapshot> {
  const snapshot: Record<string, BomRowSnapshot> = {};
  for (const row of rows) snapshot[row.id] = snapshotRow(row);
  return snapshot;
}

export function isFieldChanged(
  snapshot: BomRowSnapshot | undefined,
  field: keyof BomRowSnapshot,
  currentValue: string
): boolean {
  if (!snapshot) return false;
  return String(snapshot[field] ?? "") !== currentValue;
}
