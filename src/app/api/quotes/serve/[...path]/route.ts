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

  const quote = await db.quotePresentation.findUnique({
    where: { id: quoteId },
    select: { storageKey: true, isActive: true, htmlFile: true },
  });
  if (!quote?.storageKey) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const quoteDir = path.join(STORAGE_ROOT, "quotes", quoteId);
  const relPath = segments.slice(2).length > 0
    ? path.join(...segments.slice(2))
    : quote.htmlFile ?? "index.html";

  const absPath = path.join(quoteDir, relPath);

  // Security: must stay within the quote directory
  if (!absPath.startsWith(quoteDir + path.sep) && absPath !== quoteDir) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!fs.existsSync(absPath)) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const ext = path.extname(absPath).toLowerCase();
  const contentType = MIME[ext] ?? "application/octet-stream";
  let content = fs.readFileSync(absPath);

  // For the main HTML file, inject a download button if a PDF exists in downloads/
  if (ext === ".html" && segments.slice(2).length === 0) {
    const dlDir = path.join(quoteDir, "downloads");
    const pdfs = fs.existsSync(dlDir)
      ? fs.readdirSync(dlDir).filter((f) => f.endsWith(".pdf"))
      : [];

    if (pdfs.length > 0) {
      const pdfName = pdfs[0];
      const downloadUrl = `/api/quotes/serve/quotes/${quoteId}/downloads/${encodeURIComponent(pdfName)}`;
      const downloadBtn = `
<div style="position:fixed;bottom:24px;right:24px;z-index:9999">
  <a href="${downloadUrl}" download="${pdfName}"
     style="display:inline-flex;align-items:center;gap:8px;background:#1d4ed8;color:#fff;
            padding:10px 18px;border-radius:8px;font-family:sans-serif;font-size:14px;
            font-weight:600;text-decoration:none;box-shadow:0 4px 12px rgba(0,0,0,.25)">
    ↓ Download PDF
  </a>
</div>`;
      const html = content.toString("utf-8").replace("</body>", `${downloadBtn}\n</body>`);
      content = Buffer.from(html, "utf-8");
    }
  }

  return new NextResponse(content, {
    headers: {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=3600",
    },
  });
}
