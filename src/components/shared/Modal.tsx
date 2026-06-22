"use client";

import { useEffect, useRef, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  /** Overrides the card's max-width, e.g. "max-w-3xl". Defaults to max-w-lg. */
  className?: string;
  children: ReactNode;
}

export function Modal({ open, onClose, className, children }: ModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  // Once set, the card is pinned at these viewport coordinates instead of centered —
  // lets a user drag a modal aside to see content underneath it.
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);
  const dragOffsetRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragOffsetRef.current) return;
      setPosition({ x: e.clientX - dragOffsetRef.current.x, y: e.clientY - dragOffsetRef.current.y });
    }
    function onMouseUp() {
      dragOffsetRef.current = null;
    }
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onMouseUp);
    return () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  function beginDrag(e: ReactMouseEvent) {
    const rect = cardRef.current?.getBoundingClientRect();
    if (!rect) return;
    dragOffsetRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-20 flex items-center justify-center bg-black/40 p-6 animate-in fade-in-0 duration-150"
      onClick={onClose}
    >
      <div
        ref={cardRef}
        style={position ? { position: "fixed", left: position.x, top: position.y, margin: 0 } : undefined}
        className={cn(
          "w-full max-w-lg rounded-xl border bg-card p-6 shadow-lg animate-in fade-in-0 zoom-in-95 duration-150",
          className
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <div onMouseDown={beginDrag} title="Drag to move" className="mb-3 flex h-3 cursor-move items-center justify-center">
          <span className="h-1 w-10 rounded-full bg-border" />
        </div>
        {children}
      </div>
    </div>
  );
}
