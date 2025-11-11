// Debug script to test booking operations
require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function testBookingOperations() {
  try {
    console.log('Testing booking operations...')
    
    // Test 1: Get all bookings to see structure
    console.log('\n1. Getting all bookings:')
    const { data: allBookings, error: getAllError } = await supabase
      .from('bookings')
      .select('*')
      .limit(5)
    
    if (getAllError) {
      console.error('Error getting bookings:', getAllError)
    } else {
      console.log('Found bookings:', allBookings?.length || 0)
      if (allBookings && allBookings.length > 0) {
        console.log('First booking structure:', Object.keys(allBookings[0]))
        console.log('Sample booking:', allBookings[0])
      }
    }
    
    // Test 2: Try to get a specific booking if any exist
    if (allBookings && allBookings.length > 0) {
      const testBookingId = allBookings[0].id
      console.log(`\n2. Testing single booking query with ID: ${testBookingId}`)
      
      const { data: singleBooking, error: singleError } = await supabase
        .from('bookings')
        .select('*')
        .eq('id', testBookingId)
        .single()
      
      if (singleError) {
        console.error('Error getting single booking:', singleError)
      } else {
        console.log('Single booking found:', singleBooking)
      }
      
      // Test 3: Try update operation
      console.log(`\n3. Testing update operation on booking: ${testBookingId}`)
      const { data: updateResult, error: updateError } = await supabase
        .from('bookings')
        .update({ status: allBookings[0].status }) // Update with same status (no-op)
        .eq('id', testBookingId)
        .select()
      
      if (updateError) {
        console.error('Update error:', updateError)
      } else {
        console.log('Update result:', updateResult)
      }
    }
    
  } catch (error) {
    console.error('Test failed:', error)
  }
}

testBookingOperations()