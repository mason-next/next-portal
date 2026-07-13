-- Phase 5: Succession planning.
-- Ranked successors per position with optional development notes.
-- user_id is a plain scalar (no FK to users) per module isolation pattern.

CREATE TABLE "org_successors" (
  "id"          TEXT NOT NULL,
  "position_id" TEXT NOT NULL,
  "user_id"     TEXT NOT NULL,
  "rank"        INTEGER NOT NULL DEFAULT 1,
  "notes"       TEXT,
  "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "org_successors_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "org_successors_position_id_fkey"
    FOREIGN KEY ("position_id") REFERENCES "org_positions"("id") ON DELETE CASCADE,
  CONSTRAINT "org_successors_position_id_user_id_key"
    UNIQUE ("position_id", "user_id")
);

CREATE INDEX "org_successors_position_id_idx" ON "org_successors"("position_id");
