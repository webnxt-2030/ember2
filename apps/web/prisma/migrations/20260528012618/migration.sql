-- AlterTable
ALTER TABLE "Contribution" ALTER COLUMN "logIndex" DROP DEFAULT;

-- AlterTable
ALTER TABLE "MilestoneVote" ALTER COLUMN "logIndex" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Session" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "Verification" ALTER COLUMN "updatedAt" DROP DEFAULT;
