-- Add logIndex column to Contribution (used for idempotency alongside txHash)
ALTER TABLE "Contribution" ADD COLUMN "logIndex" INTEGER NOT NULL DEFAULT 0;

-- Add logIndex column to MilestoneVote
ALTER TABLE "MilestoneVote" ADD COLUMN "logIndex" INTEGER NOT NULL DEFAULT 0;

-- Replace single-column txHash unique on MilestoneVote with composite txHash+logIndex
DROP INDEX "MilestoneVote_txHash_key";
CREATE UNIQUE INDEX "MilestoneVote_txHash_logIndex_key" ON "MilestoneVote"("txHash", "logIndex");