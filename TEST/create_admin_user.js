// Create Admin User Script
// This script creates an admin user in Supabase with email and password
// Run with: node TEST/create_admin_user.js

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
  fullName: 'Admin User',
  role: 'admin'
};

async function createAdminUser() {
  try {
    console.log('🚀 Creating admin user...');
    console.log(`📧 Email: ${adminUser.email}`);
    
    // Step 1: Create user in Supabase Auth
    console.log('\n1️⃣ Creating user in Supabase Auth...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: adminUser.email,
      password: adminUser.password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: adminUser.fullName,
        role: adminUser.role
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('⚠️  User already exists in auth, checking profile...');
        
        // Get existing user
        const { data: existingUsers, error: getUserError } = await supabase.auth.admin.listUsers();
        if (getUserError) throw getUserError;
        
        const existingUser = existingUsers.users.find(u => u.email === adminUser.email);
        if (!existingUser) {
          throw new Error('User exists but could not be found');
        }
        
        console.log(`✅ Found existing user: ${existingUser.id}`);
        
        // Check if profile exists
        const { data: existingProfile, error: profileCheckError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', existingUser.id)
          .single();
        
        if (profileCheckError && profileCheckError.code !== 'PGRST116') {
          throw profileCheckError;
        }
        
        if (existingProfile) {
          console.log('✅ User profile already exists');
          console.log('👤 Profile details:', {
            id: existingProfile.id,
            email: existingProfile.email,
            role: existingProfile.role,
            isActive: existingProfile.is_active
          });
          return;
        }
        
        // Create profile for existing user
        await createUserProfile(existingUser.id);
        return;
      }
      throw authError;
    }

    console.log('✅ Auth user created successfully');
    console.log(`👤 User ID: ${authUser.user.id}`);
    
    // Step 2: Create user profile
    await createUserProfile(authUser.user.id);
    
    console.log('\n🎉 Admin user created successfully!');
    console.log('📋 Summary:');
    console.log(`   📧 Email: ${adminUser.email}`);
    console.log(`   🔑 Password: ${adminUser.password}`);
    console.log(`   👤 Role: ${adminUser.role}`);
    console.log(`   🆔 User ID: ${authUser.user.id}`);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    if (error.details) {
      console.error('📝 Details:', error.details);
    }
    process.exit(1);
  }
}

async function createUserProfile(userId) {
  console.log('\n2️⃣ Creating user profile...');
  
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .insert({
      id: userId,
      email: adminUser.email,
      full_name: adminUser.fullName,
      role: adminUser.role,
      is_active: true
    })
    .select()
    .single();

  if (profileError) {
    throw profileError;
  }

  console.log('✅ User profile created successfully');
  console.log('📋 Profile details:', {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    isActive: profile.is_active
  });
}

// Run the script
if (require.main === module) {
  createAdminUser();
}

module.exports = { createAdminUser };