import type { BomRow } from "@/types/bom";
import type { ParsedBomRow } from "./csv-parser";

function toNewBomRow(parsed: ParsedBomRow, now: string): BomRow {
  return {
    id: crypto.randomUUID(),
    seq: parsed.seq,
    mfr: parsed.mfr,
    part: parsed.part,
    desc: parsed.desc,
    qty: parsed.qty,
    unitCost: parsed.unitCost,
    status: "Pending Review",
    releaseId: null,
    release: null,
    releasedAt: null,
    notes: parsed.notes,
    audit: [],
    updatedAt: now,
  };
}

export function buildRowsForNewProject(parsedRows: ParsedBomRow[], now: string): BomRow[] {
  return parsedRows.map((parsed) => toNewBomRow(parsed, now));
}

// Merge imported rows into a project's existing BOM: match by seq first, fall back to
// part number, otherwise insert as a new row. No conflict-resolution UI yet — see plan §9.4.
export function mergeRowsIntoExisting(
  existingRows: BomRow[],
  parsedRows: ParsedBomRow[],
  now: string
): BomRow[] {
  const rows = [...existingRows];

  for (const parsed of parsedRows) {
    const matchIndex = findMatchIndex(rows, parsed);
    if (matchIndex === -1) {
      rows.push(toNewBomRow(parsed, now));
      continue;
    }

    const existing = rows[matchIndex];
    rows[matchIndex] = {
      ...existing,
      mfr: parsed.mfr,
      part: parsed.part,
      desc: parsed.desc,
      qty: parsed.qty,
      unitCost: parsed.unitCost,
      notes: parsed.notes || existing.notes,
      updatedAt: now,
    };
  }

  return rows;
}

function findMatchIndex(rows: BomRow[], parsed: ParsedBomRow): number {
  if (parsed.seq) {
    const bySeq = rows.findIndex((row) => row.seq === parsed.seq);
    if (bySeq !== -1) return bySeq;
  }
  if (parsed.part) {
    const byPart = rows.findIndex((row) => row.part === parsed.part);
    if (byPart !== -1) return byPart;
  }
  return -1;
}
