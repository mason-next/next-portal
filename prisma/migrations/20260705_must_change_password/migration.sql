-- Add mustChangePassword flag to force a password change on next login.
-- Defaults to false so all existing users are unaffected.
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "mustChangePassword" BOOLEAN NOT NULL DEFAULT false;
