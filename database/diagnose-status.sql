-- =====================================================
-- DIAGNOSE BOOKING STATUS ISSUE
-- =====================================================
-- Let's see exactly what statuses the overlapping bookings have

-- Check the actual statuses
SELECT 
    status,
    COUNT(*) as count
FROM bookings
WHERE id IN (
    SELECT DISTINCT b1.id
    FROM bookings b1
    JOIN bookings b2 ON 
        b1.room_id = b2.room_id
        AND b1.id != b2.id
        AND daterange(b1.check_in_date, b1.check_out_date, '[)') && 
            daterange(b2.check_in_date, b2.check_out_date, '[)')
)
GROUP BY status;

-- Show the specific problem bookings
SELECT 
    b.id,
    b.booking_reference,
    b.room_id,
    r.room_number,
    b.check_in_date,
    b.check_out_date,
    b.status,
    b.created_at,
    'OVERLAPPING' as issue
FROM bookings b
LEFT JOIN rooms r ON b.room_id = r.id
WHERE b.id IN (
    SELECT DISTINCT b1.id
    FROM bookings b1
    JOIN bookings b2 ON 
        b1.room_id = b2.room_id
        AND b1.id != b2.id
        AND daterange(b1.check_in_date, b1.check_out_date, '[)') && 
            daterange(b2.check_in_date, b2.check_out_date, '[)')
)
ORDER BY b.room_id, b.check_in_date;

-- Show the exact pair causing the error
SELECT 
    'EXACT CONFLICT FROM ERROR MESSAGE' as info,
    b.id,
    b.booking_reference,
    b.check_in_date,
    b.check_out_date,
    b.status,
    b.created_at
FROM bookings b
WHERE b.room_id = '6fb6a0e1-c65e-4f69-8cb4-f89dfc54d042'
AND (
    daterange(b.check_in_date, b.check_out_date, '[)') && daterange('2026-01-13', '2026-01-14', '[)')
    OR
    daterange(b.check_in_date, b.check_out_date, '[)') && daterange('2026-01-13', '2026-01-15', '[)')
)
ORDER BY b.created_at;
