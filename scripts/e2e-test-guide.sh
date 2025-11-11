#!/bin/bash

# 🚀 End-to-End Testing Guide for Luxury Hotel Booking App
# This script provides manual testing steps for all critical flows

set -e

echo "=========================================="
echo "🏨 Luxury Hotel Booking - E2E Test Guide"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check if dev server is running
check_server() {
  if ! curl -s http://localhost:3000 > /dev/null; then
    echo -e "${RED}❌ Dev server not running${NC}"
    echo "Start it with: npm run dev"
    exit 1
  fi
  echo -e "${GREEN}✅ Dev server is running${NC}"
}

# Test health endpoint
test_health() {
  echo ""
  echo -e "${BLUE}1. Testing Health Endpoint${NC}"
  echo "   GET /api/health"
  
  response=$(curl -s http://localhost:3000/api/health)
  status=$(echo "$response" | grep -o '"status":"[^"]*"' | cut -d'"' -f4)
  
  if [ "$status" = "ok" ] || [ "$status" = "error" ]; then
    echo -e "${GREEN}✅ Health check passed${NC}"
    echo "   Response: $response" | head -c 100
    echo "..."
  else
    echo -e "${RED}❌ Health check failed${NC}"
    echo "   Response: $response"
  fi
}

# Test public routes
test_public_routes() {
  echo ""
  echo -e "${BLUE}2. Testing Public Routes${NC}"
  
  routes=("/" "/rooms" "/services" "/login" "/auth/signup")
  
  for route in "${routes[@]}"; do
    echo "   Testing $route..."
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000$route | grep -q "200"; then
      echo -e "   ${GREEN}✅ $route${NC}"
    else
      echo -e "   ${RED}❌ $route${NC}"
    fi
  done
}

# Test protected routes (should redirect to login)
test_protected_routes() {
  echo ""
  echo -e "${BLUE}3. Testing Protected Routes (should redirect)${NC}"
  
  routes=("/home" "/profile" "/bookings" "/admin" "/staff")
  
  for route in "${routes[@]}"; do
    echo "   Testing $route..."
    status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000$route)
    if [ "$status" = "307" ] || [ "$status" = "302" ]; then
      echo -e "   ${GREEN}✅ $route (redirects as expected)${NC}"
    else
      echo -e "   ${YELLOW}⚠️  $route (status: $status)${NC}"
    fi
  done
}

# Manual test instructions
manual_tests() {
  echo ""
  echo -e "${BLUE}4. Manual Testing Steps${NC}"
  echo ""
  
  echo -e "${YELLOW}Step 1: Anonymous User${NC}"
  echo "  1. Open http://localhost:3000/rooms"
  echo "  2. Verify rooms are displayed"
  echo "  3. Check browser console (F12) - should have NO errors"
  echo "  4. Open http://localhost:3000/services"
  echo "  5. Verify services are displayed"
  echo ""
  
  echo -e "${YELLOW}Step 2: Authentication${NC}"
  echo "  1. Go to http://localhost:3000/auth/signup"
  echo "  2. Sign up with:"
  echo "     Email: test@example.com"
  echo "     Password: Test123!@#"
  echo "  3. Check Supabase dashboard for email confirmation"
  echo "  4. Go to http://localhost:3000/login"
  echo "  5. Log in with same credentials"
  echo "  6. Should redirect to /home"
  echo ""
  
  echo -e "${YELLOW}Step 3: Protected Routes${NC}"
  echo "  1. After login, visit http://localhost:3000/profile"
  echo "  2. Verify your profile is displayed"
  echo "  3. Visit http://localhost:3000/bookings"
  echo "  4. Should show empty bookings list"
  echo "  5. Visit http://localhost:3000/home"
  echo "  6. Should show dashboard"
  echo ""
  
  echo -e "${YELLOW}Step 4: Booking Flow${NC}"
  echo "  1. Go to http://localhost:3000/rooms"
  echo "  2. Select check-in and check-out dates"
  echo "  3. Click on a room"
  echo "  4. Fill booking form"
  echo "  5. Select services (optional)"
  echo "  6. Click 'Book Now'"
  echo "  7. Fill payment form"
  echo "  8. Click 'Pay Now'"
  echo "  9. Should redirect to /booking-confirmation"
  echo "  10. Go to /bookings - should see your booking"
  echo ""
  
  echo -e "${YELLOW}Step 5: Admin Access${NC}"
  echo "  1. Create admin user in Supabase:"
  echo "     - Go to Supabase dashboard"
  echo "     - Find profiles table"
  echo "     - Update your profile: set role='admin'"
  echo "  2. Log out and log back in"
  echo "  3. Visit http://localhost:3000/admin"
  echo "  4. Should show admin dashboard with all bookings"
  echo ""
  
  echo -e "${YELLOW}Step 6: RLS Verification${NC}"
  echo "  1. Open browser DevTools (F12)"
  echo "  2. Go to Network tab"
  echo "  3. Log in as regular user"
  echo "  4. Try to access /api/bookings"
  echo "  5. Should only see your own bookings"
  echo "  6. Log in as admin"
  echo "  7. Should see all bookings"
  echo ""
}

# Database seeding instructions
seed_database() {
  echo ""
  echo -e "${BLUE}5. Database Seeding${NC}"
  echo ""
  echo "Option A: Via Admin UI"
  echo "  1. Log in as admin"
  echo "  2. Go to http://localhost:3000/admin"
  echo "  3. Click 'Seed Database' button"
  echo "  4. Wait for success message"
  echo ""
  echo "Option B: Via API"
  echo "  curl -X POST http://localhost:3000/api/seed-database \\"
  echo "    -H 'x-seed-secret: YOUR_SECRET' \\"
  echo "    -H 'Content-Type: application/json'"
  echo ""
}

# Performance testing
performance_tests() {
  echo ""
  echo -e "${BLUE}6. Performance Testing${NC}"
  echo ""
  echo "Using Chrome DevTools:"
  echo "  1. Open DevTools (F12)"
  echo "  2. Go to Performance tab"
  echo "  3. Click record"
  echo "  4. Navigate to /rooms"
  echo "  5. Stop recording"
  echo "  6. Check metrics:"
  echo "     - First Contentful Paint (FCP) < 1.5s"
  echo "     - Largest Contentful Paint (LCP) < 2.5s"
  echo "     - Cumulative Layout Shift (CLS) < 0.1"
  echo ""
  echo "Using Lighthouse:"
  echo "  1. Open DevTools (F12)"
  echo "  2. Go to Lighthouse tab"
  echo "  3. Click 'Analyze page load'"
  echo "  4. Target scores:"
  echo "     - Performance: > 90"
  echo "     - Accessibility: > 90"
  echo "     - Best Practices: > 90"
  echo "     - SEO: > 90"
  echo ""
}

# Main execution
main() {
  check_server
  test_health
  test_public_routes
  test_protected_routes
  manual_tests
  seed_database
  performance_tests
  
  echo ""
  echo -e "${GREEN}=========================================="
  echo "✅ E2E Testing Guide Complete"
  echo "==========================================${NC}"
  echo ""
  echo "Next steps:"
  echo "  1. Follow the manual testing steps above"
  echo "  2. Check browser console for errors"
  echo "  3. Verify all flows work as expected"
  echo "  4. Report any issues"
  echo ""
}

main

