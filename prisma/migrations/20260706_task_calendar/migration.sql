-- Store Outlook calendar event metadata on tasks so we can detect/prevent duplicate
-- scheduling and provide a back-link from the portal to the Outlook event.

ALTER TABLE "implementation_tasks"
    ADD COLUMN IF NOT EXISTS "calendarScheduledAt" TIMESTAMP(3),
    ADD COLUMN IF NOT EXISTS "calendarEventUrl"    TEXT;
