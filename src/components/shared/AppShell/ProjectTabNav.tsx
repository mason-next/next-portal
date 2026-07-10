"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PROJECT_SECTIONS } from "@/modules/project-command-center/lib/workflow-steps";

interface ProjectTabNavProps {
  projectId: string;
  /**
   * Set of section keys that have at least one active (non-excluded) step.
   * Null/undefined = still loading, show all tabs.
   * Phase tabs absent from this set are hidden.
   * Dashboard and Meeting Notes tabs are always shown.
   */
  activeSections?: Set<string> | null;
}

export function ProjectTabNav({ projectId, activeSections }: ProjectTabNavProps) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  const visibleSections = PROJECT_SECTIONS.filter(({ key }) => {
    if (key === "dashboard" || key === "meetingNotes") return true;
    if (!activeSections) return true; // loading — show all
    return activeSections.has(key);
  });

  return (
    <nav className="flex items-center gap-1 border-b overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
      {visibleSections.map(({ key, label, href }) => {
        const fullHref = `${base}${href}`;
        const active = href === "" ? pathname === base : pathname.startsWith(fullHref);
        return (
          <Link
            key={key}
            href={fullHref}
            className={cn(
              "border-b-2 border-transparent px-3 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground",
              active && "border-primary text-foreground"
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
