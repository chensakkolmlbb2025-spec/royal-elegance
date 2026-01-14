-- ============================================================================
-- P0 Security Fixes - PART 1: ENUM ENHANCEMENTS
-- RUN THIS FIRST, THEN RUN PART 2
-- ============================================================================
-- This must be run separately because PostgreSQL requires enum values
-- to be committed before they can be used in subsequent statements.
-- ============================================================================

-- Add 'reserved' status to booking_status enum (for temporary holds)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'reserved' 
    AND enumtypid = 'booking_status'::regtype
  ) THEN
    ALTER TYPE booking_status ADD VALUE 'reserved' BEFORE 'pending';
  END IF;
END $$;

-- Add 'super_admin' to user_role enum (for enhanced security policies)
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum 
    WHERE enumlabel = 'super_admin' 
    AND enumtypid = 'user_role'::regtype
  ) THEN
    ALTER TYPE user_role ADD VALUE 'super_admin';
  END IF;
END $$;

-- ============================================================================
-- DONE - Now run p0-security-fixes-migration-part2-schema.sql
-- ============================================================================
