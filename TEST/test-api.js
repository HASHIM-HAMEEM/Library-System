// API Testing Script for GStore Application
const SUPABASE_URL = 'https://hkpetmoloqeqkexxlfcz.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhrcGV0bW9sb3FlcWtleHhsZmN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4NTc3NTQsImV4cCI6MjA2OTQzMzc1NH0.s6D9UQR5cpl8ohuM6A40y1CP5aYAe7aGY4Om1Kn9a9U';

// Test Supabase Connection
async function testSupabaseConnection() {
  console.log('\n=== Testing Supabase Connection ===');
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    
    if (response.ok) {
      console.log('✅ Supabase connection successful');
      console.log('Status:', response.status);
    } else {
      console.log('❌ Supabase connection failed');
      console.log('Status:', response.status);
    }
  } catch (error) {
    console.log('❌ Supabase connection error:', error.message);
  }
}

// Test Authentication Endpoints
async function testAuthEndpoints() {
  console.log('\n=== Testing Authentication Endpoints ===');
  
  // Test sign up endpoint
  try {
    const signUpResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'testpassword123'
      })
    });
    
    console.log('Sign Up Endpoint Status:', signUpResponse.status);
    if (signUpResponse.status === 200 || signUpResponse.status === 400) {
      console.log('✅ Sign up endpoint accessible');
    }
  } catch (error) {
    console.log('❌ Sign up endpoint error:', error.message);
  }
  
  // Test sign in endpoint
  try {
    const signInResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY
      },
      body: JSON.stringify({
        email: 'test@example.com',
        password: 'wrongpassword'
      })
    });
    
    console.log('Sign In Endpoint Status:', signInResponse.status);
    if (signInResponse.status === 400 || signInResponse.status === 422) {
      console.log('✅ Sign in endpoint accessible (expected failure with wrong credentials)');
    }
  } catch (error) {
    console.log('❌ Sign in endpoint error:', error.message);
  }
}

// Test Database Tables Access
async function testDatabaseAccess() {
  console.log('\n=== Testing Database Table Access ===');
  
  const tables = ['user_profiles', 'subscriptions', 'qr_codes', 'attendance_logs'];
  
  for (const table of tables) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=*&limit=1`, {
        headers: {
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });
      
      if (response.ok) {
        console.log(`✅ Table '${table}' accessible`);
      } else if (response.status === 401) {
        console.log(`🔒 Table '${table}' requires authentication (expected)`);
      } else {
        console.log(`❌ Table '${table}' error - Status: ${response.status}`);
      }
    } catch (error) {
      console.log(`❌ Table '${table}' error:`, error.message);
    }
  }
}

// Test Rate Limiting
async function testRateLimiting() {
  console.log('\n=== Testing Rate Limiting ===');
  
  const requests = [];
  for (let i = 0; i < 10; i++) {
    requests.push(
      fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'wrongpassword'
        })
      })
    );
  }
  
  try {
    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status === 429);
    
    if (rateLimited) {
      console.log('✅ Rate limiting is working');
    } else {
      console.log('⚠️ No rate limiting detected (may be configured differently)');
    }
  } catch (error) {
    console.log('❌ Rate limiting test error:', error.message);
  }
}

// Main test function
async function runTests() {
  console.log('🚀 Starting API Tests for GStore Application');
  console.log('='.repeat(50));
  
  await testSupabaseConnection();
  await testAuthEndpoints();
  await testDatabaseAccess();
  await testRateLimiting();
  
  console.log('\n=== Test Summary ===');
  console.log('✅ Tests completed');
  console.log('📝 Check the results above for any issues');
  console.log('🌐 Application is running at: http://localhost:5173');
}

// Run tests
runTests().catch(console.error);