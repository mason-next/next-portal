import { parseDelimitedText, findFieldValue, firstNonEmpty } from "@/lib/csv/delimited-parser";
import { FIELD_ALIASES } from "./field-aliases";

export interface ParsedEquipmentRow {
  seq: string;
  mfr: string;
  product: string;
  desc: string;
  qty: number;
  unitCost: number;
  stockAllocation: string;
  specialOrder: string;
  pickedQty: number;
  shippedQty: number;
  cancelled: string;
  poInfo: string;
}

const HEADER_HINT =
  /(seq|sequence|line|item|number|manufacturer|mfr|product|description|qty|quantity|cost|price|stock|allocation|special|order|picked|shipped|cancel|po info|purchase order)/i;

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
  // Positional fallbacks (cols[N]) are only meaningful for headerless files, where the
  // synthetic headers above line up with column index 1:1. When a real header row exists,
  // findFieldValue already authoritatively resolved each field by name — if it comes back
  // empty, that cell is genuinely blank (e.g. a "Shipping - Southeast" line with no
  // manufacturer), not a sign to grab whatever raw value happens to sit at that column index.
  const hasRealHeaders = headerScore > 0;
  if (!hasRealHeaders) {
    body = data;
    headers = [
      "Sequence",
      "Manufacturer",
      "Product",
      "Description",
      "Qty",
      "Unit Cost",
      "Stock Allocation",
      "Special Order",
      "Picked Quantity",
      "Shipped Quantity",
      "Cancelled",
      "PO Info",
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
      const mfr = hasRealHeaders
        ? findFieldValue(record, FIELD_ALIASES.mfr)
        : firstNonEmpty([findFieldValue(record, FIELD_ALIASES.mfr), cols[1]]);
      const product = hasRealHeaders
        ? findFieldValue(record, FIELD_ALIASES.product)
        : firstNonEmpty([findFieldValue(record, FIELD_ALIASES.product), cols[2]]);
      const desc = hasRealHeaders
        ? findFieldValue(record, FIELD_ALIASES.desc)
        : firstNonEmpty([findFieldValue(record, FIELD_ALIASES.desc), cols[3]]);
      const qtyRaw = hasRealHeaders
        ? findFieldValue(record, FIELD_ALIASES.qty)
        : firstNonEmpty([findFieldValue(record, FIELD_ALIASES.qty), cols[4]]);
      const unitCostRaw = hasRealHeaders
        ? findFieldValue(record, FIELD_ALIASES.unitCost)
        : firstNonEmpty([findFieldValue(record, FIELD_ALIASES.unitCost), cols[5]]);
      const stockAllocation = findFieldValue(record, FIELD_ALIASES.stockAllocation);
      const specialOrder = findFieldValue(record, FIELD_ALIASES.specialOrder);
      const pickedQtyRaw = findFieldValue(record, FIELD_ALIASES.pickedQty);
      const shippedQtyRaw = findFieldValue(record, FIELD_ALIASES.shippedQty);
      const cancelled = findFieldValue(record, FIELD_ALIASES.cancelled);
      const poInfo = findFieldValue(record, FIELD_ALIASES.poInfo);

      return {
        seq,
        mfr,
        product,
        desc,
        qty: qtyRaw.trim() === "" ? 1 : parseNumber(qtyRaw),
        unitCost: parseNumber(unitCostRaw),
        stockAllocation,
        specialOrder,
        pickedQty: parseNumber(pickedQtyRaw),
        shippedQty: parseNumber(shippedQtyRaw),
        cancelled,
        poInfo,
      };
    })
    .filter((row) => [row.mfr, row.product, row.desc].some((v) => v.trim() !== ""));
}
