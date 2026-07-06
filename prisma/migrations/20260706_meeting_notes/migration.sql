-- Create meeting_notes table
CREATE TABLE IF NOT EXISTS "meeting_notes" (
    "id"            TEXT NOT NULL,
    "projectId"     TEXT NOT NULL,
    "title"         TEXT NOT NULL,
    "meetingDate"   TIMESTAMP(3) NOT NULL,
    "attendees"     TEXT NOT NULL DEFAULT '',
    "body"          TEXT NOT NULL DEFAULT '',
    "actionItems"   TEXT NOT NULL DEFAULT '',
    "createdById"   TEXT,
    "createdByName" TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "meeting_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "meeting_notes_projectId_idx" ON "meeting_notes"("projectId");

ALTER TABLE "meeting_notes"
    ADD CONSTRAINT "meeting_notes_projectId_fkey"
    FOREIGN KEY ("projectId")
    REFERENCES "projects"("id")
    ON DELETE CASCADE
    ON UPDATE CASCADE;
