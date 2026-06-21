"use client";

import { useState } from "react";
import { generateSampleBomRows } from "@/lib/mock/seed";
import { parseCsvToImportRows, type ParsedBomRow } from "@/modules/bom-release/lib/csv-parser";

export function useBomImport() {
  const [pendingRows, setPendingRows] = useState<ParsedBomRow[] | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  async function importFile(file: File) {
    setIsParsing(true);
    try {
      const text = await file.text();
      setPendingRows(parseCsvToImportRows(text));
    } finally {
      setIsParsing(false);
    }
  }

  function importSample() {
    setPendingRows(
      generateSampleBomRows().map((row) => ({
        seq: row.seq,
        mfr: row.mfr,
        part: row.part,
        desc: row.desc,
        qty: row.qty,
        unitCost: row.unitCost,
        notes: row.notes,
      }))
    );
  }

  function clearPending() {
    setPendingRows(null);
  }

  return { pendingRows, isParsing, importFile, importSample, clearPending };
}
