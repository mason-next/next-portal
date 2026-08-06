#!/usr/bin/env node
// Applies commission-statement schema changes via raw SQL.
// Run: node scripts/apply-commission-schema.mjs
import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

const statements = [
  `ALTER TABLE "sales_opportunities" ADD COLUMN IF NOT EXISTS "commissionTeam" JSONB DEFAULT '[]'`,
  `ALTER TABLE "sales_opportunities" ADD COLUMN IF NOT EXISTS "parentOppId" TEXT`,

  `CREATE TABLE IF NOT EXISTS "sales_opp_invoices" (
    "id"               TEXT        NOT NULL PRIMARY KEY,
    "opportunityId"    TEXT        NOT NULL,
    "invoiceNumber"    TEXT        NOT NULL DEFAULT '',
    "invoiceDate"      TIMESTAMPTZ NOT NULL,
    "subtotalCents"    INT         NOT NULL DEFAULT 0,
    "salesTaxCents"    INT         NOT NULL DEFAULT 0,
    "openBalanceCents" INT         NOT NULL DEFAULT 0,
    "paymentStatus"    TEXT        NOT NULL DEFAULT 'Outstanding',
    "paymentDate"      TIMESTAMPTZ,
    "appliesToOppId"   TEXT,
    "notes"            TEXT        NOT NULL DEFAULT '',
    "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT "sales_opp_invoices_opportunityId_fkey"
      FOREIGN KEY ("opportunityId")
      REFERENCES "sales_opportunities"("id")
      ON DELETE CASCADE
  )`,

  `CREATE INDEX IF NOT EXISTS "sales_opp_invoices_opportunityId_idx"
   ON "sales_opp_invoices"("opportunityId")`,
];

try {
  for (const sql of statements) {
    console.log("Running:", sql.slice(0, 60).replace(/\n\s+/g, " ") + "…");
    await db.$executeRawUnsafe(sql);
  }
  console.log("✓ Commission schema applied successfully.");
} catch (err) {
  console.error("✗ Migration failed:", err);
  process.exit(1);
} finally {
  await db.$disconnect();
}
