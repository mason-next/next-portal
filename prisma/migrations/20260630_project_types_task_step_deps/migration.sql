-- Add project types array to projects
ALTER TABLE "projects" ADD COLUMN "projectTypes" TEXT[] NOT NULL DEFAULT '{}';

-- Add workflow step link to implementation tasks
ALTER TABLE "implementation_tasks" ADD COLUMN "workflowStepId" TEXT;
ALTER TABLE "implementation_tasks" ADD CONSTRAINT "implementation_tasks_workflowStepId_fkey"
  FOREIGN KEY ("workflowStepId") REFERENCES "workflow_steps"("id") ON DELETE SET NULL ON UPDATE CASCADE;
