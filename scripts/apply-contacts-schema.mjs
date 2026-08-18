#!/usr/bin/env node
// Applies the sales_contacts table migration using raw SQL (prisma migrate dev
// is unavailable in this environment due to shadow DB issues).
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  console.log("Creating sales_contacts table...");

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "sales_contacts" (
      "id"        TEXT NOT NULL,
      "companyId" TEXT NOT NULL,
      "name"      TEXT NOT NULL,
      "title"     TEXT NOT NULL DEFAULT '',
      "email"     TEXT NOT NULL DEFAULT '',
      "phone"     TEXT NOT NULL DEFAULT '',
      "notes"     TEXT NOT NULL DEFAULT '',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "sales_contacts_pkey" PRIMARY KEY ("id")
    )
  `);

  await db.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'sales_contacts_companyId_fkey'
          AND table_name = 'sales_contacts'
      ) THEN
        ALTER TABLE "sales_contacts"
          ADD CONSTRAINT "sales_contacts_companyId_fkey"
          FOREIGN KEY ("companyId")
          REFERENCES "sales_companies"("id")
          ON DELETE CASCADE ON UPDATE CASCADE;
      END IF;
    END $$
  `);

  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "sales_contacts_companyId_idx"
    ON "sales_contacts"("companyId")
  `);

  // updatedAt auto-update trigger
  await db.$executeRawUnsafe(`
    CREATE OR REPLACE FUNCTION update_sales_contacts_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW."updatedAt" = NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql
  `);

  await db.$executeRawUnsafe(`
    DROP TRIGGER IF EXISTS sales_contacts_updated_at ON "sales_contacts"
  `);

  await db.$executeRawUnsafe(`
    CREATE TRIGGER sales_contacts_updated_at
    BEFORE UPDATE ON "sales_contacts"
    FOR EACH ROW EXECUTE FUNCTION update_sales_contacts_updated_at()
  `);

  console.log("✅ sales_contacts table ready");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => db.$disconnect());
