import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { db } from "@/lib/db";
import { QUOTE_STORAGE_ROOT, listQuoteDownloads } from "@/lib/quote-storage";
import { resolveDownloadLabel, toDownloadLabelMap } from "@/modules/quote-portal/lib/download-labels";

const STORAGE_ROOT = QUOTE_STORAGE_ROOT;

interface DownloadButton { file: string; label: string }

const DOWNLOAD_BAR = (slug: string, title: string, customer: string, downloads: DownloadButton[]) => `
<style>
#mq-dl-bar *{box-sizing:border-box;font-family:'Segoe UI',-apple-system,sans-serif}
#mq-dl-bar{position:fixed;bottom:0;left:0;right:0;z-index:9999;
  background:rgba(13,27,42,0.97);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);
  border-top:1px solid rgba(200,168,75,0.25);
  display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;
  padding:12px 32px;gap:10px 16px}
#mq-dl-bar .mq-title{color:rgba(255,255,255,0.7);font-size:14px;min-width:0}
#mq-dl-bar .mq-btns{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
#mq-dl-bar a{background:#c8a84b;color:#0d1b2a;font-weight:700;padding:9px 18px;border-radius:6px;
  text-decoration:none;font-size:14px;white-space:nowrap;transition:background 0.2s}
#mq-dl-bar a:hover,#mq-dl-bar a:focus-visible{background:#e2c46e}
#mq-dl-bar a.mq-secondary{background:transparent;color:#e2c46e;border:1px solid rgba(200,168,75,0.6)}
#mq-dl-bar a.mq-secondary:hover,#mq-dl-bar a.mq-secondary:focus-visible{background:rgba(200,168,75,0.15)}
.mq-dl-spacer{height:var(--mq-d)}
@media (max-width:720px){
  .mq-dl-spacer{height:var(--mq-m)}
  #mq-dl-bar{padding:10px 16px}
  #mq-dl-bar .mq-title{display:none}
  #mq-dl-bar .mq-btns{width:100%;justify-content:stretch}
  #mq-dl-bar a{flex:1 1 140px;text-align:center}
}
</style>
<div id="mq-dl-bar">
  <span class="mq-title">
    📄 <strong style="color:#fff">${escapeHtml(title)}</strong>
    <span style="color:rgba(255,255,255,0.4);margin:0 8px">—</span>
    <span style="color:rgba(200,168,75,0.9)">${escapeHtml(customer)}</span>
  </span>
  <span class="mq-btns">
    ${downloads
      .map(
        (d, i) => `<a href="/q/${slug}/download/${encodeURIComponent(d.file)}"${i > 0 ? ' class="mq-secondary"' : ""}>⬇ Download ${escapeHtml(d.label)}</a>`
      )
      .join("\n    ")}
  </span>
</div>
<div class="mq-dl-spacer" style="--mq-d:${downloads.length > 2 ? 112 : 66}px;--mq-m:${downloads.length * 50 + 24}px"></div>
`;

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function unavailablePage(heading: string, body: string): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Presentation Unavailable</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;
         background:linear-gradient(135deg,#0d1b2a 0%,#1a2d42 60%,#0a1520 100%);
         font-family:'Segoe UI',-apple-system,BlinkMacSystemFont,sans-serif;color:#fff;padding:24px}
    .card{background:rgba(255,255,255,0.04);border:1px solid rgba(200,168,75,0.2);
          border-radius:16px;padding:48px 40px;max-width:420px;width:100%;text-align:center;
          box-shadow:0 24px 48px rgba(0,0,0,.4)}
    h1{font-size:20px;font-weight:700;color:#c8a84b;margin:16px 0 12px}
    p{font-size:14px;color:#a8b8cc;line-height:1.6}
  </style>
</head>
<body>
  <div class="card">
    <div style="font-size:40px">🔒</div>
    <h1>${escapeHtml(heading)}</h1>
    <p>${escapeHtml(body)}</p>
  </div>
</body>
</html>`;
  return new NextResponse(html, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" },
  });
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;

  const quote = await db.quotePresentation.findUnique({
    where: { slug },
    select: { id: true, isActive: true, htmlFile: true, storageKey: true, title: true, customer: true, downloadLabels: true },
  });

  if (!quote || !quote.isActive) {
    return unavailablePage(
      "Not Available",
      "This proposal link has expired or been deactivated. Contact your Mason Technologies representative for assistance."
    );
  }

  if (!quote.storageKey) {
    return unavailablePage(
      "Presentation Coming Soon",
      "Your proposal is being prepared. Please check back shortly or contact your Mason Technologies representative."
    );
  }

  const quoteDir = path.join(STORAGE_ROOT, "quotes", quote.id);
  const htmlFileName = quote.htmlFile ?? "index.html";
  const absPath = path.join(quoteDir, htmlFileName);

  if (!fs.existsSync(absPath)) {
    return unavailablePage(
      "Presentation Temporarily Unavailable",
      "We're experiencing a technical issue retrieving your presentation. Please contact your Mason Technologies representative and we'll get this resolved right away."
    );
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

  // One download button per PDF, labeled from the admin page ("Download Scope of Work").
  const labels = toDownloadLabelMap(quote.downloadLabels);
  const downloads = listQuoteDownloads(quote.id).map((d, i) => ({
    file: d.file,
    label: resolveDownloadLabel(labels, d.file, i),
  }));

  if (downloads.length > 0) {
    const bar = DOWNLOAD_BAR(slug, quote.title, quote.customer, downloads);
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
