-- Project Leadership roles: Senior Inside, Project Manager, Inside PM

ALTER TYPE "ProjectMemberRole" ADD VALUE IF NOT EXISTS 'Senior Inside';
ALTER TYPE "ProjectMemberRole" ADD VALUE IF NOT EXISTS 'Project Manager';
ALTER TYPE "ProjectMemberRole" ADD VALUE IF NOT EXISTS 'Inside PM';

ALTER TABLE "projects"
    ADD COLUMN IF NOT EXISTS "seniorInsideId"   TEXT,
    ADD COLUMN IF NOT EXISTS "projectManagerId" TEXT,
    ADD COLUMN IF NOT EXISTS "insidePMId"       TEXT;

ALTER TABLE "projects"
    ADD CONSTRAINT "projects_seniorInsideId_fkey"
        FOREIGN KEY ("seniorInsideId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "projects_projectManagerId_fkey"
        FOREIGN KEY ("projectManagerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    ADD CONSTRAINT "projects_insidePMId_fkey"
        FOREIGN KEY ("insidePMId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Default Senior Inside = Sandra Verissimo, Inside PM = Alex Behan for new projects
INSERT INTO "app_settings" ("key", "value", "updatedAt")
VALUES
    ('default_senior_inside_id', '"user-sandra-verissimo"', NOW()),
    ('default_inside_pm_id',     '"user-alex-behan"',       NOW())
ON CONFLICT ("key") DO NOTHING;
