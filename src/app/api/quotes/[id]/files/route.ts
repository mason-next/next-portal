import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { db } from "@/lib/db";

const STORAGE_ROOT = process.env.FILE_STORAGE_ROOT ?? path.join(process.cwd(), ".local-uploads");

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const quote = await db.quotePresentation.findUnique({ where: { id }, select: { id: true, storageKey: true, htmlFile: true } });
  if (!quote) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const quoteDir = path.join(STORAGE_ROOT, "quotes", id);
  const dlDir = path.join(quoteDir, "downloads");

  const hasZip = !!quote.storageKey && fs.existsSync(path.join(quoteDir, quote.htmlFile));

  let pdfFiles: string[] = [];
  if (fs.existsSync(dlDir)) {
    pdfFiles = fs.readdirSync(dlDir).filter((f) => f.endsWith(".pdf"));
  }

  return NextResponse.json({ hasZip, htmlFile: quote.htmlFile, pdfFiles });
}
