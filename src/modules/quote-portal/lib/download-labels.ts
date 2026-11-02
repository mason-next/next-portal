// Labels for the download buttons on a customer quote presentation.
// Shared by the admin UI (dropdown) and the server (button rendering).

export const DOWNLOAD_LABEL_PRESETS = [
  "Proposal",
  "Quote",
  "Scope of Work",
  "Drawings",
  "Spec Sheets",
  "Schedule",
  "Service Agreement",
  "Change Order",
] as const;

export const MAX_DOWNLOAD_LABEL_LENGTH = 40;

export type DownloadLabelMap = Record<string, string>;

export interface QuoteDownload {
  file: string;
  label: string;
  size: number;
  uploadedAt: string;
}

/** Trim and cap a label; returns "" when nothing usable is left. */
export function normalizeDownloadLabel(label: unknown): string {
  if (typeof label !== "string") return "";
  return label.replace(/\s+/g, " ").trim().slice(0, MAX_DOWNLOAD_LABEL_LENGTH);
}

/** Coerce the stored JSON column into a clean filename → label map. */
export function toDownloadLabelMap(value: unknown): DownloadLabelMap {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: DownloadLabelMap = {};
  for (const [file, label] of Object.entries(value as Record<string, unknown>)) {
    const clean = normalizeDownloadLabel(label);
    if (clean) out[file] = clean;
  }
  return out;
}

/**
 * Label for a file. Unlabeled files keep the original behavior: the first one is the
 * "Proposal"; later ones fall back to "Document" so two buttons never read the same by accident.
 */
export function resolveDownloadLabel(labels: DownloadLabelMap, file: string, index: number): string {
  return labels[file] || (index === 0 ? "Proposal" : "Document");
}
