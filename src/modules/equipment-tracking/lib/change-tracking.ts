import type { EquipmentRow, EquipmentRowSnapshot } from "@/types/equipment";

export function snapshotRow(row: EquipmentRow): EquipmentRowSnapshot {
  return {
    seq: row.seq,
    mfr: row.mfr,
    product: row.product,
    desc: row.desc,
    qty: String(row.qty),
    stockAllocation: row.stockAllocation,
    specialOrder: row.specialOrder,
    pickedQty: String(row.pickedQty),
    shippedQty: String(row.shippedQty),
    cancelled: row.cancelled,
  };
}

export function snapshotRows(rows: EquipmentRow[]): Record<string, EquipmentRowSnapshot> {
  const snapshot: Record<string, EquipmentRowSnapshot> = {};
  for (const row of rows) snapshot[row.id] = snapshotRow(row);
  return snapshot;
}

export function isFieldChanged(
  snapshot: EquipmentRowSnapshot | undefined,
  field: keyof EquipmentRowSnapshot,
  currentValue: string
): boolean {
  if (!snapshot) return false;
  return String(snapshot[field] ?? "") !== currentValue;
}
