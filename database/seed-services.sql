-- ============================================================================
-- SEED SERVICES DATA
-- ============================================================================
-- Run this in Supabase SQL Editor to populate services

-- Insert sample services with correct categories and images
INSERT INTO services (name, slug, description, category, price, is_available, thumbnail_url, images) VALUES
-- Spa Services
('Swedish Massage', 'swedish-massage', 'Relaxing 60-minute full body massage with aromatic oils', 'spa', 120.00, true, 
  'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800', 
  ARRAY['https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=800']),
('Deep Tissue Massage', 'deep-tissue-massage', '90-minute therapeutic massage for muscle tension relief', 'spa', 150.00, true,
  'https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800',
  ARRAY['https://images.unsplash.com/photo-1519823551278-64ac92734fb1?w=800']),
('Hot Stone Therapy', 'hot-stone-therapy', 'Soothing heated stone massage treatment', 'spa', 140.00, true,
  'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800',
  ARRAY['https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800']),
('Facial Treatment', 'facial-treatment', 'Rejuvenating facial with premium skincare products', 'spa', 100.00, true,
  'https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800',
  ARRAY['https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?w=800']),
('Couples Spa Package', 'couples-spa-package', 'Romantic spa experience for two including massage and champagne', 'spa', 280.00, true,
  'https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800',
  ARRAY['https://images.unsplash.com/photo-1600334129128-685c5582fd35?w=800']),

-- Dining Services
('Breakfast Buffet', 'breakfast-buffet', 'International breakfast buffet with live cooking stations', 'dining', 35.00, true,
  'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=800',
  ARRAY['https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=800']),
('Lunch Set Menu', 'lunch-set-menu', 'Three-course lunch menu with beverage', 'dining', 45.00, true,
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
  ARRAY['https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800']),
('Fine Dining Dinner', 'fine-dining-dinner', 'Exquisite 5-course dinner by our award-winning chef', 'dining', 95.00, true,
  'https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800',
  ARRAY['https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=800']),
('In-Room Dining', 'in-room-dining', '24/7 room service menu delivered to your room', 'dining', 0.00, true,
  'https://images.unsplash.com/photo-1566554273541-37a9ca77b91f?w=800',
  ARRAY['https://images.unsplash.com/photo-1566554273541-37a9ca77b91f?w=800']),
('Private Chef Experience', 'private-chef', 'Personalized dining experience with private chef', 'dining', 250.00, true,
  'https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800',
  ARRAY['https://images.unsplash.com/photo-1556910103-1c02745aae4d?w=800']),
('Rooftop Bar Service', 'rooftop-bar', 'Premium cocktails and appetizers at our rooftop lounge', 'dining', 40.00, true,
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800',
  ARRAY['https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800']),

-- Transport Services
('Airport Pickup', 'airport-pickup', 'Comfortable airport transfer in luxury sedan', 'transport', 50.00, true,
  'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800',
  ARRAY['https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=800']),
('Airport Drop-off', 'airport-dropoff', 'Convenient drop-off service to the airport', 'transport', 45.00, true,
  'https://images.unsplash.com/photo-1464219789935-c2d9d9aba644?w=800',
  ARRAY['https://images.unsplash.com/photo-1464219789935-c2d9d9aba644?w=800']),
('City Tour', 'city-tour', 'Half-day guided city tour with driver', 'transport', 120.00, true,
  'https://images.unsplash.com/photo-1524850011238-e3d235c7d4c9?w=800',
  ARRAY['https://images.unsplash.com/photo-1524850011238-e3d235c7d4c9?w=800']),
('Car Rental', 'car-rental', 'Daily luxury car rental with driver', 'transport', 200.00, true,
  'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800',
  ARRAY['https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800']),
('Limousine Service', 'limousine-service', 'Premium limousine for special occasions', 'transport', 300.00, true,
  'https://images.unsplash.com/photo-1555353540-5e0c4c78e6d8?w=800',
  ARRAY['https://images.unsplash.com/photo-1555353540-5e0c4c78e6d8?w=800']),

-- Other Services
('Laundry Express', 'laundry-express', 'Same-day laundry and dry cleaning service', 'other', 30.00, true,
  'https://images.unsplash.com/photo-1517677129300-07b130802f46?w=800',
  ARRAY['https://images.unsplash.com/photo-1517677129300-07b130802f46?w=800']),
('Business Center Access', 'business-center', 'Full day access to business center facilities', 'other', 25.00, true,
  'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
  ARRAY['https://images.unsplash.com/photo-1497366216548-37526070297c?w=800']),
('Personal Concierge', 'personal-concierge', 'Dedicated concierge for your entire stay', 'other', 100.00, true,
  'https://images.unsplash.com/photo-1560807707-8cc77767d783?w=800',
  ARRAY['https://images.unsplash.com/photo-1560807707-8cc77767d783?w=800']),
('Event Planning', 'event-planning', 'Professional event planning and coordination', 'other', 500.00, true,
  'https://images.unsplash.com/photo-1519167758481-83f29da8c797?w=800',
  ARRAY['https://images.unsplash.com/photo-1519167758481-83f29da8c797?w=800']),
('Babysitting Service', 'babysitting', 'Professional childcare service per hour', 'other', 25.00, true,
  'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800',
  ARRAY['https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=800']),
('Fitness Personal Training', 'personal-training', 'One-on-one fitness session with certified trainer', 'other', 80.00, true,
  'https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800',
  ARRAY['https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=800']),
('Yoga Class', 'yoga-class', 'Group yoga session at our wellness center', 'other', 30.00, true,
  'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800',
  ARRAY['https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=800'])

ON CONFLICT (slug) DO NOTHING;

-- Verify insertion
SELECT 
  category,
  COUNT(*) as service_count,
  SUM(CASE WHEN is_available THEN 1 ELSE 0 END) as available_count
FROM services
GROUP BY category
ORDER BY category;

-- Display all services
SELECT id, name, category, price, is_available
FROM services
ORDER BY category, name;
