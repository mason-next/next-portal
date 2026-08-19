-- AlterTable
-- Microsoft Entra ID identity fields (authentication only). All nullable so existing
-- users stay valid until their first Microsoft login. Idempotent guards mirror the
-- repo convention (a column may already exist from a prior `prisma db push`).
ALTER TABLE "users"
  ADD COLUMN IF NOT EXISTS "entra_object_id" TEXT,
  ADD COLUMN IF NOT EXISTS "entra_tenant_id" TEXT,
  ADD COLUMN IF NOT EXISTS "last_login_at"   TIMESTAMP(3);

-- CreateIndex
-- Unique on the immutable Entra Object ID. Postgres treats NULLs as distinct, so the
-- many existing users with a NULL object id do not collide.
CREATE UNIQUE INDEX IF NOT EXISTS "users_entra_object_id_key" ON "users"("entra_object_id");
