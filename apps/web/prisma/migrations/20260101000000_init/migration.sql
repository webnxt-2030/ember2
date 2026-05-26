-- Enable citext extension (must come first; citext columns depend on it)
CREATE EXTENSION IF NOT EXISTS "citext";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('BACKER', 'ORG_OWNER', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "OrgRole" AS ENUM ('OWNER');

-- CreateEnum
CREATE TYPE "RewardCurve" AS ENUM ('LINEAR', 'EXPONENTIAL', 'BINARY', 'CUSTOM');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'LIVE', 'COMPLETED', 'PAUSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'AUTO_RELEASED', 'VOTING', 'PASSED', 'FAILED', 'CLAIMED');

-- CreateEnum
CREATE TYPE "VoteChoice" AS ENUM ('YES', 'NO');

-- CreateEnum
CREATE TYPE "ActivityType" AS ENUM (
  'USER_SIGNED_UP', 'USER_SIGNED_IN', 'USER_SIGNED_OUT',
  'WALLET_LINKED', 'WALLET_UNLINKED',
  'ORG_CREATED', 'ORG_UPDATED', 'ORG_VERIFIED', 'ORG_REJECTED',
  'ORG_MEMBER_ADDED', 'ORG_MEMBER_REMOVED',
  'PROJECT_CREATED', 'PROJECT_UPDATED', 'PROJECT_PUBLISHED',
  'PROJECT_PAUSED', 'PROJECT_CANCELLED', 'PROJECT_COMPLETED',
  'CONTRIBUTION_RECEIVED',
  'MILESTONE_SUBMITTED', 'MILESTONE_VOTE_CAST', 'MILESTONE_RESOLVED', 'MILESTONE_CLAIMED',
  'EMAIL_SENT', 'EMAIL_FAILED', 'ADMIN_ACTION'
);

-- CreateEnum
CREATE TYPE "EmailTemplate" AS ENUM (
  'WELCOME', 'CONTRIBUTION_RECEIVED', 'MILESTONE_UPDATED',
  'MILESTONE_VOTE_OPEN', 'MILESTONE_VOTE_COMING_SOON', 'MILESTONE_VOTE_OUTCOME',
  'MILESTONE_CLAIMED', 'ORG_VERIFIED', 'ORG_REJECTED', 'ADMIN_INVITATION'
);

-- CreateEnum
CREATE TYPE "EmailStatus" AS ENUM ('QUEUED', 'SENT', 'FAILED');

-- CreateTable: User
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "image" TEXT,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'BACKER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Account
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "expiresAt" TIMESTAMP(3),
    "password" TEXT,
    "scope" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Session
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Verification
CREATE TABLE "Verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Wallet
CREATE TABLE "Wallet" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "address" CITEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "verifiedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Organization
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "logoUrl" TEXT,
    "website" TEXT,
    "receivingWallet" CITEXT NOT NULL,
    "verifiedStatus" "VerificationStatus" NOT NULL DEFAULT 'PENDING',
    "verifiedAt" TIMESTAMP(3),
    "verifiedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable: OrganizationMember
CREATE TABLE "OrganizationMember" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'OWNER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrganizationMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Project
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "pictures" TEXT[],
    "socialLinks" JSONB NOT NULL,
    "backingLinks" TEXT[],
    "targetAmount" DECIMAL(20,6) NOT NULL,
    "fundingDeadline" TIMESTAMP(3),
    "votingPeriodDays" INTEGER NOT NULL DEFAULT 7,
    "rewardCurveType" "RewardCurve" NOT NULL DEFAULT 'LINEAR',
    "milestoneBps" INTEGER[],
    "escrowAddress" CITEXT,
    "nftAddress" CITEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "totalRaised" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedAt" TIMESTAMP(3),
    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Milestone
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "index" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "deliverableDate" TIMESTAMP(3),
    "bps" INTEGER NOT NULL,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "updateUri" TEXT,
    "voteStartAt" TIMESTAMP(3),
    "voteEndAt" TIMESTAMP(3),
    "weightYes" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "weightNo" DECIMAL(20,6) NOT NULL DEFAULT 0,
    "passed" BOOLEAN,
    "claimedAt" TIMESTAMP(3),
    "claimedTxHash" TEXT,
    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Contribution
CREATE TABLE "Contribution" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "backerId" TEXT,
    "walletAddress" CITEXT NOT NULL,
    "amount" DECIMAL(20,6) NOT NULL,
    "m0Share" DECIMAL(20,6) NOT NULL,
    "nftTokenId" TEXT NOT NULL,
    "nftContract" CITEXT NOT NULL,
    "txHash" TEXT NOT NULL,
    "blockNumber" BIGINT NOT NULL,
    "contributedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Contribution_pkey" PRIMARY KEY ("id")
);

-- CreateTable: MilestoneVote
CREATE TABLE "MilestoneVote" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "walletAddress" CITEXT NOT NULL,
    "choice" "VoteChoice" NOT NULL,
    "weight" DECIMAL(20,6) NOT NULL,
    "txHash" TEXT NOT NULL,
    "votedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MilestoneVote_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ActivityLog
CREATE TABLE "ActivityLog" (
    "id" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorWallet" CITEXT,
    "type" "ActivityType" NOT NULL,
    "targetType" TEXT,
    "targetId" TEXT,
    "metadata" JSONB NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ActivityLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable: EmailNotification
CREATE TABLE "EmailNotification" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "template" "EmailTemplate" NOT NULL,
    "payload" JSONB NOT NULL,
    "status" "EmailStatus" NOT NULL DEFAULT 'QUEUED',
    "resendId" TEXT,
    "error" TEXT,
    "sentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailNotification_pkey" PRIMARY KEY ("id")
);

-- CreateTable: IndexerCursor
CREATE TABLE "IndexerCursor" (
    "id" TEXT NOT NULL,
    "contract" CITEXT NOT NULL,
    "eventName" TEXT NOT NULL,
    "lastBlock" BIGINT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IndexerCursor_pkey" PRIMARY KEY ("id")
);

-- CreateUniqueIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "Account_providerId_accountId_key" ON "Account"("providerId", "accountId");
CREATE UNIQUE INDEX "Session_token_key" ON "Session"("token");
CREATE UNIQUE INDEX "Verification_identifier_value_key" ON "Verification"("identifier", "value");
CREATE UNIQUE INDEX "Wallet_address_key" ON "Wallet"("address");
CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");
CREATE UNIQUE INDEX "OrganizationMember_organizationId_userId_key" ON "OrganizationMember"("organizationId", "userId");
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
CREATE UNIQUE INDEX "Milestone_projectId_index_key" ON "Milestone"("projectId", "index");
CREATE UNIQUE INDEX "Contribution_txHash_key" ON "Contribution"("txHash");
CREATE UNIQUE INDEX "MilestoneVote_milestoneId_walletAddress_key" ON "MilestoneVote"("milestoneId", "walletAddress");
CREATE UNIQUE INDEX "MilestoneVote_txHash_key" ON "MilestoneVote"("txHash");
CREATE UNIQUE INDEX "EmailNotification_resendId_key" ON "EmailNotification"("resendId");
CREATE UNIQUE INDEX "IndexerCursor_contract_eventName_key" ON "IndexerCursor"("contract", "eventName");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");
CREATE INDEX "Wallet_userId_idx" ON "Wallet"("userId");
CREATE INDEX "Organization_verifiedStatus_idx" ON "Organization"("verifiedStatus");
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");
CREATE INDEX "Project_status_idx" ON "Project"("status");
CREATE INDEX "Milestone_status_idx" ON "Milestone"("status");
CREATE INDEX "Contribution_projectId_idx" ON "Contribution"("projectId");
CREATE INDEX "Contribution_walletAddress_idx" ON "Contribution"("walletAddress");
CREATE INDEX "Contribution_backerId_idx" ON "Contribution"("backerId");
CREATE INDEX "MilestoneVote_milestoneId_idx" ON "MilestoneVote"("milestoneId");
CREATE INDEX "ActivityLog_actorUserId_idx" ON "ActivityLog"("actorUserId");
CREATE INDEX "ActivityLog_type_idx" ON "ActivityLog"("type");
CREATE INDEX "ActivityLog_targetType_targetId_idx" ON "ActivityLog"("targetType", "targetId");
CREATE INDEX "ActivityLog_createdAt_idx" ON "ActivityLog"("createdAt");
CREATE INDEX "EmailNotification_status_idx" ON "EmailNotification"("status");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "OrganizationMember" ADD CONSTRAINT "OrganizationMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Contribution" ADD CONSTRAINT "Contribution_backerId_fkey" FOREIGN KEY ("backerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "MilestoneVote" ADD CONSTRAINT "MilestoneVote_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "Milestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ActivityLog" ADD CONSTRAINT "ActivityLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
