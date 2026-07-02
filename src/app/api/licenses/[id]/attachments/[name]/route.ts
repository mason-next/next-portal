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

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  const { id, name } = await params;

  const license = await licDb().findUnique({
    where: { id },
    select: { id: true, attachments: true },
  });
  if (!license) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const attachments = parseAttachments(license.attachments);
  const attachment = attachments.find((a) => a.storedName === name);
  if (!attachment) return NextResponse.json({ error: "Attachment not found" }, { status: 404 });

  const filePath = path.join(STORAGE_ROOT, "licenses", id, name);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: "File not found on disk" }, { status: 404 });
  }

  const buffer = fs.readFileSync(filePath);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": attachment.mimeType,
      "Content-Disposition": `attachment; filename="${attachment.originalName}"`,
      "Content-Length": String(buffer.length),
    },
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; name: string }> }
) {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { id, name } = await params;

  const license = await licDb().findUnique({
    where: { id },
    select: { id: true, attachments: true },
  });
  if (!license) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const attachments = parseAttachments(license.attachments);
  const updated = attachments.filter((a) => a.storedName !== name);

  const filePath = path.join(STORAGE_ROOT, "licenses", id, name);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await licDb().update({
    where: { id },
    data: { attachments: updated },
  });

  return NextResponse.json({ ok: true });
}
