import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { db } from "@/lib/db";

const STORAGE_ROOT = process.env.FILE_STORAGE_ROOT ?? path.join(process.cwd(), ".local-uploads");

const DOWNLOAD_BAR = (slug: string, title: string, customer: string, pdfName: string) => `
<style>
#mq-dl-bar *{box-sizing:border-box;font-family:'Segoe UI',-apple-system,sans-serif}
</style>
<div id="mq-dl-bar" style="position:fixed;bottom:0;left:0;right:0;z-index:9999;
  background:rgba(13,27,42,0.97);backdrop-filter:blur(8px);
  border-top:1px solid rgba(200,168,75,0.25);
  display:flex;align-items:center;justify-content:space-between;
  padding:12px 32px;gap:16px">
  <span style="color:rgba(255,255,255,0.7);font-size:14px">
    📄 <strong style="color:#fff">${escapeHtml(title)}</strong>
    <span style="color:rgba(255,255,255,0.4);margin:0 8px">—</span>
    <span style="color:rgba(200,168,75,0.9)">${escapeHtml(customer)}</span>
  </span>
  <a href="/q/${slug}/download/${encodeURIComponent(pdfName)}"
     style="background:#c8a84b;color:#0d1b2a;font-weight:700;padding:9px 22px;
            border-radius:6px;text-decoration:none;font-size:14px;
            white-space:nowrap;flex-shrink:0;transition:background 0.2s"
     onmouseover="this.style.background='#e2c46e'"
     onmouseout="this.style.background='#c8a84b'">
    ⬇ Download Proposal
  </a>
</div>
<div style="height:58px"></div>
`;

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const quote = await db.quotePresentation.findUnique({
    where: { slug },
    select: { id: true, isActive: true, htmlFile: true, storageKey: true, title: true, customer: true },
  });

  if (!quote || !quote.isActive) {
    return new NextResponse("Presentation not found or no longer available.", { status: 404 });
  }

  if (!quote.storageKey) {
    return new NextResponse("No presentation file has been uploaded yet.", { status: 404 });
  }

  const quoteDir = path.join(STORAGE_ROOT, "quotes", quote.id);
  const htmlFileName = quote.htmlFile ?? "index.html";
  const absPath = path.join(quoteDir, htmlFileName);

  if (!fs.existsSync(absPath)) {
    return new NextResponse("Presentation file not found on server.", { status: 404 });
  }

  let html = fs.readFileSync(absPath, "utf-8");

  // Inject <base> tag so relative asset paths resolve to /q/<slug>/files/
  const baseTag = `<base href="/q/${slug}/files/">`;
  if (html.includes("<head>")) {
    html = html.replace("<head>", `<head>\n  ${baseTag}`);
  } else if (html.includes("<html>")) {
    html = html.replace("<html>", `<html>\n<head>${baseTag}</head>`);
  } else {
    html = `<head>${baseTag}</head>\n` + html;
  }

  // Check for downloadable PDF
  const dlDir = path.join(quoteDir, "downloads");
  const pdfs = fs.existsSync(dlDir)
    ? fs.readdirSync(dlDir).filter((f) => f.toLowerCase().endsWith(".pdf"))
    : [];

  if (pdfs.length > 0) {
    const bar = DOWNLOAD_BAR(slug, quote.title, quote.customer, pdfs[0]);
    html = html.includes("</body>")
      ? html.replace("</body>", `${bar}\n</body>`)
      : html + bar;
  }

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
