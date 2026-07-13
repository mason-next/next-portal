"use client";

import { use, useState } from "react";
import Link from "next/link";
import { notFound, useRouter } from "next/navigation";
import { ExternalLink, FileText } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { useSession } from "@/lib/auth/client";

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
  const { project, isLoading, fetchError } = useProjectContext();

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading project…</div>;
  }

  // Server/network error — don't call notFound(); show a recoverable error instead.
  if (fetchError) {
    return (
      <div className="p-8 text-sm text-muted-foreground">
        Unable to load project. Please refresh the page or try again later.
      </div>
    );
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
  const session = useSession();
  const { project, setProject } = useProjectContext();
  const { steps, isLoading: stepsLoading } = useWorkflowStepsContext();
  const { users } = useUsersContext();
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showBrief, setShowBrief] = useState(false);

  // Null during initial load so ProjectTabNav shows all tabs rather than none.
  const activeSections = stepsLoading ? null : new Set(steps.map((s) => s.section));

  if (!project) return null;

  const isAdmin = session.roleTypes.includes("Administrator");
  const canEdit = isAdmin || session.roleTypes.some((r) => !["Customer", "Subcontractor"].includes(r));

  const status = deriveProjectStatus(steps);
  const { health } = getProjectHealthSummary({
    steps,
    startDate: project.createdAt,
    targetCompletionDate: project.targetCompletionDate,
    now: new Date(),
  });

  return (
    <div className="space-y-4 p-4 sm:space-y-6 sm:p-8">
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
            {project.connectwiseUrl ? (
              <a
                href={project.connectwiseUrl}
                target="_blank"
                rel="noopener noreferrer"
                title="Open in ConnectWise"
                className={buttonVariants({ variant: "outline", size: "icon" })}
              >
                <ExternalLink className="size-4" />
              </a>
            ) : null}
            <Button variant="outline" onClick={() => setShowBrief(true)}>
              <FileText className="mr-1.5 size-4" />
              Project Brief Report
            </Button>
            {canEdit ? (
              <Button variant="outline" onClick={() => setShowEdit(true)}>
                Edit
              </Button>
            ) : null}
            {isAdmin ? (
              <Button variant="destructive" onClick={() => setShowDelete(true)}>
                Delete
              </Button>
            ) : null}
          </>
        }
      />
      <ProjectTabNav projectId={projectId} activeSections={activeSections} />
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
