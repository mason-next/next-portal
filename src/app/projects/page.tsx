"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createProject, getProjects } from "@/lib/data/projects";
import type { Project } from "@/types/project";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects] = useState<Project[] | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    getProjects().then(setProjects);
  }, []);

  async function handleNewProject() {
    setCreating(true);
    const project = await createProject({
      name: "Untitled Project",
      projectNumber: "",
      customerName: "",
      coordinatorGroup: "Project Coordination Team",
    });
    router.push(`/projects/${project.id}/bom-releases`);
  }

  return (
    <div className="mx-auto max-w-5xl p-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
        <Button onClick={handleNewProject} disabled={creating}>
          {creating ? "Creating…" : "New Project"}
        </Button>
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
                className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-accent"
              >
                <div>
                  <div className="text-sm font-semibold">{project.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {project.projectNumber} · {project.customerName}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{project.state}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
