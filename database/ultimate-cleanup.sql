-- =====================================================
-- ULTIMATE CLEANUP - HANDLES ALL CASES
-- =====================================================
-- This script:
-- 1. Cancels ALL overlapping bookings (regardless of status)
-- 2. Then deletes them if cancellation isn't enough
-- 3. Guarantees constraint will work

-- STEP 1: Cancel ALL overlapping bookings first
UPDATE bookings
SET 
    status = 'cancelled',
    updated_at = NOW()
WHERE id IN (
    SELECT DISTINCT b2.id
    FROM bookings b1
    JOIN bookings b2 ON 
        b1.room_id = b2.room_id
        AND b1.id != b2.id
        AND daterange(b1.check_in_date, b1.check_out_date, '[)') && 
            daterange(b2.check_in_date, b2.check_out_date, '[)')
    WHERE b1.created_at < b2.created_at  -- Keep older, cancel newer
);

-- STEP 2: Verify they're all cancelled now
SELECT 
    'After cancellation' as step,
    status,
    COUNT(*) as count
FROM bookings
WHERE room_id = '6fb6a0e1-c65e-4f69-8cb4-f89dfc54d042'
AND check_in_date <= '2026-01-15'
AND check_out_date >= '2026-01-13'
GROUP BY status;

-- STEP 3: If that doesn't work, DELETE the overlapping ones
-- (This is commented out - uncomment if needed)
/*
DELETE FROM bookings
WHERE id IN (
    SELECT DISTINCT b2.id
    FROM bookings b1
    JOIN bookings b2 ON 
        b1.room_id = b2.room_id
        AND b1.id != b2.id
        AND daterange(b1.check_in_date, b1.check_out_date, '[)') && 
            daterange(b2.check_in_date, b2.check_out_date, '[)')
    WHERE b1.created_at < b2.created_at
);
*/

-- STEP 4: Final check - this should return 0 after cleanup
SELECT 
    'Final check - should be 0' as test,
    COUNT(*) as remaining_overlaps_in_active_statuses
FROM bookings b1
JOIN bookings b2 ON 
    b1.room_id = b2.room_id
    AND b1.id < b2.id
    AND b1.status IN ('pending', 'confirmed', 'checked_in')
    AND b2.status IN ('pending', 'confirmed', 'checked_in')
    AND daterange(b1.check_in_date, b1.check_out_date, '[)') && 
        daterange(b2.check_in_date, b2.check_out_date, '[)');

SELECT 'If the count above is 0, you can now run booking-system-bulletproof-fix.sql' as message;
