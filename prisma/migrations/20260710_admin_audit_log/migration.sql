-- Admin audit log for view-as impersonation events.
-- Standalone table with no foreign keys — safe to add at any time.

CREATE TABLE "admin_audit_logs" (
    "id"               TEXT NOT NULL,
    "admin_id"         TEXT NOT NULL,
    "admin_name"       TEXT NOT NULL,
    "action"           TEXT NOT NULL,
    "target_user_id"   TEXT,
    "target_user_name" TEXT,
    "metadata"         JSONB,
    "created_at"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "admin_audit_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "admin_audit_logs_admin_id_created_at_idx" ON "admin_audit_logs"("admin_id", "created_at" DESC);
