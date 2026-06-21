import { parseMoney } from "./bom-calculations";
import { FIELD_ALIASES } from "./field-aliases";

export interface ParsedBomRow {
  seq: string;
  mfr: string;
  part: string;
  desc: string;
  qty: number;
  unitCost: number;
  notes: string;
}

const DELIMITER_CANDIDATES = [",", "\t", ";", "|"];
const HEADER_HINT = /(seq|sequence|manufacturer|mfr|part|product|description|qty|quantity|model|item)/i;

export function detectDelimiter(line: string): string {
  let best = ",";
  let bestCount = -1;
  for (const delimiter of DELIMITER_CANDIDATES) {
    const pattern = delimiter === "\t" ? /\t/g : new RegExp(`\\${delimiter}`, "g");
    const count = (line.match(pattern) ?? []).length;
    if (count > bestCount) {
      best = delimiter;
      bestCount = count;
    }
  }
  return best;
}

function parseDelimited(text: string): string[][] {
  const cleaned = text.replace(/^﻿/, "");
  const firstLine = cleaned.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const delimiter = detectDelimiter(firstLine);

  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < cleaned.length; i++) {
    const c = cleaned[i];
    const n = cleaned[i + 1];

    if (c === '"') {
      if (inQuotes && n === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === delimiter && !inQuotes) {
      row.push(cur.trim());
      cur = "";
    } else if ((c === "\n" || c === "\r") && !inQuotes) {
      if (c === "\r" && n === "\n") i++;
      row.push(cur.trim());
      cur = "";
      if (row.some((v) => v.trim() !== "")) rows.push(row);
      row = [];
    } else {
      cur += c;
    }
  }
  row.push(cur.trim());
  if (row.some((v) => v.trim() !== "")) rows.push(row);

  return rows;
}

function cleanKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findVal(record: Record<string, string>, aliases: readonly string[]): string {
  const keys = Object.keys(record);

  for (const alias of aliases) {
    const target = cleanKey(alias);
    const exact = keys.find((key) => cleanKey(key) === target);
    if (exact) return record[exact];
  }
  for (const alias of aliases) {
    const target = cleanKey(alias);
    const hit = keys.find((key) => cleanKey(key).includes(target) || target.includes(cleanKey(key)));
    if (hit) return record[hit];
  }
  return "";
}

function firstNonEmpty(values: Array<string | undefined>): string {
  for (const value of values) {
    if (String(value ?? "").trim() !== "") return String(value);
  }
  return "";
}

export function parseCsvToImportRows(text: string): ParsedBomRow[] {
  const data = parseDelimited(text);
  if (!data.length) return [];

  let headers = data[0].map((h) => h.trim());
  let body = data.slice(1);

  const headerScore = headers.filter((h) => HEADER_HINT.test(h)).length;
  if (headerScore === 0) {
    body = data;
    headers = ["Sequence", "Manufacturer", "Product ID", "Description", "Qty", "Notes"];
  }

  return body
    .map((cols) => {
      const record: Record<string, string> = {};
      headers.forEach((h, i) => {
        record[h || `Column ${i + 1}`] = cols[i] ?? "";
      });

      const seq = firstNonEmpty([findVal(record, FIELD_ALIASES.seq), cols[0]]);
      const mfr = firstNonEmpty([findVal(record, FIELD_ALIASES.mfr), cols[1]]);
      const part = firstNonEmpty([findVal(record, FIELD_ALIASES.part), cols[2]]);
      const desc = firstNonEmpty([findVal(record, FIELD_ALIASES.desc), cols[3]]);
      const qtyRaw = firstNonEmpty([findVal(record, FIELD_ALIASES.qty), cols[4]]);
      const notes = findVal(record, FIELD_ALIASES.notes);
      const unitCostRaw = firstNonEmpty([findVal(record, FIELD_ALIASES.unitCost), cols[5]]);

      return {
        seq,
        mfr,
        part,
        desc,
        qty: qtyRaw.trim() === "" ? 1 : parseMoney(qtyRaw),
        unitCost: parseMoney(unitCostRaw),
        notes,
      };
    })
    .filter((row) => [row.seq, row.mfr, row.part, row.desc, row.notes].some((v) => v.trim() !== ""));
}
