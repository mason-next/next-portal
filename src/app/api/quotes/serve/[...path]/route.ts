import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { db } from "@/lib/db";

const STORAGE_ROOT = process.env.FILE_STORAGE_ROOT ?? path.join(process.cwd(), ".local-uploads");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".ico": "image/x-icon",
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  // path = ["quotes", "<id>", ...rest]
  const segments = (await params).path;
  if (segments.length < 2) return NextResponse.json({ error: "Invalid path" }, { status: 400 });

  const quoteId = segments[1];

  // Verify the quote exists and has been uploaded
  const quote = await db.quotePresentation.findUnique({
    where: { id: quoteId },
    select: { storageKey: true, isActive: true },
  });
  if (!quote?.storageKey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Resolve file path (segments after quoteId, or the htmlFile default)
  const relPath = segments.slice(2).length > 0 ? path.join(...segments.slice(2)) : quote.storageKey.split("/").pop() ?? "";
  const absPath = path.join(STORAGE_ROOT, "quotes", quoteId, relPath || "index.html");

  // Security: must stay within the quote directory
  const quoteDir = path.join(STORAGE_ROOT, "quotes", quoteId);
  if (!absPath.startsWith(quoteDir + path.sep) && absPath !== quoteDir) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!fs.existsSync(absPath)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ext = path.extname(absPath).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";
  const content = fs.readFileSync(absPath);

  return new NextResponse(content, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
