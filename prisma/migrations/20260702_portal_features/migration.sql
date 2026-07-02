-- 1. Make ImplementationTask.projectId nullable (personal tasks)
ALTER TABLE "implementation_tasks" ALTER COLUMN "projectId" DROP NOT NULL;
ALTER TABLE "implementation_tasks" DROP CONSTRAINT IF EXISTS "implementation_tasks_projectId_fkey";
ALTER TABLE "implementation_tasks" ADD CONSTRAINT "implementation_tasks_projectId_fkey"
  FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 2. Add isPersonal flag to ImplementationTask
ALTER TABLE "implementation_tasks" ADD COLUMN IF NOT EXISTS "isPersonal" BOOLEAN NOT NULL DEFAULT false;

-- 3. User profile fields
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "department" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "location" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "region" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "adminNotes" TEXT NOT NULL DEFAULT '';
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "emergencyContact" TEXT NOT NULL DEFAULT '';

-- 4. UserCertification model
CREATE TABLE IF NOT EXISTS "user_certifications" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "userId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "issuingOrg" TEXT NOT NULL DEFAULT '',
  "expirationDate" TIMESTAMP(3),
  "notes" TEXT NOT NULL DEFAULT '',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_certifications_pkey" PRIMARY KEY ("id")
);
ALTER TABLE "user_certifications" ADD CONSTRAINT "user_certifications_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
CREATE INDEX IF NOT EXISTS "user_certifications_userId_idx" ON "user_certifications"("userId");

-- 5. License status enum
DO $$ BEGIN
  CREATE TYPE "LicenseStatus" AS ENUM ('Active', 'Expiring', 'Expired', 'Suspended');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- 6. License model
CREATE TABLE IF NOT EXISTS "licenses" (
  "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
  "state" TEXT NOT NULL DEFAULT '',
  "licenseType" TEXT NOT NULL,
  "licenseNumber" TEXT NOT NULL DEFAULT '',
  "holderName" TEXT NOT NULL DEFAULT '',
  "renewalDate" TIMESTAMP(3),
  "renewalRequirements" TEXT NOT NULL DEFAULT '',
  "status" "LicenseStatus" NOT NULL DEFAULT 'Active',
  "notes" TEXT NOT NULL DEFAULT '',
  "attachments" JSONB NOT NULL DEFAULT '[]',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "licenses_pkey" PRIMARY KEY ("id")
);
