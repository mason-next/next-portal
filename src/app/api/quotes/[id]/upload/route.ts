import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import AdmZip from "adm-zip";
import { db } from "@/lib/db";

const STORAGE_ROOT = process.env.FILE_STORAGE_ROOT ?? path.join(process.cwd(), ".local-uploads");

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const quote = await db.quotePresentation.findUnique({ where: { id } });
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Validate it's a ZIP
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
    return NextResponse.json({ error: "File must be a ZIP archive" }, { status: 400 });
  }

  // Extract to STORAGE_ROOT/quotes/<id>/
  const destDir = path.join(STORAGE_ROOT, "quotes", id);
  fs.mkdirSync(destDir, { recursive: true });

  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  for (const entry of entries) {
    // Security: reject any paths that try to escape the dest dir
    const entryPath = path.join(destDir, entry.entryName);
    if (!entryPath.startsWith(destDir + path.sep) && entryPath !== destDir) {
      return NextResponse.json({ error: "Invalid ZIP: path traversal detected" }, { status: 400 });
    }
    if (entry.isDirectory) {
      fs.mkdirSync(entryPath, { recursive: true });
    } else {
      fs.mkdirSync(path.dirname(entryPath), { recursive: true });
      fs.writeFileSync(entryPath, entry.getData());
    }
  }

  // Detect the main HTML file: prefer index.html, then presentation.html, then first .html
  const htmlFiles = entries
    .filter((e) => !e.isDirectory && e.entryName.endsWith(".html"))
    .map((e) => e.entryName);
  const htmlFile =
    htmlFiles.find((f) => f.endsWith("index.html")) ??
    htmlFiles.find((f) => f.endsWith("presentation.html")) ??
    htmlFiles[0] ??
    "index.html";

  await db.quotePresentation.update({
    where: { id },
    data: {
      storageKey: `quotes/${id}`,
      htmlFile,
    },
  });

  return NextResponse.json({ ok: true, htmlFile });
}
