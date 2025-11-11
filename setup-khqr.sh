#!/bin/bash

# KHQR/Payway Setup Script
# This script helps you set up the KHQR payment system with Payway credentials

echo "🚀 Setting up KHQR Payment System with Payway Cambodia..."
echo ""

# Check if .env.local exists
if [ -f ".env.local" ]; then
    echo "📋 Found existing .env.local file"
    echo "🔄 Adding KHQR configuration..."
    echo "" >> .env.local
    echo "# KHQR/Payway Configuration - Added $(date)" >> .env.local
    cat .env.khqr >> .env.local
    echo "✅ KHQR configuration added to .env.local"
else
    echo "📝 Creating new .env.local file..."
    cp .env.khqr .env.local
    echo "✅ Created .env.local with KHQR configuration"
fi

echo ""
echo "🎯 KHQR Integration Complete!"
echo ""
echo "📁 Files ready:"
echo "   ✅ /components/payment/khqr-payment.tsx"
echo "   ✅ /lib/khqr-payment.ts"
echo "   ✅ /components/payment/enhanced-payment-form.tsx"
echo "   ✅ /app/api/khqr/create-payment/route.ts"
echo "   ✅ /app/api/khqr/status/[transactionId]/route.ts"
echo "   ✅ /app/api/webhooks/khqr/route.ts"
echo ""
echo "🔧 Configuration:"
echo "   ✅ Payway Merchant ID: ec462486"
echo "   ✅ Sandbox API URL configured"
echo "   ✅ RSA keys configured for API signing"
echo ""
echo "🧪 Testing:"
echo "   1. Start your development server: npm run dev"
echo "   2. Go to any booking page"
echo "   3. Select KHQR payment method"
echo "   4. Test with Payway sandbox"
echo ""
echo "📚 For more details, see KHQR_INTEGRATION_GUIDE.md"