import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { db } from "@/lib/db";

const STORAGE_ROOT = process.env.FILE_STORAGE_ROOT ?? path.join(process.cwd(), ".local-uploads");

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; filename: string }> }
) {
  const { slug, filename } = await params;

  const quote = await db.quotePresentation.findUnique({
    where: { slug },
    select: { id: true, isActive: true, storageKey: true },
  });

  if (!quote?.storageKey) {
    return new NextResponse("Not found", { status: 404 });
  }

  const safeName = path.basename(filename);
  const dlDir = path.join(STORAGE_ROOT, "quotes", quote.id, "downloads");
  const absPath = path.join(dlDir, safeName);

  // Security: must stay within downloads dir
  if (!absPath.startsWith(dlDir + path.sep) && absPath !== dlDir) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!fs.existsSync(absPath)) {
    return new NextResponse("File not found", { status: 404 });
  }

  const content = fs.readFileSync(absPath);

  return new NextResponse(content, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "no-store",
    },
  });
}
