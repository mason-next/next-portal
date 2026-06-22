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

function lastAutoTableFinalY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;
}

function rowSnapshotTotal(row: BomRowSnapshot): number {
  return Number(row.qty) * Number(row.unitCost);
}

export function buildReleasePdf(details: ReleasePdfDetails, rows: BomRowSnapshot[]): jsPDF {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageWidth = doc.internal.pageSize.getWidth();

  doc.setFillColor(15, 23, 42);
  doc.rect(0, 0, pageWidth, 56, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.text("NEXT PORTAL", pageWidth / 2, 34, { align: "center" });

  doc.setTextColor(20, 20, 20);
  doc.setFontSize(14);
  doc.text(`Equipment ${details.releaseNumber}`, 40, 86);

  autoTable(doc, {
    startY: 100,
    theme: "plain",
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 110 } },
    body: [
      ["Project", `${details.projectNumber} - ${details.projectName}`],
      ["Site Address", details.siteAddress || "—"],
      ["Release", details.releaseNumber],
      ["Shipping Type", details.shippingType],
      ["Ship To", details.shipTo],
      ["Recipients", details.recipients],
      ["Release Date", formatDate(details.generatedAt)],
      ["Requested By", details.generatedBy],
    ],
  });

  const itemRows = rows.map((row) => [
    row.seq,
    row.qty,
    row.mfr,
    row.part,
    row.desc,
    formatMoney(rowSnapshotTotal(row)),
  ]);
  const total = rows.reduce((sum, row) => sum + rowSnapshotTotal(row), 0);

  autoTable(doc, {
    startY: lastAutoTableFinalY(doc) + 16,
    head: [["Seq", "Qty", "Manufacturer", "Part #", "Description", "Total Cost"]],
    body: itemRows,
    foot: [["", "", "", "", "Release Total", formatMoney(total)]],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [248, 250, 252], textColor: [51, 65, 85] },
    footStyles: { fillColor: [248, 250, 252], textColor: [20, 20, 20], fontStyle: "bold" },
    columnStyles: { 5: { halign: "right" } },
  });

  if (details.notes) {
    const notesY = lastAutoTableFinalY(doc) + 24;
    doc.setFontSize(10);
    doc.text(doc.splitTextToSize(`Notes: ${details.notes}`, pageWidth - 80), 40, notesY);
  }

  return doc;
}

export function releasePdfFilename(details: ReleasePdfDetails): string {
  const base = `${details.projectNumber || "Project"}-${details.releaseNumber}`.replace(/\s+/g, "-");
  return `${base}.pdf`;
}
