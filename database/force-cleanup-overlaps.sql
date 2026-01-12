-- =====================================================
-- FORCE CLEANUP - DELETE OVERLAPPING BOOKINGS
-- =====================================================
-- This script DELETES (not cancels) overlapping bookings
-- More aggressive than the cancel approach

-- First, let's see what we're dealing with
SELECT 
    'CURRENT OVERLAPPING BOOKINGS' as status,
    COUNT(*) as total_conflicts
FROM bookings b1
JOIN bookings b2 ON 
    b1.room_id = b2.room_id
    AND b1.id < b2.id
    AND b1.status IN ('pending', 'confirmed', 'checked_in')
    AND b2.status IN ('pending', 'confirmed', 'checked_in')
    AND daterange(b1.check_in_date, b1.check_out_date, '[)') && 
        daterange(b2.check_in_date, b2.check_out_date, '[)');

-- Show the conflicting bookings
SELECT 
    b1.id as older_booking_id,
    b1.booking_reference as older_ref,
    b1.check_in_date as older_checkin,
    b1.check_out_date as older_checkout,
    b1.created_at as older_created,
    '---' as separator,
    b2.id as newer_booking_id,
    b2.booking_reference as newer_ref,
    b2.check_in_date as newer_checkin,
    b2.check_out_date as newer_checkout,
    b2.created_at as newer_created,
    '---' as separator2,
    r.room_number,
    'WILL DELETE NEWER' as action
FROM bookings b1
JOIN bookings b2 ON 
    b1.room_id = b2.room_id
    AND b1.id < b2.id
    AND b1.status IN ('pending', 'confirmed', 'checked_in')
    AND b2.status IN ('pending', 'confirmed', 'checked_in')
    AND daterange(b1.check_in_date, b1.check_out_date, '[)') && 
        daterange(b2.check_in_date, b2.check_out_date, '[)')
    AND b1.created_at < b2.created_at
LEFT JOIN rooms r ON b1.room_id = r.id
ORDER BY b1.room_id, b1.created_at;

-- DELETE the newer overlapping bookings (created later)
-- This is permanent - they will be removed from the database
DELETE FROM bookings
WHERE id IN (
    SELECT DISTINCT b2.id
    FROM bookings b1
    JOIN bookings b2 ON 
        b1.room_id = b2.room_id
        AND b1.id < b2.id
        AND b1.status IN ('pending', 'confirmed', 'checked_in')
        AND b2.status IN ('pending', 'confirmed', 'checked_in')
        AND daterange(b1.check_in_date, b1.check_out_date, '[)') && 
            daterange(b2.check_in_date, b2.check_out_date, '[)')
    WHERE b1.created_at < b2.created_at
);

-- Verify cleanup
SELECT 
    'AFTER CLEANUP' as status,
    COUNT(*) as remaining_conflicts
FROM bookings b1
JOIN bookings b2 ON 
    b1.room_id = b2.room_id
    AND b1.id < b2.id
    AND b1.status IN ('pending', 'confirmed', 'checked_in')
    AND b2.status IN ('pending', 'confirmed', 'checked_in')
    AND daterange(b1.check_in_date, b1.check_out_date, '[)') && 
        daterange(b2.check_in_date, b2.check_out_date, '[)');

-- Update room statuses
UPDATE rooms
SET 
    status = 'available',
    updated_at = NOW()
WHERE id NOT IN (
    SELECT DISTINCT room_id
    FROM bookings
    WHERE status IN ('pending', 'confirmed', 'checked_in')
)
AND status != 'available';

SELECT 'CLEANUP COMPLETE - Ready to run booking-system-bulletproof-fix.sql' as message;
