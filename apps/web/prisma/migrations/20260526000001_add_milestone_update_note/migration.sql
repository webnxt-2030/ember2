-- Add updateNote column to Milestone for storing milestone submission markdown
ALTER TABLE "Milestone" ADD COLUMN "updateNote" TEXT;
