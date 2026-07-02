import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/access-control";
import type { LicenseAttachment } from "@/types/license";

const STORAGE_ROOT =
  process.env.FILE_STORAGE_ROOT ?? path.join(process.cwd(), ".local-uploads");

type PrismaLicense = { id: string; attachments: unknown };
type LicDb = {
  findUnique: (args: unknown) => Promise<PrismaLicense | null>;
  update: (args: unknown) => Promise<PrismaLicense>;
};

function licDb(): LicDb {
  return (db as unknown as { license: LicDb }).license;
}

function parseAttachments(raw: unknown): LicenseAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (a): a is LicenseAttachment =>
      a !== null && typeof a === "object" && typeof (a as Record<string, unknown>).storedName === "string"
  );
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id } = await params;

  const license = await licDb().findUnique({
    where: { id },
    select: { id: true, attachments: true },
  });
  if (!license) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const originalName = (file as File).name || "attachment";
  const safeName = path.basename(originalName).replace(/[^a-zA-Z0-9._-]/g, "_");
  const storedName = `${Date.now()}_${safeName}`;
  const mimeType = (file as File).type || "application/octet-stream";
  const buffer = Buffer.from(await (file as File).arrayBuffer());

  const destDir = path.join(STORAGE_ROOT, "licenses", id);
  fs.mkdirSync(destDir, { recursive: true });
  fs.writeFileSync(path.join(destDir, storedName), buffer);

  const newAttachment: LicenseAttachment = {
    storedName,
    originalName,
    mimeType,
    size: buffer.length,
    uploadedAt: new Date().toISOString(),
  };

  const existing = parseAttachments(license.attachments);
  await licDb().update({
    where: { id },
    data: { attachments: [...existing, newAttachment] },
  });

  return NextResponse.json(newAttachment);
}
