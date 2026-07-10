-- Phase 7: Matrix reporting relationships between positions
CREATE TABLE "org_position_relationships" (
  "id"                TEXT         NOT NULL,
  "from_position_id"  TEXT         NOT NULL,
  "to_position_id"    TEXT         NOT NULL,
  "relationship_type" TEXT         NOT NULL,
  "notes"             TEXT,
  "created_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "org_position_relationships_pkey"   PRIMARY KEY ("id"),
  CONSTRAINT "org_position_relationships_from_fkey"
    FOREIGN KEY ("from_position_id") REFERENCES "org_positions"("id") ON DELETE CASCADE,
  CONSTRAINT "org_position_relationships_to_fkey"
    FOREIGN KEY ("to_position_id")   REFERENCES "org_positions"("id") ON DELETE CASCADE,
  CONSTRAINT "org_position_relationships_unique"
    UNIQUE ("from_position_id", "to_position_id", "relationship_type")
);
CREATE INDEX "org_position_relationships_from_idx" ON "org_position_relationships"("from_position_id");
CREATE INDEX "org_position_relationships_to_idx"   ON "org_position_relationships"("to_position_id");
