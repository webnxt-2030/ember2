-- Add onChainId to Project for indexer reconciliation with on-chain projectId
ALTER TABLE "Project" ADD COLUMN "onChainId" TEXT;

-- Unique index to ensure one project per on-chain projectId
CREATE UNIQUE INDEX "Project_onChainId_key" ON "Project"("onChainId");
