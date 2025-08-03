// Create Library Admin User Script
// This script creates an admin user for the library management system
// Works with the new admin_meta table structure
// Run with: node TEST/create_library_admin.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Service role key for admin operations

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase configuration!');
  console.log('Please ensure you have:');
  console.log('- VITE_SUPABASE_URL in your .env file');
  console.log('- SUPABASE_SERVICE_ROLE_KEY in your .env file');
  process.exit(1);
}

// Create Supabase admin client
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Admin user details
const adminUser = {
  email: 'scnz141@gmail.com',
  password: 'Wehere',
  fullName: 'Library Admin',
  role: 'admin'
};

async function createLibraryAdmin() {
  try {
    console.log('🚀 Creating library admin user...');
    console.log(`📧 Email: ${adminUser.email}`);
    
    // Step 1: Create user in Supabase Auth with admin role
    console.log('\n1️⃣ Creating user in Supabase Auth...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: adminUser.email,
      password: adminUser.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: adminUser.fullName,
        full_name: adminUser.fullName
      },
      app_metadata: {
        role: adminUser.role // This triggers admin_meta creation via trigger
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  User already exists in auth, checking admin metadata...');
        
        // Get existing user
        const { data: existingUsers, error: getUserError } = await supabase.auth.admin.listUsers();
        if (getUserError) throw getUserError;
        
        const existingUser = existingUsers.users.find(u => u.email === adminUser.email);
        if (!existingUser) {
          throw new Error('User exists but could not be found');
        }
        
        console.log(`✅ Found existing user: ${existingUser.id}`);
        
        // Update user to have admin role
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          {
            app_metadata: { role: 'admin' },
            user_metadata: { 
              name: adminUser.fullName,
              full_name: adminUser.fullName 
            }
          }
        );
        
        if (updateError) throw updateError;
        
        // Check if admin_meta exists
        const { data: existingAdmin, error: adminCheckError } = await supabase
          .from('admin_meta')
          .select('*')
          .eq('id', existingUser.id)
          .single();
        
        if (adminCheckError && adminCheckError.code !== 'PGRST116') {
          throw adminCheckError;
        }
        
        if (existingAdmin) {
          console.log('✅ Admin metadata already exists');
          console.log('👤 Admin details:', {
            id: existingAdmin.id,
            fullName: existingAdmin.full_name,
            lastLogin: existingAdmin.last_login
          });
          return;
        }
        
        // Create admin metadata for existing user
        await createAdminMetadata(existingUser.id);
        return;
      }
      throw authError;
    }

    console.log('✅ Auth user created successfully');
    console.log(`👤 User ID: ${authUser.user.id}`);
    
    // Step 2: Verify admin metadata was created by trigger
    await verifyAdminMetadata(authUser.user.id);
    
    console.log('\n🎉 Library admin user created successfully!');
    console.log('📋 Summary:');
    console.log(`   📧 Email: ${adminUser.email}`);
    console.log(`   🔑 Password: ${adminUser.password}`);
    console.log(`   👤 Role: ${adminUser.role}`);
    console.log(`   🆔 User ID: ${authUser.user.id}`);
    console.log('\n🔐 Admin can now:');
    console.log('   • Access the admin dashboard');
    console.log('   • Manage library users');
    console.log('   • View scan logs and analytics');
    console.log('   • Generate QR codes for users');
    
  } catch (error) {
    console.error('❌ Error creating library admin:', error.message);
    if (error.details) {
      console.error('📝 Details:', error.details);
    }
    process.exit(1);
  }
}

async function createAdminMetadata(userId) {
  console.log('\n2️⃣ Creating admin metadata...');
  
  const { data: adminMeta, error: metaError } = await supabase
    .from('admin_meta')
    .insert({
      id: userId,
      full_name: adminUser.fullName,
      last_login: new Date().toISOString()
    })
    .select()
    .single();

  if (metaError) {
    throw metaError;
  }

  console.log('✅ Admin metadata created successfully');
  console.log('📋 Metadata details:', {
    id: adminMeta.id,
    fullName: adminMeta.full_name,
    lastLogin: adminMeta.last_login
  });
}

async function verifyAdminMetadata(userId) {
  console.log('\n2️⃣ Verifying admin metadata...');
  
  // Wait a moment for trigger to execute
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  const { data: adminMeta, error: metaError } = await supabase
    .from('admin_meta')
    .select('*')
    .eq('id', userId)
    .single();

  if (metaError) {
    console.log('⚠️  Admin metadata not found, creating manually...');
    await createAdminMetadata(userId);
    return;
  }

  console.log('✅ Admin metadata verified');
  console.log('📋 Metadata details:', {
    id: adminMeta.id,
    fullName: adminMeta.full_name,
    lastLogin: adminMeta.last_login
  });
}

// Run the script
if (require.main === module) {
  createLibraryAdmin();
}

module.exports = { createLibraryAdmin };