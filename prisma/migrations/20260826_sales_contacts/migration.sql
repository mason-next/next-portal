-- CreateTable
CREATE TABLE "sales_contacts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT NOT NULL DEFAULT '',
    "email" TEXT NOT NULL DEFAULT '',
    "phone" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sales_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "sales_contacts_companyId_idx" ON "sales_contacts"("companyId");

-- AddForeignKey
ALTER TABLE "sales_contacts" ADD CONSTRAINT "sales_contacts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "sales_companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
