import type { BomRowSnapshot } from "@/types/bom";
import { formatDate, formatMoney } from "@/lib/utils";

export interface EmailDetails {
  releaseNumber: string;
  projectName: string;
  projectNumber: string;
  shippingType: string;
  shipTo: string;
  recipients: string;
  notes: string;
  generatedAt: string;
  generatedBy: string;
}

function rowSnapshotTotal(row: BomRowSnapshot): number {
  return Number(row.qty) * Number(row.unitCost);
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c] as string
  );
}

export function buildEmailSubject(details: EmailDetails): string {
  return `Equipment ${details.releaseNumber} - Project ${details.projectNumber} - ${details.projectName}`;
}

export function buildEmailPlainText(details: EmailDetails, rows: BomRowSnapshot[]): string {
  const lines = rows
    .map(
      (row) =>
        `${row.seq} | ${row.qty} | ${row.mfr} | ${row.part} | ${row.desc} | ${formatMoney(rowSnapshotTotal(row))}`
    )
    .join("\n");

  return `Subject: ${buildEmailSubject(details)}

Hello Team,

Please proceed with Equipment ${details.releaseNumber} for Project ${details.projectNumber} - ${details.projectName}.

Shipping Type: ${details.shippingType}
Ship To: ${details.shipTo}
Recipients: ${details.recipients}

The following items have been approved for procurement:

Seq | Qty | Manufacturer | Part Number | Description | Total Cost
${lines}

Release Date: ${formatDate(details.generatedAt)}
Requested By: ${details.generatedBy}

Notes: ${details.notes}

Thank you.`;
}

export function buildEmailHtml(details: EmailDetails, rows: BomRowSnapshot[]): string {
  const cell = "border:1px solid #e1e7ef;padding:8px 9px";
  const labelCell = `${cell};background:#f8fafc;font-weight:800`;

  const rowsHtml = rows
    .map(
      (row) =>
        `<tr><td style="${cell}">${escapeHtml(row.seq)}</td><td style="${cell}">${escapeHtml(row.qty)}</td><td style="${cell}">${escapeHtml(row.mfr)}</td><td style="${cell}">${escapeHtml(row.part)}</td><td style="${cell}">${escapeHtml(row.desc)}</td><td style="${cell};text-align:right">${formatMoney(rowSnapshotTotal(row))}</td></tr>`
    )
    .join("");
  const total = rows.reduce((sum, row) => sum + rowSnapshotTotal(row), 0);

  return `<div style="border:1px solid #e6ebf1;border-radius:10px;overflow:hidden;background:#fff;font-family:Inter,ui-sans-serif,system-ui">
<div style="background:linear-gradient(135deg,#0f172a,#1e3a5f);color:#fff;padding:18px 22px;text-align:center;font-weight:800;letter-spacing:.18em;font-size:22px">NEXT PORTAL</div>
<div style="padding:20px 22px;color:#243041">
<p>Hello Team,</p>
<p><b>${escapeHtml(details.releaseNumber)}</b> has been created and is ready for procurement.</p>
<table style="width:100%;border-collapse:collapse;margin:12px 0 18px;font-size:12px">
<tr><td style="${labelCell};width:150px">Project</td><td style="${cell}">${escapeHtml(details.projectNumber)} - ${escapeHtml(details.projectName)}</td></tr>
<tr><td style="${labelCell}">Release</td><td style="${cell}">${escapeHtml(details.releaseNumber)}</td></tr>
<tr><td style="${labelCell}">Shipping Type</td><td style="${cell}">${escapeHtml(details.shippingType)}</td></tr>
<tr><td style="${labelCell}">Ship To</td><td style="${cell}">${escapeHtml(details.shipTo)}</td></tr>
<tr><td style="${labelCell}">Release Date</td><td style="${cell}">${escapeHtml(formatDate(details.generatedAt))}</td></tr>
<tr><td style="${labelCell}">Requested By</td><td style="${cell}">${escapeHtml(details.generatedBy)}</td></tr>
</table>
<p>The following items are included in this release:</p>
<table style="width:100%;border-collapse:collapse;font-size:12px;margin:12px 0 14px">
<thead><tr><th style="${labelCell}">Seq</th><th style="${labelCell}">Qty</th><th style="${labelCell}">Manufacturer</th><th style="${labelCell}">Part #</th><th style="${labelCell}">Description</th><th style="${labelCell}">Total Cost</th></tr></thead>
<tbody>${rowsHtml}</tbody>
<tfoot><tr><td colspan="5" style="${labelCell}">Release Total</td><td style="${labelCell};text-align:right">${formatMoney(total)}</td></tr></tfoot>
</table>
${details.notes ? `<p><b>Notes:</b> ${escapeHtml(details.notes)}</p>` : ""}
<p>Please review and proceed with ordering these items.</p>
<p><b>Thank you,</b><br>NEXT Portal</p>
</div>
</div>`;
}
