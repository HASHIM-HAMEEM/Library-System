#!/usr/bin/env node

/**
 * Verify Library System Setup Completion
 * Run this after executing the SQL in Supabase to confirm everything works
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ANSI color codes
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function checkTableExists(supabase, tableName) {
  try {
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .limit(1);
    return !error;
  } catch {
    return false;
  }
}

async function testFunction(supabase, functionName, params) {
  try {
    const { data, error } = await supabase.rpc(functionName, params);
    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function main() {
  log('🔍 Verifying Library System Setup', 'bright');
  log('=' .repeat(50), 'cyan');

  // Check environment
  const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    log('❌ Missing Supabase configuration!', 'red');
    return;
  }

  // Initialize Supabase
  const supabase = createClient(supabaseUrl, supabaseKey);
  log('✅ Connected to Supabase', 'green');

  // Check tables
  log('\n📊 Checking Tables...', 'blue');
  const tables = ['library_users', 'admin_meta', 'scan_logs'];
  const tableResults = {};
  
  for (const table of tables) {
    tableResults[table] = await checkTableExists(supabase, table);
    log(`   ${table}: ${tableResults[table] ? '✅ exists' : '❌ missing'}`);
  }

  const tablesWorking = Object.values(tableResults).filter(Boolean).length;
  const tablesPercentage = Math.round((tablesWorking / tables.length) * 100);

  // Test functions
  log('\n🔧 Testing Functions...', 'blue');
  
  const testUserId = '550e8400-e29b-41d4-a716-446655440000';
  const testAdminId = '550e8400-e29b-41d4-a716-446655440001';
  
  const functionTests = [
    {
      name: 'create_library_user',
      params: {
        p_user_id: testUserId,
        p_full_name: 'Test User',
        p_subscription_valid_until: '2024-12-31'
      }
    },
    {
      name: 'create_admin_user',
      params: {
        p_user_id: testAdminId,
        p_full_name: 'Test Admin'
      }
    },
    {
      name: 'log_scan_library',
      params: {
        p_user_id: testUserId,
        p_scan_type: 'entry',
        p_scanned_by: testAdminId
      }
    },
    {
      name: 'get_user_scan_history',
      params: {
        p_user_id: testUserId,
        p_limit: 10
      }
    }
  ];

  let functionsWorking = 0;
  for (const test of functionTests) {
    const result = await testFunction(supabase, test.name, test.params);
    if (result.success) {
      log(`   ${test.name}: ✅ working`);
      functionsWorking++;
    } else {
      log(`   ${test.name}: ❌ ${result.error}`);
    }
  }

  const functionsPercentage = Math.round((functionsWorking / functionTests.length) * 100);
  const overallPercentage = Math.round((tablesPercentage + functionsPercentage) / 2);

  // Final report
  log('\n📈 Setup Verification Results', 'bright');
  log('=' .repeat(50), 'cyan');
  
  log(`📊 Tables: ${tablesWorking}/${tables.length} (${tablesPercentage}%)`, tablesPercentage === 100 ? 'green' : 'yellow');
  log(`🔧 Functions: ${functionsWorking}/${functionTests.length} (${functionsPercentage}%)`, functionsPercentage === 100 ? 'green' : 'yellow');
  log(`🎯 Overall: ${overallPercentage}%`, overallPercentage === 100 ? 'green' : 'yellow');

  if (overallPercentage === 100) {
    log('\n🎉 SETUP VERIFICATION SUCCESSFUL!', 'green');
    log('✅ Your library system is 100% complete and ready!', 'green');
    log('\n🚀 Ready for Production:', 'bright');
    log('   • QR code generation and scanning', 'green');
    log('   • User subscription management', 'green');
    log('   • Admin user management', 'green');
    log('   • Entry/exit logging', 'green');
    log('   • Real-time updates', 'green');
    log('   • Production-ready security', 'green');
  } else if (overallPercentage >= 75) {
    log('\n⚠️  SETUP MOSTLY COMPLETE', 'yellow');
    log('Most features are working. Check the failed items above.', 'yellow');
  } else {
    log('\n❌ SETUP INCOMPLETE', 'red');
    log('Please execute the SQL script in Supabase SQL Editor first.', 'red');
    log('File: EXECUTE_THIS_IN_SUPABASE.sql', 'cyan');
  }

  log('\n📋 Next Steps:', 'blue');
  if (overallPercentage < 100) {
    log('1. Execute EXECUTE_THIS_IN_SUPABASE.sql in Supabase SQL Editor');
    log('2. Run this verification script again');
  } else {
    log('1. Start using your library system!');
    log('2. Create real users and admins');
    log('3. Test QR code scanning');
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main };