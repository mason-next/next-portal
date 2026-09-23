-- One-way ConnectWise sync: remember what each deal looked like in CW at the last
-- import so re-imports only overwrite fields that changed in ConnectWise and keep
-- edits made in the portal.
ALTER TABLE "sales_opportunities" ADD COLUMN "cwSnapshot" JSONB,
ADD COLUMN "cwSyncedAt" TIMESTAMP(3);

CREATE INDEX "sales_opportunities_cwNumber_idx" ON "sales_opportunities"("cwNumber");
