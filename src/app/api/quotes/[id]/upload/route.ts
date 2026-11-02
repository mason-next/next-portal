import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import AdmZip from "adm-zip";
import { db } from "@/lib/db";
import { ForbiddenError, resolveSalesWriteScope } from "@/lib/access-control";
import { QUOTE_STORAGE_ROOT as STORAGE_ROOT, safeDownloadName } from "@/lib/quote-storage";
import { normalizeDownloadLabel, toDownloadLabelMap } from "@/modules/quote-portal/lib/download-labels";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const quote = await db.quotePresentation.findUnique({ where: { id } });
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Same rule as the server actions: reps manage only their own presentations.
  try {
    const scope = await resolveSalesWriteScope("salesQuotes");
    if (!scope.canSeeAll && quote.createdBy !== scope.userName) {
      throw new ForbiddenError("You can only manage your own presentations");
    }
  } catch (err) {
    if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
    throw err;
  }

  const formData = await request.formData();
  const zipFile = formData.get("zip_file");
  const pdfFile = formData.get("pdf_file");
  const pdfLabel = normalizeDownloadLabel(formData.get("pdf_label"));

  const destDir = path.join(STORAGE_ROOT, "quotes", id);
  const dlDir = path.join(destDir, "downloads");
  fs.mkdirSync(destDir, { recursive: true });
  fs.mkdirSync(dlDir, { recursive: true });

  let htmlFile = quote.htmlFile;

  // Handle ZIP upload
  if (zipFile && typeof zipFile !== "string") {
    const buffer = Buffer.from(await zipFile.arrayBuffer());

    if (buffer[0] !== 0x50 || buffer[1] !== 0x4b) {
      return NextResponse.json({ error: "ZIP file is not a valid ZIP archive" }, { status: 400 });
    }

    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    for (const entry of entries) {
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

    // Detect main HTML: prefer index.html, then presentation.html, then first .html
    const htmlFiles = entries
      .filter((e) => !e.isDirectory && e.entryName.endsWith(".html"))
      .map((e) => e.entryName);
    htmlFile =
      htmlFiles.find((f) => f.endsWith("index.html")) ??
      htmlFiles.find((f) => f.endsWith("presentation.html")) ??
      htmlFiles[0] ??
      "index.html";
  }

  // Handle PDF upload — save into downloads/ subfolder
  let pdfName: string | null = null;
  if (pdfFile && typeof pdfFile !== "string") {
    const originalName = (pdfFile as File).name ?? "proposal.pdf";
    // Sanitize filename
    const safeName = safeDownloadName(originalName);
    const pdfBuffer = Buffer.from(await pdfFile.arrayBuffer());
    fs.writeFileSync(path.join(dlDir, safeName), pdfBuffer);
    pdfName = safeName;
  }

  if (!zipFile && !pdfFile) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  await db.quotePresentation.update({
    where: { id },
    data: {
      storageKey: `quotes/${id}`,
      htmlFile,
      // A label sent with the PDF names its download button ("Download Scope of Work").
      ...(pdfName && pdfLabel
        ? { downloadLabels: { ...toDownloadLabelMap(quote.downloadLabels), [pdfName]: pdfLabel } }
        : {}),
    },
  });

  return NextResponse.json({ ok: true, htmlFile, pdfName });
}
