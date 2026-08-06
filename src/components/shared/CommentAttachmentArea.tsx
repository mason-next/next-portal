"use client";

import { useRef, useState } from "react";
import { Paperclip, X, FileText, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CommentAttachment } from "@/types/attachments";

interface CommentAttachmentAreaProps {
  attachments: CommentAttachment[];
  onAdd: (a: CommentAttachment) => void;
  onRemove: (idx: number) => void;
  disabled?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CommentAttachmentArea({
  attachments,
  onAdd,
  onRemove,
  disabled,
}: CommentAttachmentAreaProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append("file", file);
        const res = await fetch("/api/comments/upload", { method: "POST", body: fd });
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          setError((body as { error?: string })?.error ?? `Upload failed (${res.status})`);
          return;
        }
        const attachment: CommentAttachment = await res.json();
        onAdd(attachment);
      }
    } catch {
      setError("Network error — upload failed.");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {attachments.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {attachments.map((a, i) => {
            const isImage = a.mimeType.startsWith("image/");
            const serveUrl = `/api/comments/serve/${encodeURIComponent(a.storagePath)}`;
            return isImage ? (
              <div key={i} className="relative rounded-md border border-border overflow-hidden">
                <img
                  src={serveUrl}
                  alt={a.fileName}
                  className="h-16 w-16 object-cover"
                />
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => onRemove(i)}
                    className="absolute top-0.5 right-0.5 flex items-center justify-center rounded-full bg-black/60 p-0.5 text-white hover:bg-black/80"
                    title="Remove attachment"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            ) : (
              <div
                key={i}
                className="flex items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 text-xs"
              >
                <FileText className="size-3 shrink-0 text-muted-foreground" />
                <span className="max-w-[160px] truncate font-medium">{a.fileName}</span>
                <span className="text-muted-foreground/60">{formatBytes(a.fileSize)}</span>
                {!disabled && (
                  <button
                    type="button"
                    onClick={() => onRemove(i)}
                    className="ml-0.5 text-muted-foreground hover:text-foreground"
                    title="Remove attachment"
                  >
                    <X className="size-3" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}

      <button
        type="button"
        disabled={disabled || uploading}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "mt-1.5 flex items-center gap-1.5 rounded text-xs text-muted-foreground transition-colors hover:text-foreground",
          (disabled || uploading) && "pointer-events-none opacity-50"
        )}
        title="Attach files"
      >
        {uploading ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : (
          <Paperclip className="size-3.5" />
        )}
        {uploading ? "Uploading…" : "Attach files"}
      </button>
    </div>
  );
}
