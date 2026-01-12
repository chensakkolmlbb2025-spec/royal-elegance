-- =====================================================
-- CLEANUP OVERLAPPING BOOKINGS - PRE-MIGRATION SCRIPT
-- =====================================================
-- Run this BEFORE booking-system-bulletproof-fix.sql
-- This script identifies and resolves overlapping bookings

-- Step 1: Identify all overlapping bookings
DO $$
DECLARE
    overlap_count INTEGER;
BEGIN
    RAISE NOTICE '🔍 STEP 1: Identifying overlapping bookings...';
    
    SELECT COUNT(*) INTO overlap_count
    FROM bookings b1
    JOIN bookings b2 ON 
        b1.room_id = b2.room_id
        AND b1.id < b2.id
        AND b1.status IN ('pending', 'confirmed', 'checked_in')
        AND b2.status IN ('pending', 'confirmed', 'checked_in')
        AND daterange(b1.check_in_date, b1.check_out_date, '[)') && 
            daterange(b2.check_in_date, b2.check_out_date, '[)');
    
    RAISE NOTICE '   Found % overlapping booking pairs', overlap_count;
END $$;

-- Step 2: Display overlapping bookings for review
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📋 STEP 2: Overlapping Bookings Details:';
    RAISE NOTICE '==========================================';
END $$;

SELECT 
    b1.id as booking1_id,
    b2.id as booking2_id,
    b1.room_id,
    r.room_number,
    b1.check_in_date as booking1_checkin,
    b1.check_out_date as booking1_checkout,
    b2.check_in_date as booking2_checkin,
    b2.check_out_date as booking2_checkout,
    b1.status as booking1_status,
    b2.status as booking2_status,
    b1.created_at as booking1_created,
    b2.created_at as booking2_created,
    CASE 
        WHEN b1.created_at < b2.created_at THEN 'Keep Booking 1 (older)'
        ELSE 'Keep Booking 2 (older)'
    END as recommendation
FROM bookings b1
JOIN bookings b2 ON 
    b1.room_id = b2.room_id
    AND b1.id < b2.id
    AND b1.status IN ('pending', 'confirmed', 'checked_in')
    AND b2.status IN ('pending', 'confirmed', 'checked_in')
    AND daterange(b1.check_in_date, b1.check_out_date, '[)') && 
        daterange(b2.check_in_date, b2.check_out_date, '[)')
LEFT JOIN rooms r ON b1.room_id = r.id
ORDER BY b1.room_id, b1.check_in_date;

-- Step 3: Auto-resolve overlapping bookings
DO $$
DECLARE
    cancelled_count INTEGER := 0;
    booking_to_cancel UUID;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 STEP 3: Auto-resolving conflicts...';
    RAISE NOTICE '   Strategy: Keep older booking, cancel newer one';
    RAISE NOTICE '';
    
    FOR booking_to_cancel IN
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
    LOOP
        UPDATE bookings
        SET 
            status = 'cancelled',
            updated_at = NOW()
        WHERE id = booking_to_cancel;
        
        cancelled_count := cancelled_count + 1;
        
        RAISE NOTICE '   ✓ Cancelled booking: %', booking_to_cancel;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Cancelled % overlapping bookings', cancelled_count;
END $$;

-- Step 4: Update room statuses for cancelled bookings
DO $$
DECLARE
    updated_rooms INTEGER := 0;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔧 STEP 4: Updating room statuses...';
    
    WITH rooms_to_update AS (
        SELECT DISTINCT room_id
        FROM bookings
        WHERE status = 'cancelled'
        AND updated_at > NOW() - INTERVAL '1 minute'
        AND room_id NOT IN (
            SELECT DISTINCT room_id
            FROM bookings
            WHERE status IN ('pending', 'confirmed', 'checked_in')
        )
    )
    UPDATE rooms
    SET 
        status = 'available',
        updated_at = NOW()
    WHERE id IN (SELECT room_id FROM rooms_to_update)
    AND status != 'available';
    
    GET DIAGNOSTICS updated_rooms = ROW_COUNT;
    
    RAISE NOTICE '   ✓ Updated % rooms to available', updated_rooms;
END $$;

-- Step 5: Final verification
DO $$
DECLARE
    remaining_overlaps INTEGER;
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '🔍 STEP 5: Final verification...';
    
    SELECT COUNT(*) INTO remaining_overlaps
    FROM bookings b1
    JOIN bookings b2 ON 
        b1.room_id = b2.room_id
        AND b1.id < b2.id
        AND b1.status IN ('pending', 'confirmed', 'checked_in')
        AND b2.status IN ('pending', 'confirmed', 'checked_in')
        AND daterange(b1.check_in_date, b1.check_out_date, '[)') && 
            daterange(b2.check_in_date, b2.check_out_date, '[)');
    
    IF remaining_overlaps = 0 THEN
        RAISE NOTICE '';
        RAISE NOTICE '✅✅✅ SUCCESS! No overlapping bookings remain';
        RAISE NOTICE '';
        RAISE NOTICE '📋 Next Steps:';
        RAISE NOTICE '   1. Review the cancelled bookings above';
        RAISE NOTICE '   2. Notify affected users if necessary';
        RAISE NOTICE '   3. Run booking-system-bulletproof-fix.sql';
        RAISE NOTICE '';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  WARNING: % overlapping bookings still remain', remaining_overlaps;
        RAISE NOTICE '   Please review manually before proceeding';
        RAISE NOTICE '';
    END IF;
END $$;

-- Step 6: Summary statistics
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '📊 CLEANUP SUMMARY';
    RAISE NOTICE '==================';
END $$;

SELECT 
    COUNT(*) FILTER (WHERE status = 'cancelled') as total_cancelled,
    COUNT(*) FILTER (WHERE status = 'pending') as total_pending,
    COUNT(*) FILTER (WHERE status = 'confirmed') as total_confirmed,
    COUNT(*) FILTER (WHERE status = 'checked_in') as total_checked_in,
    COUNT(*) FILTER (WHERE status = 'checked_out') as total_checked_out
FROM bookings;

SELECT 
    COUNT(*) FILTER (WHERE status = 'available') as available_rooms,
    COUNT(*) FILTER (WHERE status = 'reserved') as reserved_rooms,
    COUNT(*) FILTER (WHERE status = 'occupied') as occupied_rooms,
    COUNT(*) FILTER (WHERE status = 'maintenance') as maintenance_rooms
FROM rooms;
