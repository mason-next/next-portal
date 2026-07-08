-- Rename task_comment_id → taskCommentId to match the camelCase column naming
-- convention used by the rest of the notifications table.
ALTER TABLE "notifications" RENAME COLUMN "task_comment_id" TO "taskCommentId";
