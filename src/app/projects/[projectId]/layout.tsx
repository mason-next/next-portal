"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProjectHeaderCard } from "@/components/shared/AppShell/ProjectHeaderCard";
import { EditProjectModal } from "@/components/shared/AppShell/EditProjectModal";
import { DeleteProjectModal } from "@/components/shared/AppShell/DeleteProjectModal";
import { getProject } from "@/lib/data/projects";
import { BomRowsProvider, useBomRowsContext } from "@/modules/bom-release/hooks/BomRowsContext";
import { bomCompletionPercent } from "@/modules/bom-release/lib/bom-progress";
import type { Project } from "@/types/project";

function ProjectStateBadge({ state }: { state: Project["state"] }) {
  const { rows, isLoading } = useBomRowsContext();
  const percent = !isLoading && rows && rows.length > 0 ? bomCompletionPercent(rows) : null;
  return (
    <span className="inline-flex rounded-full bg-secondary px-2 py-0.5 text-xs font-medium">
      {state}
      {percent !== null ? ` · ${percent}%` : ""}
    </span>
  );
}

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null | undefined>(undefined);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);

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
    <BomRowsProvider projectId={projectId}>
      <div className="space-y-6 p-8">
        <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link href="/projects" className="hover:text-foreground">
            Projects
          </Link>
          <span>/</span>
          <span className="text-foreground">{project.name}</span>
          <span>/</span>
          <span className="text-foreground">BOM Releases</span>
        </nav>
        <ProjectHeaderCard
          name={project.name}
          projectNumber={project.projectNumber}
          customerName={project.customerName}
          siteAddress={project.siteAddress}
          stateBadge={<ProjectStateBadge state={project.state} />}
          actions={
            <>
              <Button variant="outline" onClick={() => setShowEdit(true)}>
                Edit
              </Button>
              <Button variant="destructive" onClick={() => setShowDelete(true)}>
                Delete
              </Button>
            </>
          }
        />
        {children}

        {showEdit ? (
          <EditProjectModal
            project={project}
            onClose={() => setShowEdit(false)}
            onSaved={(updated) => {
              setProject(updated);
              setShowEdit(false);
            }}
          />
        ) : null}

        {showDelete ? (
          <DeleteProjectModal
            project={project}
            onClose={() => setShowDelete(false)}
            onDeleted={() => router.push("/projects")}
          />
        ) : null}
      </div>
    </BomRowsProvider>
  );
}
