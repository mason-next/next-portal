-- Add last_active_at for online presence tracking.
-- Nullable so existing rows get NULL (treated as Offline) without a backfill.

ALTER TABLE "users" ADD COLUMN "last_active_at" TIMESTAMP(3);
