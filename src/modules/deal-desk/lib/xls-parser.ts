import type { DealCategory, CategoryName } from "@/types/deal-desk";

export interface ParsedQuoteMeta {
  quoteName: string;
  quoteNumber: string;
  version: string;
  customer: string;
}

export interface ParsedQuoteFinancials {
  meta: ParsedQuoteMeta;
  categories: DealCategory[];
  rawLines: ParsedLine[];
}

export interface ParsedLine {
  description: string;
  extRevenue: number;
  extCost: number;
  category: CategoryName;
}

// ConnectWise Sell internal export column indices (row 4 = header)
const COL_QTY = 0;
const COL_PART = 1;
const COL_DESC = 3;
const COL_EXT_PRICE = 5;
const COL_EXT_COST = 11;

function detectCategory(partNumber: string, description: string): CategoryName {
  const part = String(partNumber).toLowerCase();
  const desc = String(description).toLowerCase();

  if (part.includes("labor") || desc.includes("labor") || desc.includes("installation & engineering")) return "Labor";
  if (part.includes("sla") || part.includes("tier") || desc.includes("service level") || desc.includes("managed service")) return "Service";
  if (
    part.includes("misc") ||
    part.includes("direct costs") ||
    desc.includes("miscellaneous") ||
    desc.includes("g&a") ||
    desc.includes("shipping") ||
    desc.includes("freight")
  ) return "G&A";
  return "Equipment";
}

function parseMoney(raw: unknown): number {
  if (typeof raw === "number") return raw;
  const str = String(raw ?? "").replace(/[$,\s]/g, "");
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseInternalXls(rows: any[][]): ParsedQuoteFinancials {
  const meta: ParsedQuoteMeta = {
    quoteName: String(rows[0]?.[2] ?? ""),
    quoteNumber: String(rows[1]?.[2] ?? ""),
    version: String(rows[2]?.[2] ?? ""),
    customer: String(rows[3]?.[2] ?? ""),
  };

  const lines: ParsedLine[] = [];

  // Data rows start after the header row (index 4)
  for (let i = 5; i < rows.length; i++) {
    const row = rows[i];
    if (!row) continue;

    const qty = row[COL_QTY];
    const part = String(row[COL_PART] ?? "");
    const desc = String(row[COL_DESC] ?? "");
    const extPrice = parseMoney(row[COL_EXT_PRICE]);
    const extCost = parseMoney(row[COL_EXT_COST]);

    // Skip empty/zero rows, section headers, and checklist items
    if (typeof qty !== "number" || qty === 0) continue;
    if (extPrice === 0 && extCost === 0) continue;
    if (part === "" && desc === "") continue;
    // Skip ConnectWise boilerplate checklist items
    if (part === "[    ]") continue;
    // Skip subtotal rows
    if (desc.toLowerCase().includes("subtotal")) continue;

    const category = detectCategory(part, desc);
    lines.push({
      description: desc,
      extRevenue: extPrice,
      extCost,
      category,
    });
  }

  // Aggregate into categories (all values in cents)
  const categoryMap = new Map<CategoryName, { revenueCents: number; costCents: number }>();

  for (const line of lines) {
    const existing = categoryMap.get(line.category) ?? { revenueCents: 0, costCents: 0 };
    categoryMap.set(line.category, {
      revenueCents: existing.revenueCents + Math.round(line.extRevenue * 100),
      costCents: existing.costCents + Math.round(line.extCost * 100),
    });
  }

  const categories: DealCategory[] = Array.from(categoryMap.entries()).map(([name, totals]) => ({
    name,
    revenueCents: totals.revenueCents,
    costCents: totals.costCents,
  }));

  return { meta, categories, rawLines: lines };
}

export async function parseConnectWiseXls(file: File): Promise<ParsedQuoteFinancials> {
  const { read, utils } = await import("xlsx");
  const buffer = await file.arrayBuffer();
  const workbook = read(buffer, { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows: any[][] = utils.sheet_to_json(sheet, { header: 1, defval: "" });
  return parseInternalXls(rows);
}
