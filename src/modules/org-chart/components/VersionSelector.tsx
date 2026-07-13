"use client";

import { useState, useRef, useEffect, useTransition } from "react";
import { ChevronDown, Plus, Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { createOrgVersion } from "../lib/actions";
import type { OrgChartVersion, OrgChartVersionType } from "../lib/types";

const VERSION_META: Record<string, { label: string; classes: string }> = {
  current:    { label: "Current",  classes: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
  future:     { label: "Future",   classes: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400" },
  one_year:   { label: "1 Year",   classes: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-400" },
  three_year: { label: "3 Year",   classes: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400" },
  scenario:   { label: "Scenario", classes: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
};

function VersionBadge({ type }: { type: string }) {
  const meta = VERSION_META[type] ?? { label: type, classes: "bg-muted text-muted-foreground" };
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-xs font-semibold", meta.classes)}>
      {meta.label}
    </span>
  );
}

interface VersionSelectorProps {
  currentVersion: OrgChartVersion;
  versions: OrgChartVersion[];
}

export function VersionSelector({ currentVersion, versions }: VersionSelectorProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<OrgChartVersionType>("future");
  const [isPending, startTransition] = useTransition();
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function onMouseDown(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setShowCreate(false);
      }
    }
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  function selectVersion(id: string) {
    setOpen(false);
    router.push(`/org-chart?v=${id}`);
  }

  function handleCreate() {
    if (!newName.trim() || isPending) return;
    startTransition(async () => {
      const version = await createOrgVersion({ name: newName.trim(), versionType: newType });
      setShowCreate(false);
      setNewName("");
      setNewType("future");
      setOpen(false);
      router.push(`/org-chart?v=${version.id}`);
    });
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Trigger */}
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setShowCreate(false); }}
        className="flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-sm font-medium hover:bg-muted transition-colors"
      >
        <VersionBadge type={currentVersion.versionType} />
        <span className="max-w-[160px] truncate">{currentVersion.name}</span>
        <ChevronDown className={cn("size-3.5 text-muted-foreground flex-none transition-transform", open && "rotate-180")} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-72 rounded-lg border bg-popover shadow-lg">
          {/* Version list */}
          <div className="py-1">
            {versions.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => selectVersion(v.id)}
                className={cn(
                  "flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted/60 transition-colors text-left",
                  v.id === currentVersion.id && "bg-muted/40"
                )}
              >
                <VersionBadge type={v.versionType} />
                <span className="flex-1 truncate">{v.name}</span>
                {v.id === currentVersion.id && (
                  <Check className="size-3.5 text-primary flex-none" />
                )}
              </button>
            ))}
          </div>

          <div className="border-t" />

          {/* Create new version */}
          {!showCreate ? (
            <div className="py-1">
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                <Plus className="size-3.5" />
                New version…
              </button>
            </div>
          ) : (
            <div className="p-3 space-y-2">
              <input
                autoFocus
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreate();
                  if (e.key === "Escape") { setShowCreate(false); setNewName(""); }
                }}
                placeholder="Version name"
                className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as OrgChartVersionType)}
                className="w-full rounded-md border bg-background px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                <option value="future">Future</option>
                <option value="one_year">1 Year Plan</option>
                <option value="three_year">3 Year Plan</option>
                <option value="scenario">Scenario</option>
              </select>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={!newName.trim() || isPending}
                  className="flex-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
                >
                  {isPending ? "Creating…" : "Create"}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowCreate(false); setNewName(""); }}
                  className="rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
