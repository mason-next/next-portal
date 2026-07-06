-- Create technical_kickoffs table (mirrors internal_kickoffs structure)
CREATE TABLE IF NOT EXISTS "technical_kickoffs" (
    "id"          TEXT NOT NULL,
    "projectId"   TEXT NOT NULL,
    "subject"     TEXT NOT NULL,
    "agenda"      TEXT NOT NULL,
    "attendees"   TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "startTime"   TIMESTAMP(3) NOT NULL,
    "endTime"     TIMESTAMP(3) NOT NULL,
    "scheduledBy" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technical_kickoffs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "technical_kickoffs_projectId_key" ON "technical_kickoffs"("projectId");

ALTER TABLE "technical_kickoffs"
    ADD CONSTRAINT "technical_kickoffs_projectId_fkey"
    FOREIGN KEY ("projectId")
    REFERENCES "projects"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
