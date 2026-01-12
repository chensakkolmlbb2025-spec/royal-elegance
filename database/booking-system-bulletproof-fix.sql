-- ============================================================================
-- BULLETPROOF BOOKING SYSTEM - COMPLETE FIX
-- ============================================================================
-- This SQL script fixes ALL booking system flaws:
-- 1. Race condition / double-booking prevention
-- 2. Automatic room status management
-- 3. Transaction-safe booking operations
-- 4. Expired booking cleanup with auto room release
-- 5. Comprehensive audit logging
-- ============================================================================
-- Run this ONCE in Supabase SQL Editor
-- ============================================================================

-- Enable required extensions (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gist"; -- CRITICAL: Required for EXCLUDE constraint

-- ============================================================================
-- FIX #1: PREVENT OVERLAPPING BOOKINGS (RACE CONDITION FIX)
-- ============================================================================
-- This constraint GUARANTEES no two active bookings can have overlapping dates
-- for the same room. The database itself rejects invalid bookings!

-- First, drop if exists (for re-running)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'bookings_no_overlap_active'
  ) THEN
    ALTER TABLE bookings DROP CONSTRAINT bookings_no_overlap_active;
  END IF;
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- Add the exclusion constraint
-- This uses GIST index to efficiently check for date range overlaps
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap_active
EXCLUDE USING GIST (
  room_id WITH =,
  daterange(check_in_date, check_out_date, '[)') WITH &&
)
WHERE (status IN ('pending', 'confirmed', 'checked_in'));

COMMENT ON CONSTRAINT bookings_no_overlap_active ON bookings IS 
'Prevents overlapping bookings for the same room. Uses PostgreSQL EXCLUDE constraint with GIST index for atomic race-condition-free enforcement.';

-- ============================================================================
-- FIX #2: AUTOMATIC ROOM STATUS TRIGGERS
-- ============================================================================
-- These triggers automatically update room status when bookings change
-- No manual intervention needed!

-- Function: Update room status based on booking status changes
CREATE OR REPLACE FUNCTION fn_auto_update_room_status()
RETURNS TRIGGER AS $$
DECLARE
  v_has_active_booking BOOLEAN;
BEGIN
  -- Skip if no room assigned
  IF NEW.room_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Determine action based on booking status
  CASE NEW.status
    -- Booking created or confirmed: Mark room as reserved
    WHEN 'pending', 'confirmed' THEN
      UPDATE rooms SET status = 'reserved', updated_at = NOW()
      WHERE id = NEW.room_id AND status = 'available';
      
    -- Guest checked in: Mark room as occupied
    WHEN 'checked_in' THEN
      UPDATE rooms SET status = 'occupied', updated_at = NOW()
      WHERE id = NEW.room_id;
      
    -- Booking ended: Check if room should be freed
    WHEN 'checked_out', 'cancelled', 'no_show' THEN
      -- Check if any OTHER active bookings exist for this room
      SELECT EXISTS (
        SELECT 1 FROM bookings
        WHERE room_id = NEW.room_id
          AND id != NEW.id
          AND status IN ('pending', 'confirmed', 'checked_in')
          AND (
            -- Current or future booking
            check_in_date <= CURRENT_DATE AND check_out_date > CURRENT_DATE
            OR check_in_date > CURRENT_DATE
          )
      ) INTO v_has_active_booking;
      
      -- Only free room if no other active bookings
      IF NOT v_has_active_booking THEN
        UPDATE rooms SET status = 'available', updated_at = NOW()
        WHERE id = NEW.room_id;
      END IF;
      
    ELSE
      -- Unknown status - do nothing
      NULL;
  END CASE;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trg_auto_room_status ON bookings;

-- Create trigger for INSERT and UPDATE
CREATE TRIGGER trg_auto_room_status
AFTER INSERT OR UPDATE OF status ON bookings
FOR EACH ROW
EXECUTE FUNCTION fn_auto_update_room_status();

COMMENT ON FUNCTION fn_auto_update_room_status() IS 
'Automatically manages room status (available/reserved/occupied) based on booking status changes.';

-- ============================================================================
-- FIX #3: TRANSACTION-SAFE BOOKING CREATION FUNCTION
-- ============================================================================
-- This function creates bookings with row-level locking to prevent race conditions
-- It's called via Supabase RPC for atomic operation

-- Drop existing function first (required if return type changes)
DROP FUNCTION IF EXISTS create_booking_safe(UUID, UUID, UUID, DATE, DATE, TEXT, TEXT, TEXT, INTEGER, NUMERIC, NUMERIC, NUMERIC, TEXT, TEXT);

CREATE OR REPLACE FUNCTION create_booking_safe(
  p_user_id UUID,
  p_room_id UUID,
  p_room_type_id UUID,
  p_check_in_date DATE,
  p_check_out_date DATE,
  p_guest_name TEXT,
  p_guest_email TEXT,
  p_guest_phone TEXT,
  p_guest_count INTEGER DEFAULT 1,
  p_room_price NUMERIC DEFAULT 0,
  p_services_price NUMERIC DEFAULT 0,
  p_total_price NUMERIC DEFAULT 0,
  p_special_requests TEXT DEFAULT NULL,
  p_payment_method TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  booking_id UUID,
  booking_reference TEXT,
  error_code TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_booking_id UUID;
  v_booking_reference TEXT;
  v_room_available BOOLEAN;
  v_overlap_exists BOOLEAN;
BEGIN
  -- Validate dates
  IF p_check_out_date <= p_check_in_date THEN
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      NULL::TEXT, 
      'INVALID_DATES'::TEXT, 
      'Check-out date must be after check-in date'::TEXT;
    RETURN;
  END IF;
  
  IF p_check_in_date < CURRENT_DATE THEN
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      NULL::TEXT, 
      'PAST_DATE'::TEXT, 
      'Check-in date cannot be in the past'::TEXT;
    RETURN;
  END IF;

  -- Lock the room row to prevent concurrent modifications
  -- This is the KEY to preventing race conditions!
  PERFORM id FROM rooms WHERE id = p_room_id FOR UPDATE NOWAIT;
  
  -- Check room exists and is bookable
  SELECT status = 'available' OR status = 'reserved' INTO v_room_available
  FROM rooms WHERE id = p_room_id;
  
  IF v_room_available IS NULL THEN
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      NULL::TEXT, 
      'ROOM_NOT_FOUND'::TEXT, 
      'Room does not exist'::TEXT;
    RETURN;
  END IF;

  -- Check for overlapping active bookings (double-check in transaction)
  SELECT EXISTS (
    SELECT 1 FROM bookings
    WHERE room_id = p_room_id
      AND status IN ('pending', 'confirmed', 'checked_in')
      AND daterange(check_in_date, check_out_date, '[)') && 
          daterange(p_check_in_date, p_check_out_date, '[)')
  ) INTO v_overlap_exists;
  
  IF v_overlap_exists THEN
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      NULL::TEXT, 
      'ROOM_NOT_AVAILABLE'::TEXT, 
      'Room is already booked for the selected dates'::TEXT;
    RETURN;
  END IF;

  -- Generate unique booking reference
  v_booking_reference := 'BK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
                         UPPER(SUBSTRING(gen_random_uuid()::TEXT, 1, 8));

  -- Create the booking
  INSERT INTO bookings (
    id,
    booking_reference,
    user_id,
    room_id,
    room_type_id,
    check_in_date,
    check_out_date,
    guest_name,
    guest_email,
    guest_phone,
    guest_count,
    room_price,
    services_price,
    total_price,
    special_requests,
    payment_method,
    status,
    payment_status,
    created_at,
    updated_at
  ) VALUES (
    gen_random_uuid(),
    v_booking_reference,
    p_user_id,
    p_room_id,
    p_room_type_id,
    p_check_in_date,
    p_check_out_date,
    p_guest_name,
    p_guest_email,
    p_guest_phone,
    p_guest_count,
    p_room_price,
    p_services_price,
    p_total_price,
    p_special_requests,
    p_payment_method::payment_method,
    'pending'::booking_status,
    'pending'::payment_status,
    NOW(),
    NOW()
  )
  RETURNING id INTO v_booking_id;

  -- Room status is automatically updated by trigger

  -- Log the activity
  INSERT INTO activity_logs (user_id, action, entity_type, entity_id, details)
  VALUES (
    p_user_id,
    'create_booking',
    'booking',
    v_booking_id,
    jsonb_build_object(
      'booking_reference', v_booking_reference,
      'room_id', p_room_id,
      'check_in', p_check_in_date,
      'check_out', p_check_out_date,
      'total_price', p_total_price
    )
  );

  RETURN QUERY SELECT 
    TRUE, 
    v_booking_id, 
    v_booking_reference, 
    NULL::TEXT, 
    NULL::TEXT;

EXCEPTION
  WHEN lock_not_available THEN
    -- Another transaction is modifying this room
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      NULL::TEXT, 
      'ROOM_LOCKED'::TEXT, 
      'Room is currently being booked by another user. Please try again.'::TEXT;
  WHEN exclusion_violation THEN
    -- The EXCLUDE constraint caught an overlap
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      NULL::TEXT, 
      'ROOM_NOT_AVAILABLE'::TEXT, 
      'Room is already booked for the selected dates'::TEXT;
  WHEN OTHERS THEN
    RETURN QUERY SELECT 
      FALSE, 
      NULL::UUID, 
      NULL::TEXT, 
      'UNKNOWN_ERROR'::TEXT, 
      SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_booking_safe IS 
'Transaction-safe booking creation with row-level locking. Prevents race conditions and double-booking.';

-- ============================================================================
-- FIX #4: CHECK ROOM AVAILABILITY FUNCTION
-- ============================================================================
-- Database-level availability check (much faster & safer than frontend filtering)

-- Drop existing functions first (required if return type changes)
DROP FUNCTION IF EXISTS check_room_availability(UUID, DATE, DATE) CASCADE;
DROP FUNCTION IF EXISTS get_available_rooms CASCADE;
DROP FUNCTION IF EXISTS cleanup_expired_bookings CASCADE;

CREATE OR REPLACE FUNCTION check_room_availability(
  p_room_id UUID,
  p_check_in_date DATE,
  p_check_out_date DATE
)
RETURNS TABLE (
  is_available BOOLEAN,
  conflicting_bookings JSONB
) AS $$
BEGIN
  RETURN QUERY
  WITH conflicts AS (
    SELECT 
      id,
      booking_reference,
      check_in_date,
      check_out_date,
      status
    FROM bookings
    WHERE room_id = p_room_id
      AND status IN ('pending', 'confirmed', 'checked_in')
      AND daterange(check_in_date, check_out_date, '[)') && 
          daterange(p_check_in_date, p_check_out_date, '[)')
  )
  SELECT 
    NOT EXISTS (SELECT 1 FROM conflicts),
    COALESCE(
      (SELECT jsonb_agg(row_to_json(conflicts)) FROM conflicts),
      '[]'::JSONB
    );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Function to get all available rooms for a date range
CREATE OR REPLACE FUNCTION get_available_rooms(
  p_check_in_date DATE,
  p_check_out_date DATE,
  p_room_type_id UUID DEFAULT NULL,
  p_guest_count INTEGER DEFAULT 1
)
RETURNS TABLE (
  room_id UUID,
  room_number TEXT,
  room_type_id UUID,
  room_type_name TEXT,
  base_price NUMERIC,
  max_occupancy INTEGER,
  floor_number INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id AS room_id,
    r.room_number,
    r.room_type_id,
    rt.name AS room_type_name,
    rt.base_price,
    rt.max_occupancy,
    f.floor_number
  FROM rooms r
  JOIN room_types rt ON r.room_type_id = rt.id
  JOIN floors f ON r.floor_id = f.id
  WHERE r.is_active = TRUE
    AND r.status IN ('available', 'reserved')  -- Can be reserved for other dates
    AND rt.is_available = TRUE
    AND rt.max_occupancy >= p_guest_count
    AND (p_room_type_id IS NULL OR r.room_type_id = p_room_type_id)
    -- No overlapping active bookings
    AND NOT EXISTS (
      SELECT 1 FROM bookings b
      WHERE b.room_id = r.id
        AND b.status IN ('pending', 'confirmed', 'checked_in')
        AND daterange(b.check_in_date, b.check_out_date, '[)') && 
            daterange(p_check_in_date, p_check_out_date, '[)')
    )
  ORDER BY rt.base_price, f.floor_number, r.room_number;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

COMMENT ON FUNCTION get_available_rooms IS 
'Returns all available rooms for a date range. Handles all filtering at database level for performance and accuracy.';

-- ============================================================================
-- FIX #5: AUTOMATIC EXPIRED BOOKING CLEANUP
-- ============================================================================
-- Server-side function to clean up expired bookings (can be called by cron job)

CREATE OR REPLACE FUNCTION cleanup_expired_bookings()
RETURNS TABLE (
  cleaned_count INTEGER,
  freed_rooms INTEGER,
  details JSONB
) AS $$
DECLARE
  v_cleaned_count INTEGER := 0;
  v_freed_rooms INTEGER := 0;
  v_details JSONB := '[]'::JSONB;
  v_booking RECORD;
BEGIN
  -- Find and update expired bookings
  FOR v_booking IN 
    SELECT id, room_id, booking_reference, check_out_date
    FROM bookings
    WHERE status IN ('pending', 'confirmed')
      AND check_out_date < CURRENT_DATE
      AND room_id IS NOT NULL
  LOOP
    -- Mark as no-show
    UPDATE bookings 
    SET status = 'no_show', updated_at = NOW()
    WHERE id = v_booking.id;
    
    v_cleaned_count := v_cleaned_count + 1;
    
    -- Log the cleanup
    INSERT INTO activity_logs (action, entity_type, entity_id, details)
    VALUES (
      'auto_no_show',
      'booking',
      v_booking.id,
      jsonb_build_object(
        'reason', 'Expired without check-in',
        'check_out_date', v_booking.check_out_date,
        'cleaned_at', NOW()
      )
    );
    
    -- Collect details
    v_details := v_details || jsonb_build_object(
      'booking_reference', v_booking.booking_reference,
      'room_id', v_booking.room_id
    );
  END LOOP;
  
  -- Also handle checked_in bookings that should have checked out
  FOR v_booking IN 
    SELECT id, room_id, booking_reference, check_out_date
    FROM bookings
    WHERE status = 'checked_in'
      AND check_out_date < CURRENT_DATE
      AND room_id IS NOT NULL
  LOOP
    -- Mark as checked_out (late checkout scenario)
    UPDATE bookings 
    SET 
      status = 'checked_out', 
      actual_check_out_at = (check_out_date + INTERVAL '12 hours')::TIMESTAMPTZ,
      late_check_out = TRUE,
      updated_at = NOW()
    WHERE id = v_booking.id;
    
    v_cleaned_count := v_cleaned_count + 1;
    
    -- Log the auto-checkout
    INSERT INTO activity_logs (action, entity_type, entity_id, details)
    VALUES (
      'auto_checkout',
      'booking',
      v_booking.id,
      jsonb_build_object(
        'reason', 'Auto-checkout - past check-out date',
        'check_out_date', v_booking.check_out_date,
        'processed_at', NOW()
      )
    );
  END LOOP;

  -- Room status updates are handled by trigger automatically
  -- Count freed rooms
  SELECT COUNT(*) INTO v_freed_rooms
  FROM rooms
  WHERE status = 'available'
    AND updated_at >= NOW() - INTERVAL '1 minute';

  RETURN QUERY SELECT v_cleaned_count, v_freed_rooms, v_details;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_bookings IS 
'Automatically marks expired bookings as no-show/checked-out and frees rooms. Call via cron job or API endpoint.';

-- ============================================================================
-- FIX #6: BOOKING STATUS TRANSITION VALIDATION
-- ============================================================================
-- Ensures bookings can only transition through valid states

CREATE OR REPLACE FUNCTION fn_validate_booking_status_transition()
RETURNS TRIGGER AS $$
DECLARE
  v_valid_transitions JSONB := '{
    "pending": ["confirmed", "cancelled"],
    "confirmed": ["checked_in", "cancelled", "no_show"],
    "checked_in": ["checked_out"],
    "checked_out": [],
    "cancelled": [],
    "no_show": []
  }'::JSONB;
  v_allowed_statuses JSONB;
BEGIN
  -- Skip if status hasn't changed
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Get allowed transitions for current status
  v_allowed_statuses := v_valid_transitions -> OLD.status::TEXT;
  
  -- Check if transition is valid
  IF NOT (v_allowed_statuses ? NEW.status::TEXT) THEN
    RAISE EXCEPTION 'Invalid status transition from % to %. Allowed: %', 
      OLD.status, NEW.status, v_allowed_statuses;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_booking_status ON bookings;
CREATE TRIGGER trg_validate_booking_status
BEFORE UPDATE OF status ON bookings
FOR EACH ROW
EXECUTE FUNCTION fn_validate_booking_status_transition();

COMMENT ON FUNCTION fn_validate_booking_status_transition IS 
'Enforces valid booking status transitions: pending→confirmed→checked_in→checked_out';

-- ============================================================================
-- FIX #7: PAYMENT STATUS SYNCHRONIZATION
-- ============================================================================
-- Auto-confirm booking when payment is completed

CREATE OR REPLACE FUNCTION fn_sync_payment_booking_status()
RETURNS TRIGGER AS $$
BEGIN
  -- When payment becomes 'paid' and booking is 'pending', confirm the booking
  IF NEW.payment_status = 'paid' AND OLD.payment_status != 'paid' THEN
    IF NEW.status = 'pending' THEN
      NEW.status := 'confirmed';
      
      -- Log the auto-confirmation
      INSERT INTO activity_logs (action, entity_type, entity_id, details)
      VALUES (
        'auto_confirm',
        'booking',
        NEW.id,
        jsonb_build_object(
          'reason', 'Payment completed',
          'payment_status', NEW.payment_status,
          'confirmed_at', NOW()
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_payment_status ON bookings;
CREATE TRIGGER trg_sync_payment_status
BEFORE UPDATE OF payment_status ON bookings
FOR EACH ROW
EXECUTE FUNCTION fn_sync_payment_booking_status();

-- ============================================================================
-- FIX #8: UPDATED_AT AUTO-UPDATE
-- ============================================================================

CREATE OR REPLACE FUNCTION fn_update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables that need it
DO $$
DECLARE
  t TEXT;
BEGIN
  FOR t IN SELECT unnest(ARRAY['bookings', 'rooms', 'profiles', 'room_types', 'services', 'floors'])
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_updated_at ON %I', t);
    EXECUTE format('
      CREATE TRIGGER trg_updated_at
      BEFORE UPDATE ON %I
      FOR EACH ROW
      EXECUTE FUNCTION fn_update_updated_at()
    ', t);
  END LOOP;
END $$;

-- ============================================================================
-- FIX #9: INDEXES FOR PERFORMANCE
-- ============================================================================
-- Ensure all necessary indexes exist for fast queries

CREATE INDEX IF NOT EXISTS idx_bookings_room_dates 
ON bookings (room_id, check_in_date, check_out_date) 
WHERE status IN ('pending', 'confirmed', 'checked_in');

CREATE INDEX IF NOT EXISTS idx_bookings_active 
ON bookings (status) 
WHERE status IN ('pending', 'confirmed', 'checked_in');

CREATE INDEX IF NOT EXISTS idx_bookings_cleanup 
ON bookings (check_out_date, status) 
WHERE status IN ('pending', 'confirmed', 'checked_in');

CREATE INDEX IF NOT EXISTS idx_rooms_available 
ON rooms (room_type_id, status) 
WHERE is_active = TRUE;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
-- Allow authenticated users to call these functions

GRANT EXECUTE ON FUNCTION create_booking_safe TO authenticated;
GRANT EXECUTE ON FUNCTION check_room_availability TO authenticated;
GRANT EXECUTE ON FUNCTION get_available_rooms TO authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_bookings TO authenticated;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify the fixes are in place

/*
-- Check exclusion constraint exists
SELECT conname, contype, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conname = 'bookings_no_overlap_active';

-- Check triggers exist
SELECT tgname, tgrelid::regclass, tgenabled 
FROM pg_trigger 
WHERE tgname LIKE 'trg_%';

-- Check functions exist
SELECT proname, provolatile 
FROM pg_proc 
WHERE proname IN (
  'create_booking_safe', 
  'check_room_availability', 
  'get_available_rooms',
  'cleanup_expired_bookings'
);

-- Test room availability check
SELECT * FROM check_room_availability(
  'your-room-uuid'::UUID,
  '2025-01-20'::DATE,
  '2025-01-25'::DATE
);

-- Test get available rooms
SELECT * FROM get_available_rooms(
  '2025-01-20'::DATE,
  '2025-01-25'::DATE,
  NULL,
  2
);
*/

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '✅ BULLETPROOF BOOKING SYSTEM FIX APPLIED SUCCESSFULLY!';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 Race Condition Prevention: ACTIVE';
  RAISE NOTICE '🔄 Auto Room Status Updates: ACTIVE';
  RAISE NOTICE '📋 Status Transition Validation: ACTIVE';
  RAISE NOTICE '💳 Payment-Booking Sync: ACTIVE';
  RAISE NOTICE '🧹 Expired Booking Cleanup: READY';
  RAISE NOTICE '';
  RAISE NOTICE 'Next step: Update your application code to use create_booking_safe() function';
END $$;
