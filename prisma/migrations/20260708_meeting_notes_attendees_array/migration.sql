-- Convert meeting_notes.attendees from TEXT to TEXT[].
-- Existing free-text values cannot be mapped to user IDs, so rows are reset to empty array.
-- Idempotent: no-op if the column is already of array type.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'meeting_notes'
      AND column_name  = 'attendees'
      AND data_type    = 'text'
  ) THEN
    ALTER TABLE "meeting_notes" ALTER COLUMN "attendees" TYPE TEXT[] USING '{}'::TEXT[];
    ALTER TABLE "meeting_notes" ALTER COLUMN "attendees" SET DEFAULT '{}';
  END IF;
END $$;
