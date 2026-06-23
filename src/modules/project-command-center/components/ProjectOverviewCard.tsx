"use client";

import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { EditProjectOverviewModal } from "@/components/shared/AppShell/EditProjectOverviewModal";
import { UserInlineLabel } from "@/components/shared/UserInlineLabel";
import { useUsersContext } from "@/components/shared/AppShell/UsersProvider";
import { useProjectContext } from "@/modules/project-command-center/hooks/ProjectContext";
import { useWorkflowStepsContext } from "@/modules/project-command-center/hooks/WorkflowStepsContext";
import { formatCalendarDate, formatMoney } from "@/lib/utils";
import { ROLE_NOT_NEEDED } from "@/lib/role-assignment";

export function ProjectOverviewCard() {
  const { project, setProject } = useProjectContext();
  const { refetch: refetchWorkflowSteps } = useWorkflowStepsContext();
  const { users } = useUsersContext();
  const [showEdit, setShowEdit] = useState(false);
  const userById = (id: string | null) => users.find((u) => u.id === id) ?? null;
  const roleLabel = (id: string | null) =>
    id === ROLE_NOT_NEEDED ? <span className="text-muted-foreground">Not Needed</span> : <UserInlineLabel user={userById(id)} />;

  if (!project) return null;

  return (
    <div className="rounded-xl border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm font-semibold">Project Overview</div>
        <Button variant="outline" size="sm" onClick={() => setShowEdit(true)}>
          Edit
        </Button>
      </div>
      <div className="grid grid-cols-4 gap-6">
        <Field label="Contract Value" value={formatMoney(project.contractValue)} />
        <Field label="Gross Margin" value={`${project.grossMarginPercent}%`} />
        <Field
          label="Field Project Manager"
          value={<UserInlineLabel user={userById(project.fieldProjectManagerId)} />}
        />
        <Field label="Solutions Engineer" value={roleLabel(project.solutionsEngineerId)} />
        <Field label="Solutions Executive" value={<UserInlineLabel user={userById(project.solutionsExecutiveId)} />} />
        <Field label="Lead Technician" value={roleLabel(project.leadTechnicianId)} />
        <Field label="Kickoff Date" value={formatCalendarDate(project.kickoffDate)} />
        <Field label="Target Completion" value={formatCalendarDate(project.targetCompletionDate)} />
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
    </div>
  );
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="mb-1 text-xs text-muted-foreground">{label}</div>
      <div className="truncate text-sm font-semibold">{value}</div>
    </div>
  );
}
