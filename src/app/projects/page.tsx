"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { getProjects } from "@/lib/data/projects";
import { getBomRows } from "@/lib/data/bom-rows";
import { NewProjectModal } from "@/components/shared/AppShell/NewProjectModal";
import { bomCompletionPercent } from "@/modules/bom-release/lib/bom-progress";
import type { Project } from "@/types/project";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [showNewProject, setShowNewProject] = useState(false);

  useEffect(() => {
    getProjects().then(setProjects);
  }, []);

  useEffect(() => {
    if (!projects) return;
    let active = true;
    Promise.all(
      projects.map(async (project) => {
        const rows = await getBomRows(project.id);
        return [project.id, rows.length > 0 ? bomCompletionPercent(rows) : null] as const;
      })
    ).then((entries) => {
      if (active) {
        const withProgress = entries.filter(
          (entry): entry is readonly [string, number] => entry[1] !== null
        );
        setProgress(Object.fromEntries(withProgress));
      }
    });
    return () => {
      active = false;
    };
  }, [projects]);

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
        <Button onClick={() => setShowNewProject(true)}>New Project</Button>
      </div>

      {projects === null ? (
        <p className="text-sm text-muted-foreground">Loading projects…</p>
      ) : projects.length === 0 ? (
        <p className="text-sm text-muted-foreground">No projects yet.</p>
      ) : (
        <ul className="grid gap-3">
          {projects.map((project) => (
            <li key={project.id}>
              <Link
                href={`/projects/${project.id}/bom-releases`}
                className="flex items-center justify-between rounded-lg border bg-card p-5 transition-colors hover:bg-accent"
              >
                <div>
                  <div className="text-sm font-semibold">{project.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {project.projectNumber} · {project.customerName}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">
                  {project.state}
                  {project.id in progress ? ` · ${progress[project.id]}%` : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {showNewProject ? (
        <NewProjectModal
          onClose={() => setShowNewProject(false)}
          onCreated={(project) => router.push(`/projects/${project.id}/bom-releases`)}
        />
      ) : null}
    </div>
  );
}
