import { createClient } from "@supabase/supabase-js"
import fs from "node:fs"
import path from "node:path"

// Load environment variables from .env.local or .env for Node scripts
function loadLocalEnv() {
  try {
    const cwd = process.cwd()
    const candidates = [".env.local", ".env"]
    for (const file of candidates) {
      const p = path.join(cwd, file)
      if (fs.existsSync(p)) {
        const content = fs.readFileSync(p, "utf8")
        for (const line of content.split(/\r?\n/)) {
          const trimmed = line.trim()
          if (!trimmed || trimmed.startsWith("#")) continue
          const idx = trimmed.indexOf("=")
          if (idx === -1) continue
          const key = trimmed.slice(0, idx).trim()
          let value = trimmed.slice(idx + 1).trim()
          if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1)
          }
          if (!(key in process.env)) process.env[key] = value
        }
        console.log(`[seed] Loaded environment variables from ${file}`)
        return
      }
    }
  } catch (e) {
    console.warn("[seed] Failed to load local env file:", e)
  }
}

loadLocalEnv()

// Supabase configuration using environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error(
    "Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL and one of SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  )
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  db: {
    schema: "public",
  },
  auth: {
    persistSession: false,
  },
})

// Demo users to create
const demoUsers = [
  {
    email: "admin@hotel.com",
    password: "Admin123!@#",
    fullName: "Admin User",
    phone: "+1234567890",
    role: "admin" as const,
  },
  {
    email: "staff@hotel.com",
    password: "Staff123!@#",
    fullName: "Staff Member",
    phone: "+1234567891",
    role: "staff" as const,
  },
  {
    email: "user@hotel.com",
    password: "User123!@#",
    fullName: "Regular User",
    phone: "+1234567892",
    role: "user" as const,
  },
]

// Four floors
const floors = [
  { floorNumber: 1, name: "Ground Floor", description: "Lobby and reception area", totalRooms: 5 },
  { floorNumber: 2, name: "Second Floor", description: "Premium rooms with garden view", totalRooms: 8 },
  { floorNumber: 3, name: "Third Floor", description: "Deluxe rooms with city view", totalRooms: 7 },
  { floorNumber: 4, name: "Fourth Floor", description: "Luxury suites with panoramic view", totalRooms: 5 },
]

// Four room types (matching ultimate schema)
const roomTypes = [
  {
    name: "Standard Room",
    slug: "standard-room",
    description: "Comfortable room with essential amenities",
    basePrice: 150.0,
    maxOccupancy: 2,
    bedType: "Queen",
    roomSize: 25.0,
    amenities: ["WiFi", "TV", "Air Conditioning", "Private Bathroom"],
    images: ["/luxury-hotel-deluxe-room.png"],
    thumbnailUrl: "/luxury-hotel-deluxe-room.png",
    tags: ["standard", "affordable", "cozy"],
    isAvailable: true,
  },
  {
    name: "Deluxe Room",
    slug: "deluxe-room",
    description: "Spacious room with premium amenities",
    basePrice: 250.0,
    maxOccupancy: 2,
    bedType: "King",
    roomSize: 35.0,
    amenities: ["WiFi", "Smart TV", "Air Conditioning", "Luxury Bathroom", "Mini Bar", "Work Desk"],
    images: ["/luxury-hotel-deluxe-room.png"],
    thumbnailUrl: "/luxury-hotel-deluxe-room.png",
    tags: ["deluxe", "premium", "spacious"],
    isAvailable: true,
  },
  {
    name: "Executive Suite",
    slug: "executive-suite",
    description: "Large suite with separate living area",
    basePrice: 450.0,
    maxOccupancy: 4,
    bedType: "2 Kings",
    roomSize: 60.0,
    amenities: [
      "WiFi",
      "Smart TV",
      "Air Conditioning",
      "Luxury Bathroom",
      "Mini Bar",
      "Living Room",
      "Kitchen",
      "Balcony",
    ],
    images: ["/luxury-hotel-executive-room.jpg"],
    thumbnailUrl: "/luxury-hotel-executive-room.jpg",
    tags: ["suite", "executive", "luxury", "family"],
    isAvailable: true,
  },
  {
    name: "Presidential Suite",
    slug: "presidential-suite",
    description: "Ultimate luxury with panoramic views",
    basePrice: 800.0,
    maxOccupancy: 6,
    bedType: "3 Kings",
    roomSize: 120.0,
    amenities: [
      "WiFi",
      "Smart TV",
      "Air Conditioning",
      "Luxury Bathroom",
      "Full Kitchen",
      "Dining Room",
      "Living Room",
      "2 Balconies",
      "Butler Service",
    ],
    images: ["/luxury-hotel-presidential-suite.png"],
    thumbnailUrl: "/luxury-hotel-presidential-suite.png",
    tags: ["presidential", "ultra-luxury", "panoramic", "vip"],
    isAvailable: true,
  },
]

async function seedDatabase() {
  console.log("🌱 Starting database seeding...")
  console.log("")

  try {
    // Step 1: Check for demo users (requires service role key to create)
    console.log("👥 Checking demo users...")
    const hasServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY
    
    if (!hasServiceRole) {
      console.log("   ⚠️  Service role key not found - skipping user creation")
      console.log("   ℹ️  To create demo users, follow instructions in: create-demo-users.sql")
      console.log("")
    } else {
      console.log("   ✓ Service role key detected - attempting to create users...")
      
      for (const demoUser of demoUsers) {
        // Check if user already exists
        const { data: existingProfiles } = await supabase
          .from("profiles")
          .select("email")
          .eq("email", demoUser.email)
          .limit(1)

        if (existingProfiles && existingProfiles.length > 0) {
          console.log(`   ✓ User already exists: ${demoUser.email} (${demoUser.role})`)
          continue
        }

        // Create user via Supabase Auth Admin API
        const { data: authData, error: authError } = await supabase.auth.admin.createUser({
          email: demoUser.email,
          password: demoUser.password,
          email_confirm: true,
          user_metadata: {
            full_name: demoUser.fullName,
            phone: demoUser.phone,
          },
        })

        if (authError) {
          console.error(`   ✗ Failed to create ${demoUser.email}:`, authError.message)
          console.error(`      Full error:`, JSON.stringify(authError, null, 2))
          continue
        }

        if (authData.user) {
          // Update profile with role
          const { error: updateError } = await supabase
            .from("profiles")
            .update({
              role: demoUser.role,
              phone: demoUser.phone,
              full_name: demoUser.fullName,
              email_verified: true,
            })
            .eq("id", authData.user.id)

          if (updateError) {
            console.error(`   ✗ Failed to update profile for ${demoUser.email}:`, updateError.message)
          } else {
            console.log(`   ✓ Created ${demoUser.role}: ${demoUser.email} / ${demoUser.password}`)
          }
        }
      }
      console.log("")
    }

    // Step 2: Add floors
    console.log("🏢 Adding floors...")
    const floorIds: string[] = []
    for (const floor of floors) {
      // Check if floor exists by floor_number
      const { data: existingRows, error: selectErr } = await supabase
        .from("floors")
        .select("id")
        .eq("floor_number", floor.floorNumber)
        .limit(1)
      
      if (selectErr) throw selectErr
      const existing = existingRows && existingRows[0]
      
      if (existing) {
        floorIds.push(existing.id)
        console.log(`   ✓ Floor exists: ${floor.name}`)
      } else {
        const { data, error } = await supabase
          .from("floors")
          .insert([
            {
              floor_number: floor.floorNumber,
              name: floor.name,
              description: floor.description,
              total_rooms: floor.totalRooms,
              is_active: true,
            },
          ])
          .select()
          .single()
        
        if (error) throw error
        floorIds.push(data.id)
        console.log(`   ✓ Added floor: ${floor.name}`)
      }
    }
    console.log("")

    // Step 3: Add room types
    console.log("🛏️  Adding room types...")
    const roomTypeIds: string[] = []
    for (const roomType of roomTypes) {
      // Check if room type exists by slug
      const { data: existingRows, error: selectErr } = await supabase
        .from("room_types")
        .select("id")
        .eq("slug", roomType.slug)
        .limit(1)
      
      if (selectErr) throw selectErr
      const existing = existingRows && existingRows[0]
      
      if (existing) {
        roomTypeIds.push(existing.id)
        console.log(`   ✓ Room type exists: ${roomType.name}`)
      } else {
        const { data, error } = await supabase
          .from("room_types")
          .insert([
            {
              name: roomType.name,
              slug: roomType.slug,
              description: roomType.description,
              base_price: roomType.basePrice,
              max_occupancy: roomType.maxOccupancy,
              bed_type: roomType.bedType,
              room_size: roomType.roomSize,
              amenities: roomType.amenities,
              images: roomType.images,
              thumbnail_url: roomType.thumbnailUrl,
              tags: roomType.tags,
              is_available: roomType.isAvailable,
            },
          ])
          .select()
          .single()
        
        if (error) throw error
        roomTypeIds.push(data.id)
        console.log(`   ✓ Added room type: ${roomType.name} ($${roomType.basePrice})`)
      }
    }
    console.log("")

    // Step 4: Add 25 rooms (distributed across floors and types)
    console.log("🚪 Adding rooms...")
    let roomsAdded = 0
    let roomNumber = 101

    for (let i = 0; i < 25; i++) {
      const roomTypeIndex = i % 4 // Cycle through 4 room types
      const floorIndex = i % 4 // Cycle through 4 floors

      const numberStr = roomNumber.toString()
      
      // Check if room exists by room_number
      const { data: existingRows, error: selectErr } = await supabase
        .from("rooms")
        .select("id")
        .eq("room_number", numberStr)
        .limit(1)
      
      if (selectErr) throw selectErr
      const existing = existingRows && existingRows[0]
      
      if (existing) {
        console.log(`   ✓ Room exists: ${numberStr}`)
      } else {
        const { error } = await supabase
          .from("rooms")
          .insert([
            {
              room_number: numberStr,
              floor_id: floorIds[floorIndex],
              room_type_id: roomTypeIds[roomTypeIndex],
              status: "available",
              is_active: true,
            },
          ])
        
        if (error) throw error
        roomsAdded++
        console.log(`   ✓ Added room: ${numberStr} (${roomTypes[roomTypeIndex].name})`)
      }
      roomNumber++
    }
    console.log("")

    // Step 5: Add services (6 services covering all categories)
    console.log("✨ Adding services...")
    const services = [
      {
        name: "Room Service",
        slug: "room-service",
        description: "24/7 in-room dining service",
        category: "room_service" as const,
        price: 0.0,
        isAvailable: true,
      },
      {
        name: "Spa Massage",
        slug: "spa-massage",
        description: "Relaxing full body massage",
        category: "spa" as const,
        price: 120.0,
        isAvailable: true,
        durationMinutes: 90,
      },
      {
        name: "Airport Transfer",
        slug: "airport-transfer",
        description: "Comfortable airport pickup and drop-off",
        category: "transport" as const,
        price: 50.0,
        isAvailable: true,
      },
      {
        name: "Laundry Service",
        slug: "laundry-service",
        description: "Same-day laundry and dry cleaning",
        category: "laundry" as const,
        price: 30.0,
        isAvailable: true,
      },
      {
        name: "Restaurant Breakfast",
        slug: "restaurant-breakfast",
        description: "Buffet breakfast at our restaurant",
        category: "dining" as const,
        price: 25.0,
        isAvailable: true,
      },
      {
        name: "Restaurant Dinner",
        slug: "restaurant-dinner",
        description: "Fine dining experience",
        category: "dining" as const,
        price: 60.0,
        isAvailable: true,
      },
    ]

    for (const service of services) {
      // Check if service exists by slug
      const { data: existingRows, error: selectErr } = await supabase
        .from("services")
        .select("id")
        .eq("slug", service.slug)
        .limit(1)
      
      if (selectErr) throw selectErr
      const existing = existingRows && existingRows[0]
      
      if (existing) {
        console.log(`   ✓ Service exists: ${service.name}`)
      } else {
        const { error } = await supabase.from("services").insert([
          {
            name: service.name,
            slug: service.slug,
            description: service.description,
            category: service.category,
            price: service.price,
            is_available: service.isAvailable,
            duration_minutes: service.durationMinutes || null,
          },
        ])
        
        if (error) throw error
        console.log(`   ✓ Added service: ${service.name} ($${service.price})`)
      }
    }
    console.log("")

    // Success summary
    console.log("=" .repeat(60))
    console.log("✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!")
    console.log("=" .repeat(60))
    console.log("")
    console.log("📊 Summary:")
    console.log(`   • Floors: ${floors.length} floors`)
    console.log(`   • Room Types: ${roomTypes.length} types`)
    console.log(`   • Rooms: 25 rooms total`)
    console.log(`   • Services: ${services.length} services`)
    console.log("")
    
    if (!hasServiceRole) {
      console.log("⚠️  DEMO USERS NOT CREATED")
      console.log("─" .repeat(60))
      console.log("   To create demo users, you have 2 options:")
      console.log("")
      console.log("   Option 1: Add Service Role Key to .env.local")
      console.log("   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key")
      console.log("   Then run: npm run seed")
      console.log("")
      console.log("   Option 2: Manual Creation (Recommended)")
      console.log("   1. Open: create-demo-users.sql")
      console.log("   2. Follow the step-by-step instructions")
      console.log("   3. Create users in Supabase Dashboard")
      console.log("   4. Run SQL to set roles")
      console.log("─" .repeat(60))
      console.log("")
    } else {
      console.log("🔑 Demo Credentials:")
      console.log("─" .repeat(60))
      demoUsers.forEach((user) => {
        console.log(`   ${user.role.toUpperCase().padEnd(10)} | ${user.email.padEnd(25)} | ${user.password}`)
      })
      console.log("─" .repeat(60))
      console.log("")
    }
    
    console.log("🚀 Next Steps:")
    console.log("   1. Create demo users (see create-demo-users.sql)")
    console.log("   2. Go to http://localhost:3000")
    console.log("   3. Log in with demo credentials")
    console.log("   4. Browse rooms at /rooms")
    console.log("   5. Admin dashboard at /admin (admin only)")
    console.log("")
  } catch (error) {
    console.error("")
    console.error("=" .repeat(60))
    console.error("❌ ERROR SEEDING DATABASE")
    console.error("=" .repeat(60))
    console.error(error)
    console.error("")
    process.exit(1)
  }
}

seedDatabase()
