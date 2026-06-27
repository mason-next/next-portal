-- CreateEnum
CREATE TYPE "LogoStage" AS ENUM ('Prospecting', 'Qualifying', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM ('Call', 'Email', 'Meeting', 'Research', 'Demo', 'Proposal', 'Other');

-- CreateTable
CREATE TABLE "sales_logos" (
    "id" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "domain" TEXT NOT NULL DEFAULT '',
    "stage" "LogoStage" NOT NULL DEFAULT 'Prospecting',
    "ownerId" TEXT,
    "ownerName" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "dealDeskId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_logos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sales_activities" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "userName" TEXT NOT NULL,
    "logoId" TEXT,
    "type" "ActivityType" NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "weekStart" TIMESTAMP(3) NOT NULL,
    "durationMins" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sales_activities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_presentations" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "htmlFile" TEXT NOT NULL DEFAULT 'presentation.html',
    "storageKey" TEXT NOT NULL DEFAULT '',
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "quote_presentations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quote_access_logs" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "ip" TEXT NOT NULL DEFAULT '',
    "userAgent" TEXT NOT NULL DEFAULT '',
    "accessedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quote_access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_activities_userId_weekStart_idx" ON "sales_activities"("userId", "weekStart");

-- CreateIndex
CREATE INDEX "sales_activities_weekStart_idx" ON "sales_activities"("weekStart");

-- CreateIndex
CREATE UNIQUE INDEX "quote_presentations_slug_key" ON "quote_presentations"("slug");

-- CreateIndex
CREATE INDEX "quote_access_logs_quoteId_accessedAt_idx" ON "quote_access_logs"("quoteId", "accessedAt" DESC);

-- AddForeignKey
ALTER TABLE "sales_activities" ADD CONSTRAINT "sales_activities_logoId_fkey" FOREIGN KEY ("logoId") REFERENCES "sales_logos"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quote_access_logs" ADD CONSTRAINT "quote_access_logs_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quote_presentations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
