-- DropForeignKey
ALTER TABLE "bom_rows" DROP CONSTRAINT "bom_rows_releaseId_fkey";

-- AlterTable
ALTER TABLE "bom_rows" ADD COLUMN     "releaseLabel" TEXT;
