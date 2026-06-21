"use client";

import { use, useEffect, useState } from "react";
import { notFound } from "next/navigation";
import { ProjectHeaderCard } from "@/components/shared/AppShell/ProjectHeaderCard";
import { getProject } from "@/lib/data/projects";
import type { Project } from "@/types/project";

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const [project, setProject] = useState<Project | null | undefined>(undefined);

  useEffect(() => {
    let active = true;
    getProject(projectId).then((found) => {
      if (active) setProject(found);
    });
    return () => {
      active = false;
    };
  }, [projectId]);

  if (project === undefined) {
    return <div className="p-8 text-sm text-muted-foreground">Loading project…</div>;
  }

  if (project === null) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <ProjectHeaderCard
        name={project.name}
        projectNumber={project.projectNumber}
        customerName={project.customerName}
        stateBadge={
          <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
            {project.state}
          </span>
        }
      />
      {children}
    </div>
  );
}
