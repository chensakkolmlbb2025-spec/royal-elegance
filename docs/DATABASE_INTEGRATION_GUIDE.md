# Database Integration Guide

This guide explains how to integrate Service Categories and User Management with your Supabase database.

## Overview

Two new features have been integrated with the database:

1. **Service Category Management** - Admin can CRUD service categories stored in `service_categories` table
2. **User Management** - Admin can CRUD staff and admin users (already integrated, uses `profiles` table)

## Prerequisites

- Supabase project set up
- Database schema applied (`database-ultimate-schema.sql`)
- Admin user created with role='admin' in profiles table
- Environment variables configured in `.env.local`

## Step 1: Apply Service Categories Migration

The migration file `add-service-categories-table.sql` will:
- Create `service_categories` table
- Insert 6 default categories (spa, dining, transport, laundry, room_service, other)
- Add `category_id` column to `services` table
- Migrate existing category data from enum to foreign key reference
- Configure RLS policies

### Option A: Via Supabase Dashboard (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the entire contents of `add-service-categories-table.sql`
5. Paste into the SQL editor
6. Click **Run** or press `Ctrl+Enter`
7. Check for success message in output

### Option B: Via Supabase CLI

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>

# Apply migration
supabase db push
```

Or run the SQL file directly:

```bash
psql <your-supabase-connection-string> -f add-service-categories-table.sql
```

## Step 2: Verify Migration

### Check Tables Created

Run this query in Supabase SQL Editor:

```sql
-- Check if service_categories table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'service_categories';

-- Check default categories inserted
SELECT * FROM service_categories ORDER BY sort_order;
```

You should see 6 default categories:
- Spa & Wellness (spa)
- Dining (dining)
- Transportation (transport)
- Laundry (laundry)
- Room Service (room_service)
- Other (other)

### Check Services Table Updated

```sql
-- Check if category_id column was added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'services' 
  AND column_name = 'category_id';

-- Check data migration
SELECT s.name, s.category, sc.name as category_name
FROM services s
LEFT JOIN service_categories sc ON s.category_id = sc.id
LIMIT 10;
```

## Step 3: Update Existing Services (If Needed)

If you have existing services without `category_id`, run:

```sql
-- Migrate existing services to use category_id
UPDATE services 
SET category_id = (
  SELECT id FROM service_categories 
  WHERE slug = services.category::text
)
WHERE category_id IS NULL;
```

## Step 4: Verify User Management (Already Integrated)

User management is already working with the database. No migration needed.

### Test User Management

1. Login as admin
2. Go to **Admin Dashboard → Users** tab
3. Click **Add User**
4. Create a test staff user:
   - Email: staff@test.com
   - Password: test123456
   - Role: Staff
   - Full Name: Test Staff
5. Check the user appears in the table
6. Verify in Supabase:

```sql
-- Check user was created in auth
SELECT id, email, created_at 
FROM auth.users 
WHERE email = 'staff@test.com';

-- Check profile was created with correct role
SELECT id, email, role, full_name 
FROM profiles 
WHERE email = 'staff@test.com';
```

## Step 5: Test Service Category Management

1. Login as admin
2. Go to **Admin Dashboard → Categories** tab
3. You should see 6 default categories
4. Try adding a custom category:
   - Name: "Entertainment"
   - Description: "Entertainment and activities"
   - Icon: 🎭
   - Color: Pink
5. Click **Add Category**
6. Verify in database:

```sql
SELECT * FROM service_categories WHERE slug = 'entertainment';
```

7. Try editing a category
8. Try deleting your custom category (default categories cannot be deleted)

## Step 6: Update Service Management to Use Categories

Currently, the `service-management.tsx` component still uses the old `category` enum. You may want to update it to use the new `service_categories` table:

1. Add category dropdown in service form
2. Load categories from `service_categories` table
3. Save `category_id` instead of `category` enum
4. Update display to show category name from joined table

Example query for services with category names:

```sql
SELECT 
  s.*,
  sc.name as category_name,
  sc.icon as category_icon,
  sc.color as category_color
FROM services s
LEFT JOIN service_categories sc ON s.category_id = sc.id
ORDER BY s.name;
```

## Troubleshooting

### Migration Fails

**Error: relation "service_categories" already exists**
- The table was already created. Skip the CREATE TABLE statement.

**Error: enum value does not match**
- Check the `category` column values in services table match the enum values exactly.

### RLS Policies Issues

**Error: permission denied for table service_categories**
- Ensure you're logged in as admin
- Check RLS policies were created:

```sql
SELECT * FROM pg_policies WHERE tablename = 'service_categories';
```

- If missing, run the RLS policy section from the migration file.

### User Management Issues

**Cannot create users**
- Check Supabase Auth email confirmation settings
- Verify admin role in profiles table:

```sql
SELECT email, role FROM profiles WHERE role = 'admin';
```

**Created user doesn't appear**
- Check both auth.users and profiles tables
- Ensure the profile trigger is working:

```sql
-- Check trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

## Database Schema Reference

### service_categories Table

```sql
id              UUID PRIMARY KEY
name            TEXT NOT NULL UNIQUE
slug            TEXT NOT NULL UNIQUE
description     TEXT
icon            TEXT (emoji)
color           TEXT (color name: purple, blue, green, etc.)
is_default      BOOLEAN (cannot be deleted if true)
sort_order      INTEGER
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
created_by      UUID (references profiles)
```

### services Table (Updated)

```sql
-- New column added:
category_id     UUID (references service_categories)

-- Old column (keep for backward compatibility):
category        service_category enum
```

### profiles Table (Existing)

```sql
id              UUID PRIMARY KEY (references auth.users)
email           TEXT UNIQUE NOT NULL
role            user_role ('admin', 'staff', 'user')
full_name       TEXT
phone           TEXT
-- ... other fields
```

## Next Steps

1. ✅ Apply service categories migration
2. ✅ Verify tables created and default data inserted
3. ✅ Test service category CRUD operations
4. ✅ Test user management CRUD operations
5. 🔄 **Optional**: Update service management to use category foreign key
6. 🔄 **Optional**: Add category filtering in services page
7. 🔄 **Optional**: Display category badges on service cards

## Support

If you encounter issues:
1. Check Supabase logs in Dashboard → Logs
2. Check browser console for errors
3. Verify environment variables are set correctly
4. Ensure you're logged in as admin user
5. Check RLS policies are configured properly

## Files Modified

### New Files
- `add-service-categories-table.sql` - Migration file
- `DATABASE_INTEGRATION_GUIDE.md` - This guide

### Modified Files
- `lib/types.ts` - Added ServiceCategory interface, categoryId to Service
- `lib/supabase-service.ts` - Added service category CRUD functions
- `components/admin/service-category-management.tsx` - Integrated with database
- `components/admin/user-management.tsx` - Already integrated (no changes needed)

### Database Tables Affected
- `service_categories` - New table
- `services` - Added category_id column
- `profiles` - Existing table used by user management
- `auth.users` - Managed by Supabase Auth

## Success Criteria

✅ Service categories table created with 6 defaults
✅ Service category CRUD works in admin panel
✅ User management CRUD works in admin panel
✅ Admin can create staff users with correct roles
✅ RLS policies prevent unauthorized access
✅ Build completes without errors
✅ All components render without errors

---

Last Updated: 2025-11-07
Version: 1.0
