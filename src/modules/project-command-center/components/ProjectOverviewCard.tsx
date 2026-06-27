"use client";

import { useState, type ReactNode } from "react";
import { Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CollapsibleCard } from "@/components/shared/CollapsibleCard";
import { EditProjectOverviewModal } from "@/components/shared/AppShell/EditProjectOverviewModal";
import { UserInlineLabel } from "@/components/shared/UserInlineLabel";
import { UserAvatarImage } from "@/components/shared/AppShell/UserAvatarImage";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { useProjectContext } from "@/modules/project-command-center/hooks/ProjectContext";
import { useWorkflowStepsContext } from "@/modules/project-command-center/hooks/WorkflowStepsContext";
import { formatCalendarDate, formatMoney } from "@/lib/utils";
import { ROLE_NOT_NEEDED } from "@/lib/role-assignment";
import type { ProjectTechnicianEntry } from "@/types/subcontractor";

export function ProjectOverviewCard() {
  const { project, setProject } = useProjectContext();
  const { refetch: refetchWorkflowSteps } = useWorkflowStepsContext();
  const { users } = useUsersContext();
  const [showEdit, setShowEdit] = useState(false);
  const userById = (id: string | null) => users.find((u) => u.id === id) ?? null;
  const roleLabel = (id: string | null) =>
    id === ROLE_NOT_NEEDED ? (
      <span className="text-muted-foreground">Not Needed</span>
    ) : (
      <UserInlineLabel user={userById(id)} />
    );

  if (!project) return null;

  return (
    <CollapsibleCard
      title="Project Overview"
      storageKey="project-overview"
      headerExtra={
        <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
          Edit
        </Button>
      }
    >
      <div className="grid grid-cols-4 gap-6">
        <Field label="Contract Value" value={formatMoney(project.contractValue)} />
        <Field label="Gross Profit" value={formatMoney(project.grossProfit)} />
        <Field
          label="Solution Project Manager"
          value={<UserInlineLabel user={userById(project.fieldProjectManagerId)} />}
        />
        <Field label="Senior Inside PM" value={roleLabel(project.seniorInsideId)} />
        <Field label="Inside PM" value={roleLabel(project.insidePMId)} />
        <Field label="Solutions Engineer" value={roleLabel(project.solutionsEngineerId)} />
        <Field label="Solutions Executive" value={roleLabel(project.solutionsExecutiveId)} />
        <Field label="Start Date" value={formatCalendarDate(project.createdAt)} />
        <Field label="Target Completion" value={formatCalendarDate(project.targetCompletionDate)} />
        <Field
          label="Technicians"
          value={<TechniciansList entries={project.technicians} />}
          fullWidth={project.technicians.length > 2}
        />
      </div>

      {showEdit ? (
        <EditProjectOverviewModal
          project={project}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => {
            setProject(updated);
            refetchWorkflowSteps();
            setShowEdit(false);
          }}
        />
      ) : null}
    </CollapsibleCard>
  );
}

function TechniciansList({ entries }: { entries: ProjectTechnicianEntry[] }) {
  if (entries.length === 0) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1">
      {entries.map((e) => (
        <span key={e.id || e.userId || e.subcontractorId} className="inline-flex items-center gap-1.5 text-sm">
          {e.userId ? (
            <UserAvatarImage name={e.userName ?? ""} avatarUrl={e.avatarUrl} size={18} />
          ) : (
            <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
          <span className="font-medium">{e.userName ?? e.subcontractorName ?? "Unknown"}</span>
          {e.subcontractorId && e.trade && (
            <span className="text-xs text-muted-foreground">({e.trade})</span>
          )}
        </span>
      ))}
    </div>
  );
}

function Field({ label, value, fullWidth }: { label: string; value: ReactNode; fullWidth?: boolean }) {
  return (
    <div className={fullWidth ? "col-span-2" : undefined}>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-semibold">{value}</div>
    </div>
  );
}
