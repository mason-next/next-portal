import { NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/server";
import { db } from "@/lib/db";

// ─── Project type normalization ───────────────────────────────────────────────

const PROJECT_TYPE_MAP: Record<string, string> = {
  "audio visual": "Audio / Visual",
  "audio/visual": "Audio / Visual",
  "audio / visual": "Audio / Visual",
  "a/v": "Audio / Visual",
  "av": "Audio / Visual",
  "structured cabling": "Structured Cabling",
  "cabling": "Structured Cabling",
  "security": "Security",
  "box sale": "Box Sale",
};

function normalizeProjectType(raw: string): string | null {
  return PROJECT_TYPE_MAP[raw.trim().toLowerCase()] ?? null;
}

// Extracts the leading project number from names like "17109: Project Name".
function extractProjectNumber(name: string): string | null {
  const m = name.match(/^(\d+)\s*:/);
  return m ? m[1] : null;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface ImportRow {
  [csvHeader: string]: string;
}

export interface RowResult {
  rowIndex: number;
  status: "created" | "duplicate" | "error";
  projectName?: string;
  projectNumber?: string;
  reason?: string;
}

export interface ImportResponse {
  created: number;
  skippedDuplicates: number;
  failed: number;
  results: RowResult[];
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(request: Request): Promise<NextResponse> {
  // TODO: Extend to module-level permission check once permissions are finalized.
  const session = await getServerSession();
  if (!session || !session.roleTypes.includes("Administrator")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { rows: ImportRow[]; mapping: Record<string, string> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { rows, mapping } = body;
  if (!Array.isArray(rows) || !mapping || typeof mapping !== "object") {
    return NextResponse.json({ error: "Invalid request shape" }, { status: 400 });
  }
  if (rows.length > 500) {
    return NextResponse.json({ error: "Maximum 500 rows per import" }, { status: 400 });
  }

  // Pre-load all existing project numbers and name+customer pairs for O(1) duplicate checks.
  const existing = (await db.project.findMany({
    select: { projectNumber: true, name: true, customerName: true },
  })) as Array<{ projectNumber: string; name: string; customerName: string }>;
  const seenNumbers = new Set(existing.map((p) => p.projectNumber.toLowerCase()));
  const seenNameCustomer = new Set(
    existing.map((p) => `${p.name.toLowerCase()}|||${p.customerName.toLowerCase()}`)
  );

  // Mirrors createProject: load default PM assignments from app_settings.
  let defaultSeniorInsideId: string | null = null;
  let defaultInsidePMId: string | null = null;
  try {
    const [seniorSetting, insideSetting] = await Promise.all([
      db.appSetting.findUnique({ where: { key: "default_senior_inside_id" } }),
      db.appSetting.findUnique({ where: { key: "default_inside_pm_id" } }),
    ]);
    const seniorId = seniorSetting?.value as string | null;
    const insideId = insideSetting?.value as string | null;
    const [seniorExists, insideExists] = await Promise.all([
      seniorId ? db.user.findUnique({ where: { id: seniorId }, select: { id: true } }) : null,
      insideId ? db.user.findUnique({ where: { id: insideId }, select: { id: true } }) : null,
    ]);
    if (seniorExists) defaultSeniorInsideId = seniorId;
    if (insideExists) defaultInsidePMId = insideId;
  } catch {
    // Proceed without defaults — app_settings unavailable.
  }

  const results: RowResult[] = [];
  let created = 0;
  let skippedDuplicates = 0;
  let failed = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowIndex = i + 1;

    // Apply mapping to extract typed field values.
    let name = "";
    let customerName = "";
    let projectNumberMapped = "";
    let siteAddress = "";
    let coordinatorGroup = "";
    let rawType = "";

    for (const [csvHeader, dbField] of Object.entries(mapping)) {
      if (dbField === "ignore") continue;
      const val = (row[csvHeader] ?? "").trim();
      if (dbField === "name") name = val;
      else if (dbField === "customerName") customerName = val;
      else if (dbField === "projectNumber") projectNumberMapped = val;
      else if (dbField === "siteAddress") siteAddress = val;
      else if (dbField === "coordinatorGroup") coordinatorGroup = val;
      else if (dbField === "projectTypes") rawType = val;
    }

    // Skip rows where all mapped values are blank.
    if (!name && !customerName && !rawType) continue;

    // Required field validation.
    if (!name) {
      results.push({ rowIndex, status: "error", reason: "Missing required field: Project Name" });
      failed++;
      continue;
    }
    if (!customerName) {
      results.push({ rowIndex, status: "error", projectName: name, reason: "Missing required field: Company Name" });
      failed++;
      continue;
    }

    // Resolve project number: explicit mapping → extracted from name → generated fallback.
    let projectNumber = projectNumberMapped;
    if (!projectNumber) {
      projectNumber = extractProjectNumber(name) ?? `IMP-${Date.now()}-${rowIndex}`;
    }

    // Type validation — fail the row if a type value is provided but unrecognized.
    let projectTypes: string[] = [];
    if (rawType) {
      const normalized = normalizeProjectType(rawType);
      if (!normalized) {
        results.push({
          rowIndex,
          status: "error",
          projectName: name,
          reason: `Unknown project type "${rawType}". Valid types: Box Sale, Structured Cabling, Security, Audio / Visual`,
        });
        failed++;
        continue;
      }
      projectTypes = [normalized];
    }

    // Duplicate check: project number (case-insensitive).
    if (seenNumbers.has(projectNumber.toLowerCase())) {
      results.push({
        rowIndex,
        status: "duplicate",
        projectName: name,
        projectNumber,
        reason: `Project number "${projectNumber}" already exists`,
      });
      skippedDuplicates++;
      continue;
    }

    // Duplicate check: name + customer combination.
    const nameCustomerKey = `${name.toLowerCase()}|||${customerName.toLowerCase()}`;
    if (seenNameCustomer.has(nameCustomerKey)) {
      results.push({
        rowIndex,
        status: "duplicate",
        projectName: name,
        projectNumber,
        reason: `"${name}" for "${customerName}" already exists`,
      });
      skippedDuplicates++;
      continue;
    }

    try {
      await db.project.create({
        data: {
          id: crypto.randomUUID(),
          name,
          projectNumber,
          customerName,
          siteAddress: siteAddress || "",
          coordinatorGroup: coordinatorGroup || "Project Coordination Team",
          contractValue: 0,
          grossProfit: 0,
          seniorInsideId: defaultSeniorInsideId,
          insidePMId: defaultInsidePMId,
          projectTypes,
        },
      });

      // Register in memory so later rows in the same CSV are caught as intra-batch duplicates.
      seenNumbers.add(projectNumber.toLowerCase());
      seenNameCustomer.add(nameCustomerKey);

      results.push({ rowIndex, status: "created", projectName: name, projectNumber });
      created++;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      const isDupe =
        msg.toLowerCase().includes("unique constraint") || msg.toLowerCase().includes("unique");
      results.push({
        rowIndex,
        status: isDupe ? "duplicate" : "error",
        projectName: name,
        projectNumber,
        reason: isDupe
          ? `Conflict on project number "${projectNumber}"`
          : `Database error: ${msg}`,
      });
      if (isDupe) skippedDuplicates++;
      else failed++;
    }
  }

  const response: ImportResponse = { created, skippedDuplicates, failed, results };
  return NextResponse.json(response);
}
