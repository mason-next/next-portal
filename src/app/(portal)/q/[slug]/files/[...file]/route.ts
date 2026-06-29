import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { db } from "@/lib/db";

const STORAGE_ROOT = process.env.FILE_STORAGE_ROOT ?? path.join(process.cwd(), ".local-uploads");

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
  ".otf": "font/otf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string; file: string[] }> }
) {
  const { slug, file } = await params;

  const quote = await db.quotePresentation.findUnique({
    where: { slug },
    select: { id: true, isActive: true, storageKey: true },
  });

  if (!quote?.storageKey) {
    return new NextResponse("Not found", { status: 404 });
  }

  const quoteDir = path.join(STORAGE_ROOT, "quotes", quote.id);
  const relPath = path.join(...file);
  const absPath = path.resolve(quoteDir, relPath);

  // Security: must stay within the quote directory
  if (!absPath.startsWith(path.resolve(quoteDir) + path.sep)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (!fs.existsSync(absPath)) {
    return new NextResponse("Not found", { status: 404 });
  }

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
