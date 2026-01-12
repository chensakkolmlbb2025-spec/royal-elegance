# Database — Core Tables Reference

This document explains the core PostgreSQL tables used by the Royal Elegance hotel booking system. It describes purpose, important fields, relationships, constraints, indexes, triggers, RLS notes and useful verification queries.

Use this as a quick reference when reading SQL files under `database/`, or when diagnosing booking/room issues.

---

## Conventions
- Column types below are illustrative (UUID, DATE, TIMESTAMP, TEXT, NUMERIC, JSONB, BOOLEAN, INTEGER).
- "FK → table(column)" means a foreign key relationship.
- Active booking statuses: `pending`, `confirmed`, `checked_in` (the EXCLUDE constraint applies to these).

---

## 1) `profiles` — Users / accounts
Purpose: Stores per-user profile information (linked to Supabase auth users).

Key columns:
- `id UUID` — PK, usually same as `auth.users.id` (FK or manually kept in sync).
- `email TEXT` — user's email.
- `full_name TEXT` — display name.
- `phone TEXT` — contact phone.
- `role TEXT` — enum-like values: `guest`, `staff`, `admin`.
- `avatar_url TEXT` — link to storage.
- `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.

Notes:
- A trigger may auto-create a `profiles` row when a new auth user is created (see `database/add-profile-trigger.sql`).
- RLS: users typically can read/update their own profile; staff/admin can read/update all.

Useful queries:
- Count by role: `SELECT role, count(*) FROM profiles GROUP BY role;`
- Find recent signups: `SELECT id, email, created_at FROM profiles ORDER BY created_at DESC LIMIT 10;`

---

## 2) `room_types` — Room categories
Purpose: Metadata for types of rooms (e.g., Deluxe, Suite). Used when pricing and filtering.

Key columns:
- `id UUID` — PK.
- `name TEXT`, `slug TEXT`.
- `description TEXT`.
- `base_price NUMERIC` — per-night base price.
- `max_occupancy INTEGER` — maximum guests.
- `amenities JSONB` — list of amenities.
- `is_available BOOLEAN`, `created_at`, `updated_at`.

Notes:
- Keep this small; `get_available_rooms()` and UI will join to read prices and occupancy.

---

## 3) `rooms` — Physical rooms
Purpose: The inventory of actual rooms in the property.

Key columns:
- `id UUID` — PK.
- `room_number TEXT` — human-facing identifier.
- `room_type_id UUID` — FK → `room_types(id)`.
- `floor_id UUID` — FK → `floors(id)` (if floors exist).
- `status TEXT` — `available`, `reserved`, `occupied`, `maintenance`.
- `is_active BOOLEAN` — if the room is usable.
- `last_cleaned TIMESTAMP`, `updated_at TIMESTAMP`.

Indexes:
- `idx_rooms_available` — composite index to quickly find available rooms by type/status.

Triggers:
- `trg_auto_room_status` — (from booking triggers) updates `rooms.status` when bookings change.

RLS:
- Typically readable by anyone, writable only by staff/admin.

Useful queries:
- Rooms currently available of a type: `SELECT * FROM rooms WHERE room_type_id = $1 AND status = 'available';`

---

## 4) `bookings` — Reservations (most critical table)
Purpose: Stores all reservations. This table is the focus of race-condition fixes and EXCLUDE constraint.

Key columns (typical):
- `id UUID` — PK.
- `booking_reference TEXT` — human-friendly code.
- `user_id UUID` — FK → `profiles(id)` (who made the booking).
- `room_id UUID` — FK → `rooms(id)` (may be NULL if using room_type allocation).
- `room_type_id UUID` — FK → `room_types(id)` (if booking by type).
- `check_in_date DATE`, `check_out_date DATE` — date range, `[check_in, check_out)` semantics.
- `guest_count INTEGER`, `guest_name`, `guest_email`, `guest_phone`.
- `room_price NUMERIC`, `services_price NUMERIC`, `total_price NUMERIC`.
- `status TEXT` — enum values: `pending`, `confirmed`, `checked_in`, `checked_out`, `cancelled`, `no_show`.
- `payment_status TEXT` — e.g., `pending`, `paid`, `failed`.
- `actual_check_in_at TIMESTAMPTZ`, `actual_check_out_at TIMESTAMPTZ`.
- `created_at TIMESTAMPTZ`, `updated_at TIMESTAMPTZ`.

Critical constraints and logic:
- EXCLUDE constraint named `bookings_no_overlap_active`:
  - Prevents overlapping active bookings for the same room. Example form:

```sql
ALTER TABLE bookings ADD CONSTRAINT bookings_no_overlap_active
EXCLUDE USING GIST (
  room_id WITH =,
  daterange(check_in_date, check_out_date, '[)') WITH &&
)
WHERE (status IN ('pending', 'confirmed', 'checked_in'));
```

- This constraint requires the `btree_gist` extension and a valid GIST index on the range expression.
- Because the constraint only applies to active statuses, cancelled or historical bookings are ignored.

Indexes:
- `idx_bookings_room_dates` — for fast overlap and date queries.
- `idx_bookings_active` — filtered index on active statuses.
- `idx_bookings_cleanup` — index on `check_out_date` + `status` to support cleanup jobs.

Triggers & functions:
- `fn_validate_booking_status_transition` — ensures only allowed transitions occur.
- `trg_auto_room_status` (via `fn_auto_update_room_status`) — updates room status on booking changes.
- `create_booking_safe()` — a transaction-safe function to create bookings with row locking and overlap re-check.
- `check_room_availability()` and `get_available_rooms()` — RPC functions to check availability safely from server or client.
- `cleanup_expired_bookings()` — marks expired reservations as `no_show` or `checked_out` and frees rooms.

Notes about existing data and migrations:
- If overlapping active bookings already exist, the EXCLUDE constraint will fail to CREATE. A pre-migration cleanup is required (scripts: `cleanup-overlapping-bookings.sql`, `force-cleanup-overlaps.sql`, `ultimate-cleanup.sql`).
- Always backup before running destructive cleanup.

Useful diagnostic queries:
- Find overlapping active pairs:
```sql
SELECT b1.id as a, b2.id as b, b1.room_id
FROM bookings b1
JOIN bookings b2 ON b1.room_id = b2.room_id
  AND b1.id < b2.id
  AND daterange(b1.check_in_date,b1.check_out_date,'[)') &&
      daterange(b2.check_in_date,b2.check_out_date,'[)')
WHERE b1.status IN ('pending','confirmed','checked_in')
  AND b2.status IN ('pending','confirmed','checked_in');
```
- Check constraint existence:
```sql
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'bookings_no_overlap_active';
```

---

## 5) `booking_services` — booking ↔ service (join table)
Purpose: Many-to-many mapping of optional services attached to a booking (spa, breakfast, airport pickup).

Key columns:
- `booking_id UUID` — FK → `bookings(id)`.
- `service_id UUID` — FK → `services(id)`.
- `quantity INTEGER`, `price NUMERIC`.

Notes:
- Used when calculating `services_price` and `total_price` on booking creation.

---

## 6) `services` and `service_categories`
Purpose: Service catalog (spa, dining, activities).

Key columns (`services`):
- `id UUID`, `name`, `description`, `category_id` FK → `service_categories(id)`.
- `price NUMERIC`, `duration_minutes INTEGER`, `max_capacity INTEGER`, `available BOOLEAN`.

Key columns (`service_categories`):
- `id UUID`, `name`, `slug`, `icon`, `sort_order`.

Notes:
- Services can be booked stand-alone or attached to a room booking.

---

## 7) `activity_logs` — audit trail
Purpose: Track important actions for debugging, accountability and audit.

Key columns:
- `id UUID`, `user_id UUID`, `action TEXT` (e.g., `create_booking`, `auto_checkout`).
- `entity_type TEXT` (e.g., `booking`, `room`), `entity_id UUID`.
- `details JSONB` — contextual data.
- `created_at TIMESTAMPTZ`.

Notes:
- Most triggers and server-side functions insert records here for observability.
- Maintain retention and archiving as necessary.

---

## 8) `floors` (optional) and other support tables
- `floors` — floor_number, description.
- `room_images`, `service_images` (if present) — storage mapping.
- `payments` or external payment metadata — store payment provider id, status, metadata if needed.

---

## Common constraints & enums
- Booking statuses: `pending`, `confirmed`, `checked_in`, `checked_out`, `cancelled`, `no_show`.
- Payment statuses: `pending`, `paid`, `failed`.
- Room statuses: `available`, `reserved`, `occupied`, `maintenance`.

These are often represented by `TEXT` columns with CHECK constraints or PostgreSQL `ENUM` types. Check `database/database-ultimate-schema.sql` for the exact implementation used in this repository.

---

## Row-Level Security (RLS) notes
- Supabase uses RLS to enforce per-user access rules. Typical policies:
  - `bookings`: owners can SELECT/UPDATE their bookings; staff/admin can see all.
  - `profiles`: owners can view/edit their profile; staff/admin have admin privileges.
  - `rooms`: public read for availability; only staff/admin can modify room records.

If you change table schemas or function privileges, review and update RLS policies (files like `database/fix-booking-rls-policy.sql`).

---

## Migration & deployment tips
- Always run diagnostics (see `diagnose-status.sql`) before applying the EXCLUDE constraint migration.
- If the EXCLUDE constraint creation fails with `could not create exclusion constraint` it means overlapping rows exist — run `review-overlapping-bookings.sql` then `cleanup-overlapping-bookings.sql` or `ultimate-cleanup.sql`.
- For function recreation errors (`cannot change return type of existing function`), the migration already drops functions using `DROP FUNCTION IF EXISTS ...` or `CASCADE` before re-creating them.

---

## Quick verification checklist after migration
1. Confirm `btree_gist` extension:
```sql
SELECT * FROM pg_extension WHERE extname = 'btree_gist';
```
2. Confirm EXCLUDE constraint exists:
```sql
SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'bookings_no_overlap_active';
```
3. Check that `create_booking_safe`, `check_room_availability`, `get_available_rooms`, `cleanup_expired_bookings` functions exist:
```sql
SELECT proname FROM pg_proc WHERE proname IN ('create_booking_safe','check_room_availability','get_available_rooms','cleanup_expired_bookings');
```
4. Run a simulated overlap test (attempt to insert overlapping active booking) — expect failure.

---

## Useful example queries
- Get available rooms for given dates (the SQL function `get_available_rooms` is preferred):
```sql
SELECT * FROM get_available_rooms('2026-01-20'::DATE, '2026-01-23'::DATE, NULL, 2);
```

- Check specific room availability:
```sql
SELECT * FROM check_room_availability('ROOM-UUID'::UUID, '2026-01-20'::DATE, '2026-01-21'::DATE);
```

- Create booking with the safe RPC (example invocation in Supabase SQL client):
```sql
SELECT * FROM create_booking_safe(
  'user-uuid'::UUID,
  'room-uuid'::UUID,
  'room-type-uuid'::UUID,
  '2026-02-01'::DATE,
  '2026-02-03'::DATE,
  'Guest Name', 'guest@example.com', '+855...',
  2, 100, 10, 110, NULL, 'card'
);
```

---

## Troubleshooting common issues
1. EXCLUDE constraint creation fails — run the review script and cleanup scripts, or delete conflicting rows after backed-up.
2. `cannot change return type of existing function` — run migrations that DROP the old function before CREATE (the repo migration already includes DROP statements).
3. Real-time updates not arriving — check Supabase Realtime channel permissions and RLS policies.

---

## Final notes
- The `bookings` table is the heart of the application — pay attention to its indexes, constraints, and triggers.
- Prefer using provided RPCs (`create_booking_safe`, `check_room_availability`, `get_available_rooms`) rather than ad-hoc writes from client code. These functions encapsulate business logic and protect against race conditions.

If you want, I can:
- Add ER diagram images and field types to this document.
- Generate a short SQL test script that attempts controlled overlapping inserts and demonstrates the constraint behavior.
- Convert this doc into a printable checklist for staging/production migrations.

Which of the follow-ups would you like next?