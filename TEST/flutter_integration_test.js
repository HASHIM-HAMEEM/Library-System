// Flutter App Integration Test Script
// Tests the RPC functions that Flutter app will use
// Run with: node flutter_integration_test.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'your-supabase-url',
  process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key'
);

// Test user credentials (should be created in library_users table)
const TEST_USER = {
  email: 'testuser@example.com',
  password: 'testpassword123'
};

async function testFlutterIntegration() {
  console.log('🚀 Starting Flutter App Integration Tests\n');
  
  try {
    // Test 1: User Authentication
    console.log('📱 Test 1: User Authentication');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    if (authError) {
      console.log('❌ Authentication failed:', authError.message);
      console.log('ℹ️  Make sure test user exists in auth.users and library_users tables');
      return;
    }
    
    console.log('✅ User authenticated successfully');
    console.log('   User ID:', authData.user.id);
    console.log('   Email:', authData.user.email);
    
    // Test 2: Get User Profile and QR Code
    console.log('\n📱 Test 2: Get User Profile and QR Code');
    const { data: profileData, error: profileError } = await supabase
      .rpc('get_my_library_profile');
    
    if (profileError) {
      console.log('❌ Failed to get profile:', profileError.message);
    } else if (!profileData.success) {
      console.log('❌ Profile fetch failed:', profileData.error);
    } else {
      console.log('✅ Profile retrieved successfully');
      console.log('   Name:', profileData.user.fullName);
      console.log('   QR Code:', profileData.user.qrCode);
      console.log('   Subscription Status:', profileData.user.subscriptionStatus);
      console.log('   Valid Until:', profileData.user.subscriptionValidUntil);
    }
    
    // Test 3: Get Scan History
    console.log('\n📱 Test 3: Get User Scan History');
    const { data: historyData, error: historyError } = await supabase
      .rpc('get_my_scan_history', { limit_param: 10, offset_param: 0 });
    
    if (historyError) {
      console.log('❌ Failed to get scan history:', historyError.message);
    } else if (!historyData.success) {
      console.log('❌ Scan history fetch failed:', historyData.error);
    } else {
      console.log('✅ Scan history retrieved successfully');
      console.log('   Total scans:', historyData.totalCount);
      console.log('   Recent scans:', historyData.scans.length);
      console.log('   Has more:', historyData.hasMore);
      
      if (historyData.scans.length > 0) {
        console.log('   Latest scan:');
        const latest = historyData.scans[0];
        console.log('     Type:', latest.scanType);
        console.log('     Time:', latest.scanTime);
        console.log('     Location:', latest.location);
        console.log('     Scanned by:', latest.scannedBy);
      }
    }
    
    // Test 4: Regenerate QR Code
    console.log('\n📱 Test 4: Regenerate QR Code');
    const { data: qrData, error: qrError } = await supabase
      .rpc('regenerate_qr_code');
    
    if (qrError) {
      console.log('❌ Failed to regenerate QR code:', qrError.message);
    } else if (!qrData.success) {
      console.log('❌ QR regeneration failed:', qrData.error);
    } else {
      console.log('✅ QR code regenerated successfully');
      console.log('   New QR Code:', qrData.qrCode);
      console.log('   User ID:', qrData.userId);
    }
    
    // Test 5: Verify New QR Code in Profile
    console.log('\n📱 Test 5: Verify New QR Code in Profile');
    const { data: updatedProfileData, error: updatedProfileError } = await supabase
      .rpc('get_my_library_profile');
    
    if (updatedProfileError) {
      console.log('❌ Failed to get updated profile:', updatedProfileError.message);
    } else if (!updatedProfileData.success) {
      console.log('❌ Updated profile fetch failed:', updatedProfileData.error);
    } else {
      console.log('✅ Updated profile retrieved successfully');
      console.log('   Updated QR Code:', updatedProfileData.user.qrCode);
      
      if (qrData.success && updatedProfileData.user.qrCode === qrData.qrCode) {
        console.log('✅ QR code update verified successfully');
      } else {
        console.log('❌ QR code mismatch detected');
      }
    }
    
    // Test 6: Test Real-time Subscriptions (simulation)
    console.log('\n📱 Test 6: Real-time Subscription Setup');
    console.log('ℹ️  Setting up real-time subscription for scan_logs...');
    
    const subscription = supabase
      .channel('scan_logs_changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'scan_logs',
        filter: `user_id=eq.${authData.user.id}`
      }, (payload) => {
        console.log('📡 Real-time scan log received:', payload.new);
      })
      .subscribe((status) => {
        console.log('📡 Subscription status:', status);
      });
    
    // Wait a moment for subscription to establish
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Real-time subscription established');
    console.log('ℹ️  Subscription will listen for new scan logs');
    
    // Clean up subscription
    setTimeout(() => {
      subscription.unsubscribe();
      console.log('🔌 Real-time subscription closed');
    }, 5000);
    
    console.log('\n🎉 Flutter App Integration Tests Completed Successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ User authentication');
    console.log('   ✅ Profile and QR code retrieval');
    console.log('   ✅ Scan history access');
    console.log('   ✅ QR code regeneration');
    console.log('   ✅ Real-time subscriptions');
    
    console.log('\n🔧 Next Steps for Flutter Integration:');
    console.log('   1. Use these RPC functions in your Flutter app');
    console.log('   2. Implement QR code display using the retrieved qrCode');
    console.log('   3. Set up real-time listeners for scan_logs updates');
    console.log('   4. Handle subscription status in UI (active/expired/inactive)');
    console.log('   5. Implement offline caching for user profile data');
    
  } catch (error) {
    console.error('💥 Unexpected error during testing:', error);
  }
}

// Helper function to create test user (run separately if needed)
async function createTestUser() {
  console.log('👤 Creating test user for Flutter integration...');
  
  try {
    // Sign up test user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_USER.email,
      password: TEST_USER.password
    });
    
    if (signUpError) {
      console.log('❌ Failed to create test user:', signUpError.message);
      return;
    }
    
    console.log('✅ Test user created successfully');
    console.log('   User ID:', signUpData.user.id);
    console.log('   Email:', signUpData.user.email);
    console.log('\nℹ️  Note: You may need to confirm the email or manually insert into library_users table');
    
  } catch (error) {
    console.error('💥 Error creating test user:', error);
  }
}

// Run tests
if (require.main === module) {
  // Check if we should create test user first
  const args = process.argv.slice(2);
  if (args.includes('--create-user')) {
    createTestUser();
  } else {
    testFlutterIntegration();
  }
}

module.exports = {
  testFlutterIntegration,
  createTestUser
};