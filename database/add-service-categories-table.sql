-- ============================================================================
-- ADD SERVICE CATEGORIES TABLE
-- ============================================================================
-- This migration adds a service_categories table to replace the enum approach

-- Create service_categories table
CREATE TABLE IF NOT EXISTS service_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT, -- Emoji or icon name
  color TEXT DEFAULT 'gray', -- Color for UI display
  is_default BOOLEAN DEFAULT FALSE, -- Cannot be deleted if true
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  CONSTRAINT service_categories_slug_format CHECK (slug ~ '^[a-z0-9_-]+$')
);

CREATE INDEX IF NOT EXISTS idx_service_categories_slug ON service_categories(slug);
CREATE INDEX IF NOT EXISTS idx_service_categories_sort_order ON service_categories(sort_order);

-- Apply updated_at trigger
CREATE TRIGGER update_service_categories_updated_at BEFORE UPDATE ON service_categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable RLS
ALTER TABLE service_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Public can read, admin can manage
CREATE POLICY "Public read service categories"
  ON service_categories FOR SELECT
  USING (TRUE);

CREATE POLICY "Admin manage service categories"
  ON service_categories FOR ALL
  USING (public.is_admin());

-- Insert default categories
INSERT INTO service_categories (name, slug, description, icon, color, is_default, sort_order) VALUES
('Spa & Wellness', 'spa', 'Relaxation and wellness services', '🧖', 'purple', true, 1),
('Dining', 'dining', 'Restaurant and food services', '🍽️', 'orange', true, 2),
('Transportation', 'transport', 'Airport transfers and car services', '🚗', 'blue', true, 3),
('Laundry', 'laundry', 'Laundry and dry cleaning services', '👔', 'cyan', true, 4),
('Room Service', 'room_service', '24/7 in-room services', '🛎️', 'green', true, 5),
('Other', 'other', 'Miscellaneous services', '✨', 'gray', true, 6)
ON CONFLICT (slug) DO NOTHING;

-- Add category_id column to services table
ALTER TABLE services ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES service_categories(id);

-- Migrate existing data from enum to category_id
UPDATE services SET category_id = (
  SELECT id FROM service_categories WHERE slug = services.category::text
) WHERE category_id IS NULL;

-- Create index
CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id);

-- Note: Keep the old 'category' enum column for backward compatibility
-- In production, you may want to:
-- 1. Make category_id NOT NULL after migration
-- 2. Drop the old category column
-- 3. Add foreign key constraint

-- Success message
DO $$
BEGIN
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'SERVICE CATEGORIES TABLE CREATED SUCCESSFULLY';
  RAISE NOTICE '============================================================================';
  RAISE NOTICE 'Changes:';
  RAISE NOTICE '  ✓ Created service_categories table';
  RAISE NOTICE '  ✓ Added 6 default categories';
  RAISE NOTICE '  ✓ Added category_id column to services table';
  RAISE NOTICE '  ✓ Migrated existing category data';
  RAISE NOTICE '  ✓ RLS policies configured';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Update application to use category_id instead of category enum';
  RAISE NOTICE '  2. Test CRUD operations on service_categories';
  RAISE NOTICE '  3. Consider dropping old category column in future migration';
  RAISE NOTICE '============================================================================';
END $$;
