import path from "path";
import fs from "fs";

// On-disk layout for uploaded quote presentations:
//   <root>/quotes/<quoteId>/            unzipped presentation
//   <root>/quotes/<quoteId>/downloads/  customer-downloadable PDFs
export const QUOTE_STORAGE_ROOT = process.env.FILE_STORAGE_ROOT ?? path.join(process.cwd(), ".local-uploads");

export function quoteDir(quoteId: string): string {
  return path.join(QUOTE_STORAGE_ROOT, "quotes", quoteId);
}

export function quoteDownloadsDir(quoteId: string): string {
  return path.join(quoteDir(quoteId), "downloads");
}

/** Make an uploaded file name safe to store and to put in a URL. */
export function safeDownloadName(name: string): string {
  return path.basename(name).replace(/[^a-zA-Z0-9._-]/g, "_");
}

/** Resolve a download path, or null if the name would escape the downloads folder. */
export function resolveDownloadPath(quoteId: string, file: string): string | null {
  const dir = quoteDownloadsDir(quoteId);
  const abs = path.join(dir, path.basename(file));
  return abs.startsWith(dir + path.sep) ? abs : null;
}

export interface StoredDownload {
  file: string;
  size: number;
  uploadedAt: Date;
}

/** PDFs in the downloads folder, oldest upload first (the order buttons appear in). */
export function listQuoteDownloads(quoteId: string): StoredDownload[] {
  const dir = quoteDownloadsDir(quoteId);
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith(".pdf"))
    .map((file) => {
      const st = fs.statSync(path.join(dir, file));
      return { file, size: st.size, uploadedAt: st.mtime };
    })
    .sort((a, b) => a.uploadedAt.getTime() - b.uploadedAt.getTime() || a.file.localeCompare(b.file));
}
