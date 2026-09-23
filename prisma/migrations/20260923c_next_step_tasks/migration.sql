-- A deal's next step is now its earliest open task. Turn any free-text next step that
-- has no matching open task into a task, then re-derive every deal's cached next step.

INSERT INTO "sales_tasks" ("id", "companyId", "opportunityId", "title", "dueDate", "status", "priority",
  "assigneeId", "assigneeName", "createdByName", "updatedAt")
SELECT 'ns_' || o."id", o."companyId", o."id", o."nextStep", o."nextStepDate", 'Open', 'Normal',
  COALESCE(o."nextStepOwnerId", o."ownerId"), COALESCE(NULLIF(o."nextStepOwnerName", ''), o."ownerName"),
  'Next step', CURRENT_TIMESTAMP
FROM "sales_opportunities" o
WHERE btrim(o."nextStep") <> ''
  AND o."stage" NOT IN ('Closed Won', 'Closed Lost')
  AND NOT EXISTS (
    SELECT 1 FROM "sales_tasks" t
    WHERE t."opportunityId" = o."id" AND t."status" = 'Open' AND t."title" = o."nextStep"
  );

UPDATE "sales_opportunities" o
SET "nextStep" = t."title", "nextStepDate" = t."dueDate",
    "nextStepOwnerId" = t."assigneeId", "nextStepOwnerName" = t."assigneeName"
FROM (
  SELECT DISTINCT ON ("opportunityId") "opportunityId", "title", "dueDate", "assigneeId", "assigneeName"
  FROM "sales_tasks"
  WHERE "status" = 'Open' AND "opportunityId" IS NOT NULL
  ORDER BY "opportunityId", "dueDate" ASC NULLS LAST, "createdAt" ASC
) t
WHERE t."opportunityId" = o."id";

UPDATE "sales_opportunities" o
SET "nextStep" = '', "nextStepDate" = NULL, "nextStepOwnerId" = NULL, "nextStepOwnerName" = ''
WHERE NOT EXISTS (SELECT 1 FROM "sales_tasks" t WHERE t."opportunityId" = o."id" AND t."status" = 'Open');
