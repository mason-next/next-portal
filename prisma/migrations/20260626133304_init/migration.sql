-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('Administrator', 'Project Manager', 'Engineering Manager', 'Procurement Manager', 'Member');

-- CreateEnum
CREATE TYPE "ProjectMemberRole" AS ENUM ('Solutions Executive', 'Solutions Engineer', 'Lead Technician', 'Field Project Manager');

-- CreateEnum
CREATE TYPE "ActivityCategory" AS ENUM ('comment', 'workflow', 'status_change', 'system');

-- CreateEnum
CREATE TYPE "WorkflowSection" AS ENUM ('setup', 'engineering', 'procurement', 'implementation', 'closeout');

-- CreateEnum
CREATE TYPE "WorkflowStepStatus" AS ENUM ('Not Started', 'In Progress', 'Complete', 'Not Needed');

-- CreateEnum
CREATE TYPE "BomStatus" AS ENUM ('Pending Review', 'Approved', 'Update Needed', 'Do Not Order', 'On Hold', 'Released');

-- CreateEnum
CREATE TYPE "EquipmentSource" AS ENUM ('csv', 'connectwise');

-- CreateEnum
CREATE TYPE "DealStatus" AS ENUM ('Pending', 'Approved', 'Rejected');

-- CreateEnum
CREATE TYPE "CommissionStatus" AS ENUM ('Estimated', 'Pending Approval', 'Approved', 'Paid');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL DEFAULT '',
    "avatarUrl" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'Member',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "projectNumber" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerId" TEXT,
    "siteAddress" TEXT NOT NULL,
    "coordinatorGroup" TEXT NOT NULL,
    "contractValue" DOUBLE PRECISION NOT NULL,
    "grossProfit" DOUBLE PRECISION NOT NULL,
    "targetCompletionDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_members" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "ProjectMemberRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_steps" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "section" "WorkflowSection" NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "status" "WorkflowStepStatus" NOT NULL DEFAULT 'Not Started',
    "ownerId" TEXT,
    "dueDate" TIMESTAMP(3),
    "completedDate" TIMESTAMP(3),
    "sortOrder" INTEGER NOT NULL,
    "statusOverridden" BOOLEAN NOT NULL DEFAULT false,
    "weightOverridden" BOOLEAN NOT NULL DEFAULT false,
    "isCustom" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_activities" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "category" "ActivityCategory" NOT NULL,
    "activityType" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "richContent" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "commentAuthor" TEXT NOT NULL,
    "commentPreview" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comment_mentions" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "commentId" TEXT NOT NULL,
    "mentionedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comment_mentions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom_rows" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "seq" TEXT NOT NULL,
    "mfr" TEXT NOT NULL,
    "part" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "status" "BomStatus" NOT NULL DEFAULT 'Pending Review',
    "releaseId" TEXT,
    "releasedAt" TIMESTAMP(3),
    "shippingType" TEXT,
    "shipTo" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bom_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom_audit_log" (
    "id" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bom_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "releases" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "releaseNumber" TEXT NOT NULL,
    "shippingType" TEXT NOT NULL,
    "shipTo" TEXT NOT NULL,
    "recipients" TEXT NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "generatedBy" TEXT NOT NULL,
    "rowSnapshot" JSONB NOT NULL,
    "emailPlainText" TEXT NOT NULL,
    "emailHtml" TEXT NOT NULL,
    "emailSubject" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_rows" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "seq" TEXT NOT NULL,
    "mfr" TEXT NOT NULL,
    "product" TEXT NOT NULL,
    "desc" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "stockAllocation" TEXT NOT NULL DEFAULT '',
    "specialOrder" TEXT NOT NULL DEFAULT '',
    "pickedQty" INTEGER NOT NULL DEFAULT 0,
    "shippedQty" INTEGER NOT NULL DEFAULT 0,
    "cancelled" TEXT NOT NULL DEFAULT '',
    "poInfo" TEXT NOT NULL DEFAULT '',
    "rmaRequestedAt" TIMESTAMP(3),
    "source" "EquipmentSource" NOT NULL DEFAULT 'csv',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "equipment_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_audit_log" (
    "id" TEXT NOT NULL,
    "rowId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "oldValue" TEXT NOT NULL,
    "newValue" TEXT NOT NULL,
    "userName" TEXT NOT NULL,
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipment_audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "equipment_uploads" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL,
    "newCount" INTEGER NOT NULL,
    "updatedCount" INTEGER NOT NULL,
    "removedCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedBy" TEXT NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL,
    "source" "EquipmentSource" NOT NULL DEFAULT 'csv',

    CONSTRAINT "equipment_uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "welcome_letters" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "plainText" TEXT NOT NULL,
    "sentBy" TEXT NOT NULL,
    "sentAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "welcome_letters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "internal_kickoffs" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "agenda" TEXT NOT NULL,
    "attendees" TEXT[],
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "scheduledBy" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "internal_kickoffs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "deal_desk_quotes" (
    "id" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "projectName" TEXT NOT NULL,
    "quoteNumber" TEXT NOT NULL,
    "opportunityNumber" TEXT NOT NULL,
    "revision" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "projectType" TEXT NOT NULL,
    "salesperson" TEXT NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL,
    "importedBy" TEXT NOT NULL,
    "quarter" TEXT NOT NULL,
    "status" "DealStatus" NOT NULL DEFAULT 'Pending',
    "commissionStatus" "CommissionStatus" NOT NULL DEFAULT 'Estimated',
    "categories" JSONB NOT NULL,
    "team" JSONB NOT NULL,
    "executiveNotes" TEXT NOT NULL DEFAULT '',
    "approvalHistory" JSONB NOT NULL DEFAULT '[]',
    "auditLog" JSONB NOT NULL DEFAULT '[]',
    "sourceFiles" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "deal_desk_quotes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "projects_projectNumber_key" ON "projects"("projectNumber");

-- CreateIndex
CREATE INDEX "project_members_projectId_idx" ON "project_members"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "project_members_projectId_role_key" ON "project_members"("projectId", "role");

-- CreateIndex
CREATE INDEX "workflow_steps_projectId_sortOrder_idx" ON "workflow_steps"("projectId", "sortOrder");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_steps_projectId_key_key" ON "workflow_steps"("projectId", "key");

-- CreateIndex
CREATE INDEX "project_activities_projectId_createdAt_idx" ON "project_activities"("projectId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_userId_isRead_idx" ON "notifications"("userId", "isRead");

-- CreateIndex
CREATE INDEX "comment_mentions_mentionedUserId_createdAt_idx" ON "comment_mentions"("mentionedUserId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "bom_rows_projectId_idx" ON "bom_rows"("projectId");

-- CreateIndex
CREATE INDEX "bom_audit_log_rowId_idx" ON "bom_audit_log"("rowId");

-- CreateIndex
CREATE INDEX "releases_projectId_idx" ON "releases"("projectId");

-- CreateIndex
CREATE INDEX "equipment_rows_projectId_idx" ON "equipment_rows"("projectId");

-- CreateIndex
CREATE INDEX "equipment_audit_log_rowId_idx" ON "equipment_audit_log"("rowId");

-- CreateIndex
CREATE INDEX "equipment_uploads_projectId_idx" ON "equipment_uploads"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "welcome_letters_projectId_key" ON "welcome_letters"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "internal_kickoffs_projectId_key" ON "internal_kickoffs"("projectId");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_members" ADD CONSTRAINT "project_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_activities" ADD CONSTRAINT "project_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "project_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES "project_activities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comment_mentions" ADD CONSTRAINT "comment_mentions_mentionedUserId_fkey" FOREIGN KEY ("mentionedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_rows" ADD CONSTRAINT "bom_rows_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_rows" ADD CONSTRAINT "bom_rows_releaseId_fkey" FOREIGN KEY ("releaseId") REFERENCES "releases"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bom_audit_log" ADD CONSTRAINT "bom_audit_log_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "bom_rows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "releases" ADD CONSTRAINT "releases_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_rows" ADD CONSTRAINT "equipment_rows_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_audit_log" ADD CONSTRAINT "equipment_audit_log_rowId_fkey" FOREIGN KEY ("rowId") REFERENCES "equipment_rows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "equipment_uploads" ADD CONSTRAINT "equipment_uploads_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "welcome_letters" ADD CONSTRAINT "welcome_letters_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_kickoffs" ADD CONSTRAINT "internal_kickoffs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
