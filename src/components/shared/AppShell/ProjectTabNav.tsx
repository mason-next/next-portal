"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { PROJECT_SECTIONS } from "@/modules/project-command-center/lib/workflow-steps";

export function ProjectTabNav({ projectId }: { projectId: string }) {
  const pathname = usePathname();
  const base = `/projects/${projectId}`;

  return (
    <nav className="flex items-center gap-1 border-b">
      {PROJECT_SECTIONS.map(({ key, label, href }) => {
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
