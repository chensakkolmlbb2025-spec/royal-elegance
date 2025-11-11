-- ============================================================================
-- SEED FLOORS DATA
-- ============================================================================
-- Run this SQL in Supabase SQL Editor to populate the floors table
-- ============================================================================

-- Insert sample floors if they don't exist
INSERT INTO floors (floor_number, name, description, total_rooms, is_active, created_at, updated_at)
VALUES
  (1, 'Ground Floor', 'Main lobby and reception area with premium rooms', 20, true, NOW(), NOW()),
  (2, 'Second Floor', 'Standard rooms with city view', 25, true, NOW(), NOW()),
  (3, 'Third Floor', 'Deluxe rooms with balcony', 25, true, NOW(), NOW()),
  (4, 'Fourth Floor', 'Executive suites with panoramic views', 20, true, NOW(), NOW()),
  (5, 'Fifth Floor', 'Luxury penthouses and VIP suites', 15, true, NOW(), NOW())
ON CONFLICT (floor_number) DO NOTHING;

-- Verify the data
SELECT 
  id,
  floor_number,
  name,
  description,
  total_rooms,
  is_active,
  created_at
FROM floors
ORDER BY floor_number;

-- Expected output:
-- You should see 5 floors listed from Ground Floor to Fifth Floor
