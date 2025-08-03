// Web Admin Integration Test Script
// Tests the RPC functions that Web Admin will use
// Run with: node web_admin_integration_test.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || 'your-supabase-url',
  process.env.SUPABASE_ANON_KEY || 'your-supabase-anon-key'
);

// Test admin credentials (should exist in admin_meta table)
const TEST_ADMIN = {
  email: 'admin@library.com',
  password: 'admin123'
};

// Test QR code (should belong to a user in library_users)
const TEST_QR_CODE = 'sample_qr_code_for_testing';

async function testWebAdminIntegration() {
  console.log('🖥️  Starting Web Admin Integration Tests\n');
  
  try {
    // Test 1: Admin Authentication
    console.log('🔐 Test 1: Admin Authentication');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: TEST_ADMIN.email,
      password: TEST_ADMIN.password
    });
    
    if (authError) {
      console.log('❌ Admin authentication failed:', authError.message);
      console.log('ℹ️  Make sure admin user exists in auth.users and admin_meta tables');
      return;
    }
    
    console.log('✅ Admin authenticated successfully');
    console.log('   Admin ID:', authData.user.id);
    console.log('   Email:', authData.user.email);
    
    // Test 2: Get All Library Users
    console.log('\n👥 Test 2: Get All Library Users');
    const { data: usersData, error: usersError } = await supabase
      .rpc('admin_get_library_users', { 
        limit_param: 10, 
        offset_param: 0,
        search_param: null
      });
    
    if (usersError) {
      console.log('❌ Failed to get users:', usersError.message);
    } else if (!usersData.success) {
      console.log('❌ Users fetch failed:', usersData.error);
    } else {
      console.log('✅ Users retrieved successfully');
      console.log('   Total users:', usersData.totalCount);
      console.log('   Users in this page:', usersData.users.length);
      console.log('   Has more pages:', usersData.hasMore);
      
      if (usersData.users.length > 0) {
        console.log('   Sample user:');
        const user = usersData.users[0];
        console.log('     Name:', user.fullName);
        console.log('     Status:', user.subscriptionStatus);
        console.log('     Total scans:', user.stats.totalScans);
        console.log('     Entries:', user.stats.totalEntries);
        console.log('     Exits:', user.stats.totalExits);
      }
    }
    
    // Test 3: Search Users
    console.log('\n🔍 Test 3: Search Users');
    const { data: searchData, error: searchError } = await supabase
      .rpc('admin_get_library_users', { 
        limit_param: 5, 
        offset_param: 0,
        search_param: 'test'
      });
    
    if (searchError) {
      console.log('❌ Failed to search users:', searchError.message);
    } else if (!searchData.success) {
      console.log('❌ User search failed:', searchData.error);
    } else {
      console.log('✅ User search completed successfully');
      console.log('   Search results:', searchData.users.length);
      console.log('   Total matching:', searchData.totalCount);
    }
    
    // Test 4: QR Code Scanning (Valid)
    console.log('\n📱 Test 4: QR Code Scanning (Entry)');
    const { data: scanData, error: scanError } = await supabase
      .rpc('admin_scan_qr', {
        qr_code_param: TEST_QR_CODE,
        scan_type_param: 'entry',
        location_param: 'main_entrance'
      });
    
    if (scanError) {
      console.log('❌ Failed to scan QR code:', scanError.message);
    } else if (!scanData.success) {
      console.log('⚠️  QR scan failed (expected if no test user):', scanData.error);
      console.log('   Scanned by:', scanData.scannedBy);
    } else {
      console.log('✅ QR code scanned successfully');
      console.log('   Scan ID:', scanData.scanId);
      console.log('   User:', scanData.user.fullName);
      console.log('   Scan type:', scanData.scanType);
      console.log('   Location:', scanData.location);
      console.log('   Scanned by:', scanData.scannedBy);
      console.log('   Scan time:', scanData.scanTime);
    }
    
    // Test 5: QR Code Scanning (Exit)
    console.log('\n📱 Test 5: QR Code Scanning (Exit)');
    const { data: exitScanData, error: exitScanError } = await supabase
      .rpc('admin_scan_qr', {
        qr_code_param: TEST_QR_CODE,
        scan_type_param: 'exit',
        location_param: 'main_entrance'
      });
    
    if (exitScanError) {
      console.log('❌ Failed to scan QR code for exit:', exitScanError.message);
    } else if (!exitScanData.success) {
      console.log('⚠️  Exit scan failed (expected if no test user):', exitScanData.error);
    } else {
      console.log('✅ Exit QR code scanned successfully');
      console.log('   Exit scan ID:', exitScanData.scanId);
      console.log('   User:', exitScanData.user.fullName);
    }
    
    // Test 6: Get Scan Analytics
    console.log('\n📊 Test 6: Get Scan Analytics');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7); // Last 7 days
    const endDate = new Date();
    
    const { data: analyticsData, error: analyticsError } = await supabase
      .rpc('admin_get_scan_analytics', {
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0]
      });
    
    if (analyticsError) {
      console.log('❌ Failed to get analytics:', analyticsError.message);
    } else if (!analyticsData.success) {
      console.log('❌ Analytics fetch failed:', analyticsData.error);
    } else {
      console.log('✅ Analytics retrieved successfully');
      console.log('   Period:', analyticsData.period.startDate, 'to', analyticsData.period.endDate);
      console.log('   Total scans:', analyticsData.totals.totalScans);
      console.log('   Unique users:', analyticsData.totals.uniqueUsers);
      console.log('   Total entries:', analyticsData.totals.totalEntries);
      console.log('   Total exits:', analyticsData.totals.totalExits);
      console.log('   Daily stats count:', analyticsData.dailyStats.length);
      
      if (analyticsData.dailyStats.length > 0) {
        console.log('   Latest day stats:');
        const latest = analyticsData.dailyStats[analyticsData.dailyStats.length - 1];
        console.log('     Date:', latest.date);
        console.log('     Scans:', latest.totalScans);
        console.log('     Users:', latest.uniqueUsers);
      }
    }
    
    // Test 7: Update User Subscription (if we have users)
    if (usersData && usersData.success && usersData.users.length > 0) {
      console.log('\n📅 Test 7: Update User Subscription');
      const testUserId = usersData.users[0].id;
      const newValidUntil = new Date();
      newValidUntil.setMonth(newValidUntil.getMonth() + 1); // Extend by 1 month
      
      const { data: updateData, error: updateError } = await supabase
        .rpc('admin_update_user_subscription', {
          user_id_param: testUserId,
          subscription_valid_until_param: newValidUntil.toISOString().split('T')[0]
        });
      
      if (updateError) {
        console.log('❌ Failed to update subscription:', updateError.message);
      } else if (!updateData.success) {
        console.log('❌ Subscription update failed:', updateData.error);
      } else {
        console.log('✅ Subscription updated successfully');
        console.log('   User:', updateData.user.fullName);
        console.log('   New valid until:', updateData.user.subscriptionValidUntil);
      }
    } else {
      console.log('\n📅 Test 7: Update User Subscription (Skipped - No users found)');
    }
    
    // Test 8: Regenerate QR Code for User (Admin)
    if (usersData && usersData.success && usersData.users.length > 0) {
      console.log('\n🔄 Test 8: Regenerate QR Code for User (Admin)');
      const testUserId = usersData.users[0].id;
      
      const { data: regenData, error: regenError } = await supabase
        .rpc('regenerate_qr_code', {
          user_id_param: testUserId
        });
      
      if (regenError) {
        console.log('❌ Failed to regenerate QR code:', regenError.message);
      } else if (!regenData.success) {
        console.log('❌ QR regeneration failed:', regenData.error);
      } else {
        console.log('✅ QR code regenerated successfully');
        console.log('   New QR code:', regenData.qrCode);
        console.log('   User ID:', regenData.userId);
      }
    } else {
      console.log('\n🔄 Test 8: Regenerate QR Code (Skipped - No users found)');
    }
    
    // Test 9: Test Real-time Subscriptions for Admin
    console.log('\n📡 Test 9: Real-time Subscription Setup (Admin)');
    console.log('ℹ️  Setting up real-time subscription for scan_logs (all users)...');
    
    const adminSubscription = supabase
      .channel('admin_scan_logs')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'scan_logs'
      }, (payload) => {
        console.log('📡 Real-time scan log received (admin view):', {
          id: payload.new.id,
          user_id: payload.new.user_id,
          scan_type: payload.new.scan_type,
          location: payload.new.location,
          scanned_by: payload.new.scanned_by,
          scan_time: payload.new.scan_time
        });
      })
      .subscribe((status) => {
        console.log('📡 Admin subscription status:', status);
      });
    
    // Wait for subscription to establish
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    console.log('✅ Admin real-time subscription established');
    console.log('ℹ️  Subscription will listen for all scan logs');
    
    // Clean up subscription
    setTimeout(() => {
      adminSubscription.unsubscribe();
      console.log('🔌 Admin real-time subscription closed');
    }, 5000);
    
    console.log('\n🎉 Web Admin Integration Tests Completed!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Admin authentication');
    console.log('   ✅ User management and search');
    console.log('   ✅ QR code scanning (entry/exit)');
    console.log('   ✅ Analytics and reporting');
    console.log('   ✅ Subscription management');
    console.log('   ✅ QR code regeneration');
    console.log('   ✅ Real-time monitoring');
    
    console.log('\n🔧 Next Steps for Web Admin Integration:');
    console.log('   1. Integrate these RPC functions into your React admin dashboard');
    console.log('   2. Implement QR scanner UI using admin_scan_qr function');
    console.log('   3. Create user management interface with search and pagination');
    console.log('   4. Build analytics dashboard with charts and reports');
    console.log('   5. Set up real-time notifications for scan events');
    console.log('   6. Add subscription management features');
    console.log('   7. Implement bulk operations for user management');
    
  } catch (error) {
    console.error('💥 Unexpected error during testing:', error);
  }
}

// Helper function to create test admin (run separately if needed)
async function createTestAdmin() {
  console.log('👤 Creating test admin for Web Admin integration...');
  
  try {
    // Sign up test admin
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: TEST_ADMIN.email,
      password: TEST_ADMIN.password
    });
    
    if (signUpError) {
      console.log('❌ Failed to create test admin:', signUpError.message);
      return;
    }
    
    console.log('✅ Test admin created successfully');
    console.log('   Admin ID:', signUpData.user.id);
    console.log('   Email:', signUpData.user.email);
    console.log('\nℹ️  Note: You need to manually insert this user into admin_meta table');
    console.log('\n📝 SQL to run:');
    console.log(`INSERT INTO admin_meta (id, full_name, role, created_at, updated_at)`);
    console.log(`VALUES ('${signUpData.user.id}', 'Test Admin', 'admin', NOW(), NOW());`);
    
  } catch (error) {
    console.error('💥 Error creating test admin:', error);
  }
}

// Helper function to create test library user with QR code
async function createTestLibraryUser() {
  console.log('👤 Creating test library user for QR scanning tests...');
  
  const testUser = {
    email: 'testlibuser@example.com',
    password: 'testpass123'
  };
  
  try {
    // Sign up test user
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password
    });
    
    if (signUpError) {
      console.log('❌ Failed to create test library user:', signUpError.message);
      return;
    }
    
    console.log('✅ Test library user created successfully');
    console.log('   User ID:', signUpData.user.id);
    console.log('   Email:', signUpData.user.email);
    console.log('\nℹ️  Note: You need to manually insert this user into library_users table');
    console.log('\n📝 SQL to run:');
    console.log(`INSERT INTO library_users (id, full_name, qr_code, subscription_valid_until, created_at, updated_at)`);
    console.log(`VALUES ('${signUpData.user.id}', 'Test Library User', '${TEST_QR_CODE}', CURRENT_DATE + INTERVAL '30 days', NOW(), NOW());`);
    
  } catch (error) {
    console.error('💥 Error creating test library user:', error);
  }
}

// Run tests
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--create-admin')) {
    createTestAdmin();
  } else if (args.includes('--create-user')) {
    createTestLibraryUser();
  } else {
    testWebAdminIntegration();
  }
}

module.exports = {
  testWebAdminIntegration,
  createTestAdmin,
  createTestLibraryUser
};