-- Add taskCommentId to notifications for per-comment dedup on implementation task mentions.
-- Plain text column — no FK constraint, since ImplementationTaskComment is a separate model.
-- NOTE: notifications uses camelCase column names (matching the existing table convention).
ALTER TABLE "notifications" ADD COLUMN "taskCommentId" TEXT;
