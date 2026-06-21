"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DraggableRowProps {
  index: number;
  onReorder: (fromIndex: number, toIndex: number) => void;
  children: ReactNode;
}

export function DraggableRow({ index, onReorder, children }: DraggableRowProps) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <tr
      draggable
      className={cn(dragOver && "outline outline-2 -outline-offset-2 outline-primary/40")}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", String(index));
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const from = Number(e.dataTransfer.getData("text/plain"));
        if (!Number.isNaN(from) && from !== index) onReorder(from, index);
      }}
    >
      {children}
    </tr>
  );
}
