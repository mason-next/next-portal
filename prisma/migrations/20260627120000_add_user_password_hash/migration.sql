-- Add password hash field to users for local authentication
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
