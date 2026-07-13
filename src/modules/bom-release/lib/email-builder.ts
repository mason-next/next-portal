import type { BomRowSnapshot } from "@/types/bom";
import { formatDate, formatMoney } from "@/lib/utils";

export interface EmailDetails {
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
  return `Equipment ${details.releaseNumber} | ${details.projectNumber} - ${details.projectName}`;
}

export function buildEmailPlainText(details: EmailDetails, rows: BomRowSnapshot[]): string {
  const total = rows.reduce((sum, row) => sum + rowSnapshotTotal(row), 0);

  return `Subject: ${buildEmailSubject(details)}

Hello Team,

Please proceed with Equipment ${details.releaseNumber} for Project ${details.projectNumber} - ${details.projectName}.

Site Address: ${details.siteAddress}
Shipping Type: ${details.shippingType}
Ship To: ${details.shipTo}
Recipients: ${details.recipients}

This release includes ${rows.length} item(s) totaling ${formatMoney(total)}. See the attached release PDF for the full itemized list.

Release Date: ${formatDate(details.generatedAt)}
Requested By: ${details.generatedBy}

Notes: ${details.notes}

Thank you.`;
}

export function buildEmailHtml(details: EmailDetails, rows: BomRowSnapshot[]): string {
  const cell = "border:1px solid #e1e7ef;padding:8px 9px";
  const labelCell = `${cell};background:#f8fafc;font-weight:800`;
  const total = rows.reduce((sum, row) => sum + rowSnapshotTotal(row), 0);

  return `<div style="border:1px solid #e6ebf1;border-radius:10px;overflow:hidden;background:#fff;font-family:Inter,ui-sans-serif,system-ui">
<div style="padding:20px 22px;color:#243041">
<p>Hello Team,</p>
<br/><p><b>${escapeHtml(details.releaseNumber)}</b> has been created and is ready for procurement.</p>
<br/><table style="width:100%;border-collapse:collapse;margin:12px 0 18px;font-size:12px">
<tr><td style="${labelCell};width:150px">Project</td><td style="${cell}">${escapeHtml(details.projectNumber)} - ${escapeHtml(details.projectName)}</td></tr>
<tr><td style="${labelCell}">Site Address</td><td style="${cell}">${details.siteAddress ? `<a href="https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(details.siteAddress)}" style="color:#2563eb;text-decoration:underline">${escapeHtml(details.siteAddress)}</a>` : "—"}</td></tr>
<tr><td style="${labelCell}">Release</td><td style="${cell}">${escapeHtml(details.releaseNumber)}</td></tr>
<tr><td style="${labelCell}">Shipping Type</td><td style="${cell}">${escapeHtml(details.shippingType)}</td></tr>
<tr><td style="${labelCell}">Ship To</td><td style="${cell}">${escapeHtml(details.shipTo)}</td></tr>
<tr><td style="${labelCell}">Release Date</td><td style="${cell}">${escapeHtml(formatDate(details.generatedAt))}</td></tr>
<tr><td style="${labelCell}">Requested By</td><td style="${cell}">${escapeHtml(details.generatedBy)}</td></tr>
</table>
<br/><p>This release includes <b>${rows.length}</b> item(s) totaling <b>${formatMoney(total)}</b>. See the attached release PDF for the full itemized list and record-keeping copy.</p>
<br/>${details.notes ? `<p><b>Notes:</b> ${escapeHtml(details.notes)}</p>` : ""} Please review and proceed with ordering these items.</p>
<br/><p><b>Thank you,</b></p>
</div>
</div>`;
}
