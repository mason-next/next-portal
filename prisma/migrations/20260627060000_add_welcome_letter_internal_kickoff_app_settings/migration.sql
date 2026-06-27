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
CREATE TABLE "app_settings" (
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "app_settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "welcome_letters_projectId_key" ON "welcome_letters"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "internal_kickoffs_projectId_key" ON "internal_kickoffs"("projectId");

-- AddForeignKey
ALTER TABLE "welcome_letters" ADD CONSTRAINT "welcome_letters_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "internal_kickoffs" ADD CONSTRAINT "internal_kickoffs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;
