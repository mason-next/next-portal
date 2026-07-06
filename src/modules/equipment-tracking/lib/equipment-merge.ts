import type { EquipmentRow } from "@/types/equipment";
import { computeEquipmentStatus } from "./status";
import type { ParsedEquipmentRow } from "./csv-parser";

export interface MergeResult {
  rows: EquipmentRow[];
  newCount: number;
  updatedCount: number;
  removedCount: number;
}

function toNewEquipmentRow(parsed: ParsedEquipmentRow, now: string): EquipmentRow {
  return {
    id: crypto.randomUUID(),
    seq: parsed.seq,
    mfr: parsed.mfr,
    product: parsed.product,
    desc: parsed.desc,
    qty: parsed.qty,
    unitCost: parsed.unitCost,
    stockAllocation: parsed.stockAllocation,
    specialOrder: parsed.specialOrder,
    pickedQty: parsed.pickedQty,
    shippedQty: parsed.shippedQty,
    cancelled: parsed.cancelled,
    poInfo: parsed.poInfo,
    notNeeded: false,
    status: computeEquipmentStatus({ ...parsed, notNeeded: false }),
    rmaRequestedAt: null,
    source: "csv",
    audit: [],
    updatedAt: now,
  };
}

export function buildRowsForNewProject(parsedRows: ParsedEquipmentRow[], now: string): EquipmentRow[] {
  return parsedRows.map((parsed) => toNewEquipmentRow(parsed, now));
}

// Override import: discards the existing list entirely and rebuilds it from scratch out of
// the freshly imported rows — no matching, no carried-over audit history. Use when the CSV
// is meant to be the new source of truth rather than an incremental update.
export function replaceAllRows(existingRows: EquipmentRow[], parsedRows: ParsedEquipmentRow[], now: string): MergeResult {
  return {
    rows: buildRowsForNewProject(parsedRows, now),
    newCount: parsedRows.length,
    updatedCount: 0,
    removedCount: existingRows.length,
  };
}

// Merge imported rows into a project's existing equipment list: match by manufacturer +
// product first, fall back to product alone, otherwise insert as a new row. Status is
// always recomputed from the freshly imported values, never carried over from the old row.
// Deliberately doesn't match on seq — seq is a display reference number, not a stable
// identity (it falls back to import-file row position when the CSV has no real seq column,
// see csv-parser.ts), so matching on it could pair up unrelated rows across two uploads
// whose ordering changed.
export function mergeRowsIntoExisting(
  existingRows: EquipmentRow[],
  parsedRows: ParsedEquipmentRow[],
  now: string
): MergeResult {
  const rows = [...existingRows];
  let newCount = 0;
  let updatedCount = 0;

  for (const parsed of parsedRows) {
    const matchIndex = findMatchIndex(rows, parsed);
    if (matchIndex === -1) {
      rows.push(toNewEquipmentRow(parsed, now));
      newCount++;
      continue;
    }

    const existing = rows[matchIndex];
    rows[matchIndex] = {
      ...existing,
      seq: parsed.seq,
      mfr: parsed.mfr,
      product: parsed.product,
      desc: parsed.desc,
      qty: parsed.qty,
      unitCost: parsed.unitCost,
      stockAllocation: parsed.stockAllocation,
      specialOrder: parsed.specialOrder,
      pickedQty: parsed.pickedQty,
      shippedQty: parsed.shippedQty,
      cancelled: parsed.cancelled,
      poInfo: parsed.poInfo,
      // notNeeded is a manual override — preserve it across re-imports
      status: computeEquipmentStatus({ ...parsed, notNeeded: existing.notNeeded }),
      updatedAt: now,
    };
    updatedCount++;
  }

  return { rows, newCount, updatedCount, removedCount: 0 };
}

function findMatchIndex(rows: EquipmentRow[], parsed: ParsedEquipmentRow): number {
  if (parsed.mfr && parsed.product) {
    const byMfrAndProduct = rows.findIndex(
      (row) => row.mfr === parsed.mfr && row.product === parsed.product
    );
    if (byMfrAndProduct !== -1) return byMfrAndProduct;
  }
  if (parsed.product) {
    const byProduct = rows.findIndex((row) => row.product === parsed.product);
    if (byProduct !== -1) return byProduct;
  }
  return -1;
}
