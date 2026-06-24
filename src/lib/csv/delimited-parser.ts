const DELIMITER_CANDIDATES = [",", "\t", ";", "|"];

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

// Quote-aware delimited-text tokenizer shared by every CSV-importing module — auto-detects
// the delimiter from the first non-blank line rather than assuming commas, since exports
// from different systems (spreadsheets, CRMs) vary.
export function parseDelimitedText(text: string): string[][] {
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

export function cleanKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

// Fuzzy-matches a header alias list against a record's actual keys — exact match first
// (after normalization), then substring fallback, so e.g. "Product ID" matches a header
// of "product_id" or "ID - Product".
export function findFieldValue(record: Record<string, string>, aliases: readonly string[]): string {
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

export function firstNonEmpty(values: Array<string | undefined>): string {
  for (const value of values) {
    if (String(value ?? "").trim() !== "") return String(value);
  }
  return "";
}
