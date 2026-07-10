"use client";

import { useState } from "react";
import { Eye, X } from "lucide-react";
import { useViewAs } from "@/lib/view-as/ViewAsContext";
import { ViewAsSelector } from "./ViewAsSelector";

export function ViewAsBanner() {
  const { viewAsUser, isViewAsMode, exitViewAs } = useViewAs();
  const [showSelector, setShowSelector] = useState(false);
  const [exiting, setExiting] = useState(false);

  if (!isViewAsMode || !viewAsUser) return null;

  async function handleExit() {
    setExiting(true);
    try {
      await exitViewAs();
    } finally {
      setExiting(false);
    }
  }

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between gap-4 bg-amber-400 px-4 py-2 text-amber-950 dark:bg-amber-500 dark:text-amber-950">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Eye className="size-4 shrink-0" />
          <span>
            Viewing as <strong>{viewAsUser.name}</strong> — Read-only preview
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setShowSelector(true)}
            className="rounded-md px-2.5 py-1 text-xs font-semibold hover:bg-amber-500/40 transition-colors"
          >
            Change User
          </button>
          <button
            type="button"
            onClick={handleExit}
            disabled={exiting}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-semibold hover:bg-amber-500/40 transition-colors disabled:opacity-60"
          >
            <X className="size-3.5" />
            {exiting ? "Exiting…" : "Exit View As"}
          </button>
        </div>
      </div>

      {showSelector && <ViewAsSelector onClose={() => setShowSelector(false)} />}
    </>
  );
}
