-- Add serviceWarranty to WorkflowSection enum
ALTER TYPE "WorkflowSection" ADD VALUE IF NOT EXISTS 'serviceWarranty';

-- Insert Service & Warranty workflow step for all existing projects that don't have it yet.
-- Uses projectId:serviceWarranty as the stable id (matches the pattern used at seed time).
INSERT INTO "workflow_steps" (
  "id",
  "projectId",
  "key",
  "name",
  "section",
  "weight",
  "status",
  "ownerId",
  "dueDate",
  "completedDate",
  "sortOrder",
  "statusOverridden",
  "weightOverridden",
  "isCustom",
  "description",
  "dependsOnKeys",
  "completionRule",
  "updatedAt"
)
SELECT
  p.id || ':serviceWarranty' AS "id",
  p.id AS "projectId",
  'serviceWarranty' AS "key",
  'Service & Warranty' AS "name",
  'serviceWarranty'::"WorkflowSection" AS "section",
  5.0 AS "weight",
  'Not Started'::"WorkflowStepStatus" AS "status",
  NULL AS "ownerId",
  NULL AS "dueDate",
  NULL AS "completedDate",
  14 AS "sortOrder",
  false AS "statusOverridden",
  false AS "weightOverridden",
  false AS "isCustom",
  '' AS "description",
  '{}' AS "dependsOnKeys",
  'manual' AS "completionRule",
  NOW() AS "updatedAt"
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM "workflow_steps" ws
  WHERE ws."projectId" = p.id AND ws."key" = 'serviceWarranty'
);
