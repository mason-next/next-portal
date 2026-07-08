"use client";

import { ProjectRoleDefaultsCard } from "@/modules/admin/components/ProjectRoleDefaultsCard";
import { MeetingDefaultsCard } from "@/modules/admin/components/MeetingDefaultsCard";
import { WorkflowStepDefaultsCard } from "@/modules/admin/components/WorkflowStepDefaultsCard";

export function DefaultsTab() {
  return (
    <>
      <div className="mb-6">
        <h1 className="text-xl font-semibold tracking-tight">System Defaults</h1>
        <p className="text-sm text-muted-foreground">
          Configure default assignments applied when new projects and meetings are created.
        </p>
      </div>
      <div className="space-y-6">
        <ProjectRoleDefaultsCard />
        <MeetingDefaultsCard />
        <WorkflowStepDefaultsCard />
      </div>
    </>
  );
}
