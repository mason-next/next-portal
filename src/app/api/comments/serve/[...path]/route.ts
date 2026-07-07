import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { getServerSession } from "@/lib/auth/server";

const STORAGE_ROOT =
  process.env.FILE_STORAGE_ROOT ?? path.join(process.cwd(), ".local-uploads");

const MIME_FALLBACKS: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  txt: "text/plain",
  csv: "text/csv",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  zip: "application/zip",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const session = await getServerSession();
  if (!session) return new NextResponse("Unauthorized", { status: 401 });

  const { path: segments } = await params;
  // Reconstruct the relative storagePath from URL segments and resolve to absolute.
  const relative = segments.join("/");
  const absPath = path.resolve(path.join(STORAGE_ROOT, "comments"), relative);
  // Path traversal guard: resolved path must stay inside the comments directory.
  const commentsRoot = path.resolve(path.join(STORAGE_ROOT, "comments"));
  if (!absPath.startsWith(commentsRoot + path.sep) && absPath !== commentsRoot) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (!fs.existsSync(absPath)) return new NextResponse("Not found", { status: 404 });

  const buffer = fs.readFileSync(absPath);
  const ext = path.extname(absPath).slice(1).toLowerCase();
  const contentType = MIME_FALLBACKS[ext] ?? "application/octet-stream";
  const fileName = path.basename(absPath);

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
