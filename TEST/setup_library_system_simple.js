#!/usr/bin/env node

require('dotenv').config({ path: '../.env' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase configuration in .env file');
  console.error('Required: SUPABASE_URL and SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function displaySQLScript() {
  const sqlFile = path.join(__dirname, 'complete_library_system_corrected.sql');
  
  if (!fs.existsSync(sqlFile)) {
    console.error('❌ complete_library_system_corrected.sql not found');
    return;
  }
  
  const sqlContent = fs.readFileSync(sqlFile, 'utf8');
  
  console.log('📋 COMPLETE LIBRARY SYSTEM SQL SCRIPT');
  console.log('=====================================');
  console.log('Copy and paste the following SQL into your Supabase SQL Editor:\n');
  console.log('--- START OF SQL SCRIPT ---');
  console.log(sqlContent);
  console.log('--- END OF SQL SCRIPT ---\n');
  console.log('=====================================');
}

async function verifySetup() {
  console.log('🔍 Verifying current database state...');
  
  const expectedTables = ['library_users', 'admin_meta'];
  const expectedFunctions = ['create_library_user', 'log_scan_library', 'create_admin_user', 'get_user_scan_history'];
  
  let tableCount = 0;
  let functionCount = 0;
  let issues = [];
  
  // Test tables
  console.log('\n📋 Testing table accessibility...');
  for (const table of expectedTables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (!error) {
        console.log(`✅ Table '${table}' is accessible`);
        tableCount++;
      } else {
        console.log(`⚠️  Table '${table}' has issues: ${error.message}`);
        issues.push(`${table}: ${error.message}`);
      }
    } catch (err) {
      console.log(`❌ Table '${table}' not accessible: ${err.message}`);
      issues.push(`${table}: ${err.message}`);
    }
  }
  
  // Test functions
  console.log('\n🧪 Testing library system functions...');
  const testUserId = '550e8400-e29b-41d4-a716-446655440000';
  
  // Test create_library_user
  try {
    const { data, error } = await supabase.rpc('create_library_user', {
      user_id_param: testUserId,
      full_name_param: 'Test Setup User',
      subscription_valid_until_param: '2024-12-31'
    });
    
    if (!error) {
      console.log(`✅ Function 'create_library_user' works`);
      functionCount++;
    } else {
      console.log(`⚠️  Function 'create_library_user' error: ${error.message}`);
      issues.push(`create_library_user: ${error.message}`);
    }
  } catch (err) {
    console.log(`❌ Function 'create_library_user' not found: ${err.message}`);
    issues.push(`create_library_user: ${err.message}`);
  }
  
  // Test log_scan_library
  try {
    const { data, error } = await supabase.rpc('log_scan_library', {
      qr_code_param: 'test_qr_setup',
      scan_type_param: 'entry',
      scanned_by_param: 'setup_test',
      location_param: 'main_entrance'
    });
    
    if (!error) {
      console.log(`✅ Function 'log_scan_library' works`);
      console.log(`   Result: ${JSON.stringify(data)}`);
      functionCount++;
    } else {
      console.log(`⚠️  Function 'log_scan_library' error: ${error.message}`);
      issues.push(`log_scan_library: ${error.message}`);
    }
  } catch (err) {
    console.log(`❌ Function 'log_scan_library' not found: ${err.message}`);
    issues.push(`log_scan_library: ${err.message}`);
  }
  
  // Test create_admin_user
  try {
    const { data, error } = await supabase.rpc('create_admin_user', {
      admin_user_id: testUserId,
      admin_full_name: 'Test Setup Admin'
    });
    
    if (!error) {
      console.log(`✅ Function 'create_admin_user' works`);
      functionCount++;
    } else {
      console.log(`⚠️  Function 'create_admin_user' error: ${error.message}`);
      issues.push(`create_admin_user: ${error.message}`);
    }
  } catch (err) {
    console.log(`❌ Function 'create_admin_user' not found: ${err.message}`);
    issues.push(`create_admin_user: ${err.message}`);
  }
  
  // Test get_user_scan_history
  try {
    const { data, error } = await supabase.rpc('get_user_scan_history', {
      user_id_param: testUserId,
      limit_param: 5
    });
    
    if (!error) {
      console.log(`✅ Function 'get_user_scan_history' works`);
      functionCount++;
    } else {
      console.log(`⚠️  Function 'get_user_scan_history' error: ${error.message}`);
      issues.push(`get_user_scan_history: ${error.message}`);
    }
  } catch (err) {
    console.log(`❌ Function 'get_user_scan_history' not found: ${err.message}`);
    issues.push(`get_user_scan_history: ${err.message}`);
  }
  
  const tablePercentage = Math.round((tableCount / expectedTables.length) * 100);
  const functionPercentage = Math.round((functionCount / expectedFunctions.length) * 100);
  const overallPercentage = Math.round(((tableCount + functionCount) / (expectedTables.length + expectedFunctions.length)) * 100);
  
  console.log(`\n📊 Setup Status:`);
  console.log(`   Tables: ${tableCount}/${expectedTables.length} (${tablePercentage}%)`);
  console.log(`   Functions: ${functionCount}/${expectedFunctions.length} (${functionPercentage}%)`);
  console.log(`   Overall: ${overallPercentage}%`);
  
  return { overallPercentage, issues, tableCount, functionCount };
}

async function main() {
  console.log('🚀 Complete Library System Setup');
  console.log('================================');
  console.log(`Connected to: ${supabaseUrl}\n`);
  
  try {
    // Check current state
    const { overallPercentage, issues, tableCount, functionCount } = await verifySetup();
    
    if (overallPercentage === 100) {
      console.log('\n🎉 Library System is Already Complete!');
      console.log('=====================================');
      console.log('✅ All tables and functions are working correctly');
      console.log('✅ QR code scanning system is ready');
      console.log('✅ Admin and user management functions available');
      console.log('\n🔗 Available Functions:');
      console.log('   - create_library_user(user_id, full_name, subscription_date)');
      console.log('   - log_scan_library(qr_code, scan_type, scanned_by, location)');
      console.log('   - create_admin_user(admin_user_id, admin_full_name)');
      console.log('   - get_user_scan_history(user_id, limit)');
      console.log('\n🏁 Your library system is production-ready!');
    } else {
      console.log(`\n⚠️  Setup Incomplete (${overallPercentage}%)`);
      console.log('=====================================');
      
      if (issues.length > 0) {
        console.log('\n🔍 Issues Found:');
        issues.forEach(issue => console.log(`   - ${issue}`));
      }
      
      console.log('\n📝 To complete the setup:');
      console.log('1. Execute the SQL script below in your Supabase SQL Editor');
      console.log('2. Run this script again to verify completion\n');
      
      await displaySQLScript();
      
      console.log('\n📋 After executing the SQL script:');
      console.log('   Run: node setup_library_system_simple.js');
      console.log('   Or:  node verify_corrected_database.js');
    }
    
  } catch (error) {
    console.error(`\n❌ Setup check failed: ${error.message}`);
    console.log('\n📝 Manual setup required:');
    await displaySQLScript();
  }
}

// Run the setup
main().catch(console.error);