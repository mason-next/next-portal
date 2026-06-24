"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EquipmentImportDropzoneProps {
  onFileSelected: (file: File) => void;
  onUseSample: () => void;
  isParsing?: boolean;
}

export function EquipmentImportDropzone({ onFileSelected, onUseSample, isParsing }: EquipmentImportDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  return (
    <div
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() => setIsDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) onFileSelected(file);
      }}
      className={cn(
        "flex min-h-64 cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card p-10 text-center transition-colors",
        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/30"
      )}
    >
      <div className="text-lg font-semibold">Drop Equipment CSV anywhere</div>
      <p className="max-w-md text-sm text-muted-foreground">or click to upload.</p>
      <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
        <Button onClick={() => inputRef.current?.click()} disabled={isParsing}>
          {isParsing ? "Parsing…" : "Upload CSV"}
        </Button>
        <Button variant="outline" onClick={onUseSample} disabled={isParsing}>
          Use Sample Equipment List
        </Button>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) onFileSelected(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
