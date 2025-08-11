/**
 * Test script to verify App Check fixes
 * Run this in the browser console to test the complete flow
 */

// Test App Check Debug Token Generation and Function Calls
async function testAppCheckFixes() {
  console.log('🧪 Starting App Check Fix Verification Tests...');
  console.log('=' .repeat(50));
  
  const results = {
    appCheckInit: false,
    debugTokenGeneration: false,
    tokenRefresh: false,
    functionCall: false,
    authFlow: false
  };
  
  try {
    // Test 1: Check App Check Initialization
    console.log('\n1️⃣ Testing App Check Initialization...');
    if (window.firebase && window.firebase.appCheck) {
      console.log('✅ App Check is initialized');
      results.appCheckInit = true;
    } else {
      console.log('❌ App Check not found');
    }
    
    // Test 2: Check Debug Token Generation
    console.log('\n2️⃣ Testing Debug Token Generation...');
    try {
      // Import functions from firebase module
      const { getAppCheckToken, forceRefreshAppCheckToken } = await import('./src/lib/firebase.js');
      
      const token = await getAppCheckToken();
      if (token && token.length > 0) {
        console.log('✅ Debug token generated successfully');
        console.log('🔍 Token preview:', token.substring(0, 30) + '...');
        results.debugTokenGeneration = true;
      } else {
        console.log('❌ Failed to generate debug token');
      }
    } catch (error) {
      console.log('❌ Debug token generation failed:', error.message);
    }
    
    // Test 3: Test Token Refresh
    console.log('\n3️⃣ Testing Token Refresh...');
    try {
      const { forceRefreshAppCheckToken } = await import('./src/lib/firebase.js');
      const refreshedToken = await forceRefreshAppCheckToken();
      if (refreshedToken) {
        console.log('✅ Token refresh successful');
        results.tokenRefresh = true;
      } else {
        console.log('❌ Token refresh failed');
      }
    } catch (error) {
      console.log('❌ Token refresh failed:', error.message);
    }
    
    // Test 4: Check Authentication Flow
    console.log('\n4️⃣ Testing Authentication Flow...');
    try {
      const { auth } = await import('./src/lib/firebase.js');
      if (auth.currentUser) {
        console.log('✅ User is authenticated:', auth.currentUser.uid);
        results.authFlow = true;
      } else {
        console.log('⚠️  No authenticated user (this is expected if not logged in)');
        // This is not necessarily an error
        results.authFlow = true;
      }
    } catch (error) {
      console.log('❌ Authentication check failed:', error.message);
    }
    
    // Test 5: Test Function Call (only if authenticated)
    console.log('\n5️⃣ Testing Function Call...');
    try {
      const { auth } = await import('./src/lib/firebase.js');
      
      if (auth.currentUser) {
        console.log('🔄 Attempting function call...');
        
        // Import Firebase Functions
        const { getFunctions, httpsCallable } = await import('firebase/functions');
        const functions = getFunctions(undefined, 'us-central1');
        const getQrEncryptionKey = httpsCallable(functions, 'getQrEncryptionKey');
        
        const result = await getQrEncryptionKey();
        if (result && result.data) {
          console.log('✅ Function call successful!');
          console.log('🔑 Received encryption key');
          results.functionCall = true;
        } else {
          console.log('❌ Function call returned invalid data');
        }
      } else {
        console.log('⚠️  Skipping function call test - user not authenticated');
        console.log('📋 To test function calls:');
        console.log('   1. Log in to the application');
        console.log('   2. Run this test again');
      }
    } catch (error) {
      console.log('❌ Function call failed:', error.message);
      
      if (error.message.includes('net::ERR_FAILED')) {
        console.log('🔧 This error suggests the debug token is not registered');
        console.log('📋 Next steps:');
        console.log('   1. Copy the debug token from the console logs');
        console.log('   2. Go to Firebase Console > Build > App Check');
        console.log('   3. Add the debug token to your web app');
      }
    }
    
  } catch (error) {
    console.log('❌ Test suite failed:', error);
  }
  
  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('📊 Test Results Summary:');
  console.log('=' .repeat(50));
  
  const passed = Object.values(results).filter(Boolean).length;
  const total = Object.keys(results).length;
  
  Object.entries(results).forEach(([test, passed]) => {
    const icon = passed ? '✅' : '❌';
    const testName = test.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
    console.log(`${icon} ${testName}`);
  });
  
  console.log(`\n🎯 Overall: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All tests passed! App Check is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Check the logs above for details.');
    
    console.log('\n🔧 Common Solutions:');
    console.log('1. Ensure debug token is registered in Firebase Console');
    console.log('2. Wait 5-15 minutes for changes to propagate');
    console.log('3. Clear browser cache and reload');
    console.log('4. Check Firebase Console > Functions > Logs for errors');
  }
  
  return results;
}

// Auto-run if in browser environment
if (typeof window !== 'undefined') {
  console.log('🚀 App Check Fix Test Suite Ready!');
  console.log('📋 Run: testAppCheckFixes()');
  
  // Make function globally available
  window.testAppCheckFixes = testAppCheckFixes;
} else {
  // Export for Node.js environment
  module.exports = { testAppCheckFixes };
}