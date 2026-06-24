import { parseDelimitedText, findFieldValue, firstNonEmpty } from "@/lib/csv/delimited-parser";
import { FIELD_ALIASES } from "./field-aliases";

export interface ParsedEquipmentRow {
  seq: string;
  mfr: string;
  product: string;
  desc: string;
  qty: number;
  stockAllocation: string;
  specialOrder: string;
  pickedQty: number;
  shippedQty: number;
  cancelled: string;
}

const HEADER_HINT =
  /(seq|sequence|line|item|number|manufacturer|mfr|product|description|qty|quantity|stock|allocation|special|order|picked|shipped|cancel)/i;

function parseNumber(raw: string): number {
  const n = Number(String(raw ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

// Spreadsheet exports sometimes carry seq numbers as floats with long tails (e.g.
// "1.4999999999999998"). Round those down to 2 decimal places; leave non-decimal seq
// values (including zero-padded labels like "001") untouched.
function normalizeSeq(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed.includes(".")) return trimmed;
  const num = Number(trimmed);
  return Number.isFinite(num) ? num.toFixed(2) : trimmed;
}

export function parseCsvToImportRows(text: string): ParsedEquipmentRow[] {
  const data = parseDelimitedText(text);
  if (!data.length) return [];

  let headers = data[0].map((h) => h.trim());
  let body = data.slice(1);

  const headerScore = headers.filter((h) => HEADER_HINT.test(h)).length;
  if (headerScore === 0) {
    body = data;
    headers = [
      "Sequence",
      "Manufacturer",
      "Product",
      "Description",
      "Qty",
      "Stock Allocation",
      "Special Order",
      "Picked Quantity",
      "Shipped Quantity",
      "Cancelled",
    ];
  }

  return body
    .map((cols, index) => {
      const record: Record<string, string> = {};
      headers.forEach((h, i) => {
        record[h || `Column ${i + 1}`] = cols[i] ?? "";
      });

      // Only trust an actual Sequence/Line/Item Number column (matched by alias, including
      // the synthetic "Sequence" header used in headerless mode below). Don't fall back to
      // an arbitrary column — a header row that simply has no seq column would otherwise get
      // mislabeled with whatever happens to be in column 1. Fall back to import order instead,
      // so every row still gets a stable reference number even without a real seq column.
      const seqRaw = findFieldValue(record, FIELD_ALIASES.seq);
      const seq = seqRaw.trim() === "" ? String(index + 1) : normalizeSeq(seqRaw);
      const mfr = firstNonEmpty([findFieldValue(record, FIELD_ALIASES.mfr), cols[1]]);
      const product = firstNonEmpty([findFieldValue(record, FIELD_ALIASES.product), cols[2]]);
      const desc = firstNonEmpty([findFieldValue(record, FIELD_ALIASES.desc), cols[3]]);
      const qtyRaw = firstNonEmpty([findFieldValue(record, FIELD_ALIASES.qty), cols[4]]);
      const stockAllocation = findFieldValue(record, FIELD_ALIASES.stockAllocation);
      const specialOrder = findFieldValue(record, FIELD_ALIASES.specialOrder);
      const pickedQtyRaw = findFieldValue(record, FIELD_ALIASES.pickedQty);
      const shippedQtyRaw = findFieldValue(record, FIELD_ALIASES.shippedQty);
      const cancelled = findFieldValue(record, FIELD_ALIASES.cancelled);

      return {
        seq,
        mfr,
        product,
        desc,
        qty: qtyRaw.trim() === "" ? 1 : parseNumber(qtyRaw),
        stockAllocation,
        specialOrder,
        pickedQty: parseNumber(pickedQtyRaw),
        shippedQty: parseNumber(shippedQtyRaw),
        cancelled,
      };
    })
    .filter((row) => [row.mfr, row.product, row.desc].some((v) => v.trim() !== ""));
}
