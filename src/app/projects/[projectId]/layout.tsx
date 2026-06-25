"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ProjectHeaderCard } from "@/components/shared/AppShell/ProjectHeaderCard";
import { ProjectTabNav } from "@/components/shared/AppShell/ProjectTabNav";
import { EditProjectModal } from "@/components/shared/AppShell/EditProjectModal";
import { DeleteProjectModal } from "@/components/shared/AppShell/DeleteProjectModal";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { ProjectActivityDrawer } from "@/modules/project-command-center/components/ProjectActivityDrawer";
import { ProjectBriefModal } from "@/modules/project-brief/components/ProjectBriefModal";
import { HEALTH_TONE } from "@/modules/project-command-center/lib/project-health";
import { deriveProjectStatus, getProjectHealthSummary } from "@/modules/project-command-center/engine/workflow-engine";
import { WorkflowStepsProvider, useWorkflowStepsContext } from "@/modules/project-command-center/hooks/WorkflowStepsContext";
import { ProjectProvider, useProjectContext } from "@/modules/project-command-center/hooks/ProjectContext";

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = use(params);

  return (
    <ProjectProvider projectId={projectId}>
      <WorkflowStepsProvider projectId={projectId}>
        <ProjectLayoutGate projectId={projectId}>{children}</ProjectLayoutGate>
      </WorkflowStepsProvider>
    </ProjectProvider>
  );
}

function ProjectLayoutGate({ projectId, children }: { projectId: string; children: React.ReactNode }) {
  const { project, isLoading } = useProjectContext();

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading project…</div>;
  }

  if (project === null) {
    notFound();
  }

  return (
    <ProjectLayoutBody projectId={projectId}>
      {children}
    </ProjectLayoutBody>
  );
}

function ProjectLayoutBody({
  projectId,
  children,
}: {
  projectId: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { project, setProject } = useProjectContext();
  const { steps } = useWorkflowStepsContext();
  const { users } = useUsersContext();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showBrief, setShowBrief] = useState(false);

  if (!project) return null;

  const status = deriveProjectStatus(steps);
  const { health } = getProjectHealthSummary({
    steps,
    startDate: project.createdAt,
    targetCompletionDate: project.targetCompletionDate,
    now: new Date(),
  });

  return (
    <div className="space-y-6 p-8">
      <nav className="flex items-center gap-1.5 text-sm text-muted-foreground">
        <Link href="/projects" className="hover:text-foreground">
          Projects
        </Link>
        <span>/</span>
        <span className="text-foreground">{project.name}</span>
      </nav>
      <ProjectHeaderCard
        name={project.name}
        projectNumber={project.projectNumber}
        customerName={project.customerName}
        siteAddress={project.siteAddress}
        stateBadge={<StatusBadge label={status.label} tone={status.isComplete ? "success" : "neutral"} />}
        healthBadge={<StatusBadge label={health} tone={HEALTH_TONE[health]} />}
        actions={
          <>
            <Button variant="outline" onClick={() => setShowBrief(true)}>
              Project Brief Report
            </Button>
            <Button variant="outline" onClick={() => setShowEdit(true)}>
              Edit
            </Button>
            <Button variant="destructive" onClick={() => setShowDelete(true)}>
              Delete
            </Button>
          </>
        }
      />
      <ProjectTabNav projectId={projectId} />
      <div className="space-y-6">{children}</div>

      <ProjectActivityDrawer projectId={projectId} />

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

      {showBrief ? (
        <ProjectBriefModal project={project} steps={steps} users={users} onClose={() => setShowBrief(false)} />
      ) : null}
    </div>
  );
}
