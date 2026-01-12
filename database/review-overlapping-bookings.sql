-- =====================================================
-- REVIEW OVERLAPPING BOOKINGS - READ-ONLY SCRIPT
-- =====================================================
-- This script ONLY displays overlapping bookings
-- Run this first to review conflicts before cleanup

-- Query 1: Count of overlapping booking pairs
-- =====================================================
SELECT 
    '📊 TOTAL OVERLAPPING BOOKING PAIRS' as info,
    COUNT(*) as count
FROM bookings b1
JOIN bookings b2 ON 
    b1.room_id = b2.room_id
    AND b1.id < b2.id
    AND b1.status IN ('pending', 'confirmed', 'checked_in')
    AND b2.status IN ('pending', 'confirmed', 'checked_in')
    AND daterange(b1.check_in_date, b1.check_out_date, '[)') && 
        daterange(b2.check_in_date, b2.check_out_date, '[)');

-- Query 2: Detailed view of ALL overlapping bookings
-- =====================================================
SELECT 
    '🔴 CONFLICT #' || ROW_NUMBER() OVER (ORDER BY b1.room_id, b1.check_in_date) as conflict_number,
    r.room_number,
    r.room_type,
    '---' as separator1,
    'BOOKING 1' as booking1_label,
    b1.id as booking1_id,
    b1.booking_reference as booking1_ref,
    b1.check_in_date as booking1_checkin,
    b1.check_out_date as booking1_checkout,
    b1.status as booking1_status,
    TO_CHAR(b1.created_at, 'YYYY-MM-DD HH24:MI:SS') as booking1_created,
    b1.total_price as booking1_price,
    '---' as separator2,
    'BOOKING 2' as booking2_label,
    b2.id as booking2_id,
    b2.booking_reference as booking2_ref,
    b2.check_in_date as booking2_checkin,
    b2.check_out_date as booking2_checkout,
    b2.status as booking2_status,
    TO_CHAR(b2.created_at, 'YYYY-MM-DD HH24:MI:SS') as booking2_created,
    b2.total_price as booking2_price,
    '---' as separator3,
    CASE 
        WHEN b1.created_at < b2.created_at THEN '✅ KEEP BOOKING 1 (created first)'
        WHEN b2.created_at < b1.created_at THEN '✅ KEEP BOOKING 2 (created first)'
        ELSE '⚠️  SAME TIME - Manual review needed'
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

-- Query 3: Bookings that would be cancelled (newer ones)
-- =====================================================
SELECT 
    '🗑️  BOOKINGS TO BE CANCELLED' as info,
    b2.id as booking_id,
    b2.booking_reference,
    r.room_number,
    b2.check_in_date,
    b2.check_out_date,
    b2.status,
    b2.total_price,
    TO_CHAR(b2.created_at, 'YYYY-MM-DD HH24:MI:SS') as created_at,
    'Conflicts with older booking: ' || b1.booking_reference as reason
FROM bookings b1
JOIN bookings b2 ON 
    b1.room_id = b2.room_id
    AND b1.id < b2.id
    AND b1.status IN ('pending', 'confirmed', 'checked_in')
    AND b2.status IN ('pending', 'confirmed', 'checked_in')
    AND daterange(b1.check_in_date, b1.check_out_date, '[)') && 
        daterange(b2.check_in_date, b2.check_out_date, '[)')
    AND b1.created_at < b2.created_at
LEFT JOIN rooms r ON b2.room_id = r.id
ORDER BY b2.created_at;

-- Query 4: Count by room
-- =====================================================
SELECT 
    r.room_number,
    r.room_type,
    COUNT(*) as overlap_count,
    STRING_AGG(b.booking_reference, ', ') as affected_bookings
FROM (
    SELECT DISTINCT b1.room_id, b1.id
    FROM bookings b1
    JOIN bookings b2 ON 
        b1.room_id = b2.room_id
        AND b1.id != b2.id
        AND b1.status IN ('pending', 'confirmed', 'checked_in')
        AND b2.status IN ('pending', 'confirmed', 'checked_in')
        AND daterange(b1.check_in_date, b1.check_out_date, '[)') && 
            daterange(b2.check_in_date, b2.check_out_date, '[)')
) conflicts
JOIN bookings b ON conflicts.id = b.id
JOIN rooms r ON conflicts.room_id = r.id
GROUP BY r.room_number, r.room_type
ORDER BY overlap_count DESC;

-- Query 5: Summary statistics
-- =====================================================
SELECT 
    'CURRENT BOOKING STATISTICS' as category,
    COUNT(*) FILTER (WHERE status = 'pending') as pending,
    COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
    COUNT(*) FILTER (WHERE status = 'checked_in') as checked_in,
    COUNT(*) FILTER (WHERE status = 'checked_out') as checked_out,
    COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
    COUNT(*) as total
FROM bookings;
