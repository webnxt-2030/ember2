-- Add comingSoonNotifiedAt to Milestone for 24h sweeper idempotency
ALTER TABLE "Milestone" ADD COLUMN "comingSoonNotifiedAt" TIMESTAMP(3);
