"use client";

import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface DraggableRowProps {
  rowId: string;
  onReorder: (fromId: string, toId: string) => void;
  children: ReactNode;
}

export function DraggableRow({ rowId, onReorder, children }: DraggableRowProps) {
  const [dragOver, setDragOver] = useState(false);

  return (
    <tr
      draggable
      className={cn(dragOver && "outline outline-2 -outline-offset-2 outline-primary/40")}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", rowId);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const fromId = e.dataTransfer.getData("text/plain");
        if (fromId && fromId !== rowId) onReorder(fromId, rowId);
      }}
    >
      {children}
    </tr>
  );
}
