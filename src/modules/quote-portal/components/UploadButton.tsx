"use client";

import { useRef, useState } from "react";

interface UploadButtonProps {
  quoteId: string;
  hasFile: boolean;
  onUploaded: () => void;
}

export function UploadButton({ quoteId, hasFile, onUploaded }: UploadButtonProps) {
  const zipRef = useRef<HTMLInputElement>(null);
  const pdfRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<"zip" | "pdf" | null>(null);
  const [error, setError] = useState("");

  async function upload(formData: FormData) {
    const res = await fetch(`/api/quotes/${quoteId}/upload`, { method: "POST", body: formData });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error((body as { error?: string }).error ?? "Upload failed");
    }
  }

  async function handleZip(file: File) {
    if (!file.name.endsWith(".zip")) { setError("Please select a .zip file."); return; }
    setUploading("zip"); setError("");
    try {
      const form = new FormData();
      form.append("zip_file", file);
      await upload(form);
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally { setUploading(null); }
  }

  async function handlePdf(file: File) {
    if (!file.name.endsWith(".pdf")) { setError("Please select a .pdf file."); return; }
    setUploading("pdf"); setError("");
    try {
      const form = new FormData();
      form.append("pdf_file", file);
      await upload(form);
      onUploaded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally { setUploading(null); }
  }

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => zipRef.current?.click()}
          disabled={uploading !== null}
          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
        >
          {uploading === "zip" ? "Uploading…" : hasFile ? "Replace ZIP" : "Upload ZIP"}
        </button>
        <span className="text-muted-foreground text-xs">·</span>
        <button
          type="button"
          onClick={() => pdfRef.current?.click()}
          disabled={uploading !== null}
          className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
        >
          {uploading === "pdf" ? "Uploading…" : "Upload PDF"}
        </button>
      </div>
      <input ref={zipRef} type="file" accept=".zip" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleZip(f); e.target.value = ""; }} />
      <input ref={pdfRef} type="file" accept=".pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePdf(f); e.target.value = ""; }} />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
