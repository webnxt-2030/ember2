-- Add PROCESSING to EmailStatus enum (PostgreSQL 14+)
-- Uses DO to make it idempotent (won't error if value already exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'EmailStatus' AND e.enumlabel = 'PROCESSING'
  ) THEN
    ALTER TYPE "EmailStatus" ADD VALUE 'PROCESSING';
  END IF;
END $$;