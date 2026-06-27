-- AlterTable
ALTER TABLE "deal_desk_quotes" ADD COLUMN     "billingCompletionPct" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "milestones" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "payoutEvents" JSONB NOT NULL DEFAULT '[]';
