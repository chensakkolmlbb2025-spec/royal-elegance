/**
 * Test Script for Auth Error Fix
 * Run this in browser console to test the fix
 */

// Test 1: Clear all auth storage
console.log('🧪 Test 1: Clear Auth Storage')
async function testClearStorage() {
  const { clearAuthStorage } = await import('./lib/auth-recovery')
  await clearAuthStorage()
  console.log('✅ Storage cleared successfully')
}

// Test 2: Validate session
console.log('🧪 Test 2: Validate Session')
async function testValidateSession() {
  const { validateSession } = await import('./lib/auth-recovery')
  const isValid = await validateSession()
  console.log('Session valid:', isValid)
  return isValid
}

// Test 3: Simulate invalid token error
console.log('🧪 Test 3: Simulate Invalid Token')
function testInvalidToken() {
  // Corrupt the token
  const keys = Object.keys(localStorage).filter(k => k.includes('auth-token'))
  if (keys.length > 0) {
    localStorage.setItem(keys[0], 'invalid-token-12345')
    console.log('✅ Token corrupted, reload page to test recovery')
  } else {
    console.log('⚠️ No auth token found in storage')
  }
}

// Test 4: Check error handler is active
console.log('🧪 Test 4: Error Handler Status')
function testErrorHandler() {
  const hasErrorListener = window.onerror !== null
  const hasRejectionListener = window.onunhandledrejection !== null
  console.log('Error handler active:', hasErrorListener)
  console.log('Rejection handler active:', hasRejectionListener)
}

// Run all tests
console.log('🚀 Running Auth Error Tests...')
console.log('====================================')

// Export test functions for manual execution
window.authTests = {
  clearStorage: testClearStorage,
  validateSession: testValidateSession,
  simulateInvalidToken: testInvalidToken,
  checkErrorHandler: testErrorHandler,
  runAll: async () => {
    console.log('\n🧪 Running all tests...\n')
    testErrorHandler()
    await testValidateSession()
    console.log('\n✅ All tests completed')
    console.log('\nTo simulate error: authTests.simulateInvalidToken()')
  }
}

console.log('====================================')
console.log('Tests available via: window.authTests')
console.log('Run all: authTests.runAll()')
console.log('====================================')
