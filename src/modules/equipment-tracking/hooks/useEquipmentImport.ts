"use client";

import { useState } from "react";
import { generateSampleEquipmentRows } from "@/lib/mock/seed";
import { parseCsvToImportRows, type ParsedEquipmentRow } from "@/modules/equipment-tracking/lib/csv-parser";

export function useEquipmentImport() {
  const [pendingRows, setPendingRows] = useState<ParsedEquipmentRow[] | null>(null);
  const [pendingFileName, setPendingFileName] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);

  async function importFile(file: File) {
    setIsParsing(true);
    try {
      const text = await file.text();
      setPendingRows(parseCsvToImportRows(text));
      setPendingFileName(file.name);
    } finally {
      setIsParsing(false);
    }
  }

  function importSample() {
    setPendingRows(
      generateSampleEquipmentRows().map((row) => ({
        seq: row.seq,
        mfr: row.mfr,
        product: row.product,
        desc: row.desc,
        qty: row.qty,
        stockAllocation: row.stockAllocation,
        specialOrder: row.specialOrder,
        pickedQty: row.pickedQty,
        shippedQty: row.shippedQty,
        cancelled: row.cancelled,
      }))
    );
    setPendingFileName("Sample Equipment List.csv");
  }

  function clearPending() {
    setPendingRows(null);
    setPendingFileName(null);
  }

  return { pendingRows, pendingFileName, isParsing, importFile, importSample, clearPending };
}
