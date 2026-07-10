import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDate, formatMoney } from "@/lib/utils";
import type { BomRowSnapshot } from "@/types/bom";

export interface ReleasePdfDetails {
  releaseNumber: string;
  projectName: string;
  projectNumber: string;
  siteAddress: string;
  shippingType: string;
  shipTo: string;
  recipients: string;
  notes: string;
  generatedAt: string;
  generatedBy: string;
}

// ─── Colors — kept in sync with email engine render.ts ───────────────────────
const BANNER_BG: [number, number, number] = [37, 37, 37];    // #252525
const DIVIDER:   [number, number, number] = [189, 189, 189]; // #bdbdbd
const TEXT_DARK: [number, number, number] = [17, 17, 17];    // #111111
const TEXT_MID:  [number, number, number] = [51, 51, 51];    // #333333
const TEXT_MUTED:[number, number, number] = [102, 102, 102]; // #666666
const TEXT_FAINT:[number, number, number] = [153, 153, 153]; // #999999
const TABLE_FOOT:[number, number, number] = [248, 250, 252]; // #f8fafc

function lastTableY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function rowTotal(row: BomRowSnapshot): number {
  return Number(row.qty) * Number(row.unitCost);
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

export async function buildReleasePdf(details: ReleasePdfDetails, rows: BomRowSnapshot[]): Promise<jsPDF> {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 40;
  const contentW = pageW - margin * 2;

  // ─── Dark banner header (matching email template) ────────────────────────────
  const bannerH = 68;
  doc.setFillColor(...BANNER_BG);
  doc.rect(0, 0, pageW, bannerH, "F");

  try {
    const logo = await loadImage("/logo-white.png");
    const logoW = 140;
    const logoH = (logo.naturalHeight / logo.naturalWidth) * logoW;
    doc.addImage(logo, "PNG", (pageW - logoW) / 2, (bannerH - logoH) / 2, logoW, logoH);
  } catch {
    // Graceful text fallback when logo is unavailable (e.g. in test/build environments)
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Mason Technologies", pageW / 2, bannerH / 2 + 5, { align: "center" });
  }

  // ─── Release title ────────────────────────────────────────────────────────────
  let y = bannerH + 30;

  doc.setTextColor(...TEXT_DARK);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text(`Equipment ${details.releaseNumber}`, margin, y);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...TEXT_MUTED);
  doc.text(`${details.projectNumber} — ${details.projectName}`, pageW - margin, y, { align: "right" });

  y += 12;
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.5);
  doc.line(margin, y, pageW - margin, y);

  // ─── Details table ────────────────────────────────────────────────────────────
  autoTable(doc, {
    startY: y + 6,
    theme: "plain",
    styles: {
      fontSize: 9.5,
      cellPadding: { top: 4, bottom: 4, left: 0, right: 10 },
    },
    columnStyles: {
      0: { fontStyle: "bold", textColor: TEXT_MID, cellWidth: 110 },
      1: { textColor: TEXT_DARK },
    },
    body: [
      ["Site Address", details.siteAddress || "—"],
      ["Shipping Type", details.shippingType],
      ["Ship To", details.shipTo],
      ["Recipients", details.recipients],
      ["Release Date", formatDate(details.generatedAt)],
      ["Requested By", details.generatedBy],
    ],
    margin: { left: margin, right: margin },
  });

  // ─── Line items section heading ───────────────────────────────────────────────
  y = lastTableY(doc) + 22;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...TEXT_DARK);
  doc.text("Line Items", margin, y);

  y += 2;
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.5);
  doc.line(margin, y + 4, pageW - margin, y + 4);

  // ─── Line items table ─────────────────────────────────────────────────────────
  const itemRows = rows.map((row) => [
    row.seq,
    row.qty,
    row.mfr,
    row.part,
    row.desc,
    formatMoney(rowTotal(row)),
  ]);
  const total = rows.reduce((sum, row) => sum + rowTotal(row), 0);

  autoTable(doc, {
    startY: y + 10,
    head: [["Seq", "Qty", "Manufacturer", "Part #", "Description", "Total Cost"]],
    body: itemRows,
    foot: [["", "", "", "", "Release Total", formatMoney(total)]],
    styles: { fontSize: 9 },
    headStyles: {
      fillColor: BANNER_BG,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    footStyles: {
      fillColor: TABLE_FOOT,
      textColor: TEXT_DARK,
      fontStyle: "bold",
    },
    columnStyles: { 5: { halign: "right" } },
    margin: { left: margin, right: margin },
  });

  // ─── Notes ────────────────────────────────────────────────────────────────────
  if (details.notes) {
    y = lastTableY(doc) + 20;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(...TEXT_MID);
    doc.text("Notes", margin, y);

    y += 13;
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TEXT_MUTED);
    doc.text(doc.splitTextToSize(details.notes, contentW), margin, y);
  }

  // ─── Footer ───────────────────────────────────────────────────────────────────
  const footerY = pageH - 28;
  doc.setDrawColor(...DIVIDER);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 10, pageW - margin, footerY - 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...TEXT_FAINT);
  doc.text(
    `Generated by ${details.generatedBy} · ${formatDate(details.generatedAt)}`,
    margin,
    footerY
  );
  doc.text("CONFIDENTIAL", pageW - margin, footerY, { align: "right" });

  return doc;
}

export function releasePdfFilename(details: ReleasePdfDetails): string {
  const base = `${details.projectNumber || "Project"}-${details.releaseNumber}`.replace(/\s+/g, "-");
  return `${base}.pdf`;
}
