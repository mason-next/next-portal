-- Extend notifications table for multi-type notification service
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'mention';
ALTER TABLE "notifications" ALTER COLUMN "commentId" DROP NOT NULL;
ALTER TABLE "notifications" ALTER COLUMN "commentAuthor" SET DEFAULT '';
ALTER TABLE "notifications" ALTER COLUMN "commentPreview" SET DEFAULT '';
ALTER TABLE "notifications" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
