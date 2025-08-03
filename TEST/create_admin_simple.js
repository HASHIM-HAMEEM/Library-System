// Simple Admin User Creation Script
// This script creates an admin user for the library management system
// Email: scnz141@gmail.com
// Password: Wehere

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ Missing Supabase URL!');
  console.log('Please ensure you have VITE_SUPABASE_URL or SUPABASE_URL in your .env file');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.log('⚠️  Service Role Key not found!');
  console.log('Since the service role key is not configured, please create the admin user manually:');
  console.log('');
  console.log('🔧 Manual Admin Creation Steps:');
  console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard');
  console.log('2. Navigate to Authentication > Users');
  console.log('3. Click "Add User"');
  console.log('4. Fill in the details:');
  console.log('   📧 Email: scnz141@gmail.com');
  console.log('   🔑 Password: Wehere');
  console.log('   ✅ Check "Email Confirm"');
  console.log('5. After creating the user, go to SQL Editor');
  console.log('6. Run this SQL to set admin role:');
  console.log('');
  console.log('   UPDATE auth.users');
  console.log('   SET raw_app_meta_data = raw_app_meta_data || \'{"role": "admin"}\'::\jsonb');
  console.log('   WHERE email = \'scnz141@gmail.com\';');
  console.log('');
  console.log('   INSERT INTO admin_meta (id, full_name, last_login)');
  console.log('   SELECT id, \'Library Admin\', NOW()');
  console.log('   FROM auth.users');
  console.log('   WHERE email = \'scnz141@gmail.com\';');
  console.log('');
  process.exit(0);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const adminUser = {
  email: 'scnz141@gmail.com',
  password: 'Wehere',
  fullName: 'Library Admin'
};

async function createAdminUser() {
  try {
    console.log('🚀 Creating admin user...');
    console.log(`📧 Email: ${adminUser.email}`);
    
    // Step 1: Check if admin_meta table exists
    console.log('\n1️⃣ Checking database schema...');
    const { data: tables, error: tableError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .in('table_name', ['admin_meta', 'library_users', 'scan_logs']);
    
    if (tableError) {
      console.log('⚠️  Could not check tables, proceeding anyway...');
    } else {
      const tableNames = tables.map(t => t.table_name);
      console.log('📋 Found tables:', tableNames);
      
      if (!tableNames.includes('admin_meta')) {
        console.log('❌ admin_meta table not found!');
        console.log('Please run the library system migration first:');
        console.log('1. Copy the contents of 20240105000000_library_system_migration.sql');
        console.log('2. Go to Supabase Dashboard > SQL Editor');
        console.log('3. Paste and execute the migration');
        process.exit(1);
      }
    }
    
    // Step 2: Create user in Supabase Auth
    console.log('\n2️⃣ Creating user in Supabase Auth...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: adminUser.email,
      password: adminUser.password,
      email_confirm: true,
      user_metadata: {
        full_name: adminUser.fullName,
        name: adminUser.fullName
      },
      app_metadata: {
        role: 'admin'
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  User already exists in auth, updating...');
        
        // Get existing user
        const { data: existingUsers, error: getUserError } = await supabase.auth.admin.listUsers();
        if (getUserError) throw getUserError;
        
        const existingUser = existingUsers.users.find(u => u.email === adminUser.email);
        if (!existingUser) {
          throw new Error('User exists but could not be found');
        }
        
        // Update user metadata
        const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
          app_metadata: { role: 'admin' },
          user_metadata: { full_name: adminUser.fullName, name: adminUser.fullName }
        });
        
        if (updateError) throw updateError;
        
        console.log(`✅ Updated existing user: ${existingUser.id}`);
        await createAdminMeta(existingUser.id);
        return;
      }
      throw authError;
    }

    console.log('✅ Auth user created successfully');
    console.log(`👤 User ID: ${authUser.user.id}`);
    
    // Step 3: Create admin metadata
    await createAdminMeta(authUser.user.id);
    
    console.log('\n🎉 Admin user created successfully!');
    console.log('📋 Summary:');
    console.log(`   📧 Email: ${adminUser.email}`);
    console.log(`   🔑 Password: ${adminUser.password}`);
    console.log(`   👤 Role: admin`);
    console.log(`   🆔 User ID: ${authUser.user.id}`);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.details) {
      console.error('📝 Details:', error.details);
    }
    process.exit(1);
  }
}

async function createAdminMeta(userId) {
  console.log('\n3️⃣ Creating admin metadata...');
  
  const { data: adminMeta, error: metaError } = await supabase
    .from('admin_meta')
    .upsert({
      id: userId,
      full_name: adminUser.fullName,
      last_login: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (metaError) {
    throw metaError;
  }

  console.log('✅ Admin metadata created successfully');
  console.log('📋 Admin details:', {
    id: adminMeta.id,
    fullName: adminMeta.full_name,
    lastLogin: adminMeta.last_login
  });
}

// Run the script
if (require.main === module) {
  createAdminUser();
}

module.exports = { createAdminUser };