// Fix Admin Authentication Script
// This script creates the admin user properly with service role key
// Run with: node fix_admin_auth.js

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.error('❌ Missing Supabase URL!');
  console.log('Please ensure you have VITE_SUPABASE_URL in your .env file');
  process.exit(1);
}

if (!supabaseServiceKey) {
  console.error('❌ Missing Service Role Key!');
  console.log('\n🔧 To fix this:');
  console.log('1. Go to Supabase Dashboard → Settings → API');
  console.log('2. Copy the service_role key');
  console.log('3. Add to .env file: SUPABASE_SERVICE_ROLE_KEY=your_key_here');
  console.log('4. Run this script again');
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
  console.log('🚀 Starting admin user creation...');
  
  try {
    // Step 1: Create user in auth.users
    console.log('📧 Creating auth user...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminUser.email,
      password: adminUser.password,
      email_confirm: true,
      user_metadata: {
        full_name: adminUser.fullName,
        role: adminUser.role
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        console.log('ℹ️  User already exists in auth.users');
        
        // Get existing user
        const { data: users, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) throw listError;
        
        const existingUser = users.users.find(u => u.email === adminUser.email);
        if (!existingUser) throw new Error('User not found after creation');
        
        console.log('✅ Found existing user:', existingUser.id);
        
        // Update user metadata
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          existingUser.id,
          {
            user_metadata: {
              full_name: adminUser.fullName,
              role: adminUser.role
            }
          }
        );
        
        if (updateError) {
          console.log('⚠️  Could not update user metadata:', updateError.message);
        } else {
          console.log('✅ Updated user metadata');
        }
        
        // Use existing user for admin_meta creation
        authData.user = existingUser;
      } else {
        throw authError;
      }
    } else {
      console.log('✅ Created auth user:', authData.user.id);
    }

    // Step 2: Create or update admin_meta record
    console.log('👤 Creating admin profile...');
    
    const { data: existingAdmin, error: checkError } = await supabase
      .from('admin_meta')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (existingAdmin) {
      console.log('ℹ️  Admin profile already exists, updating...');
      
      const { error: updateError } = await supabase
        .from('admin_meta')
        .update({
          full_name: adminUser.fullName,
          role: adminUser.role
        })
        .eq('id', authData.user.id);

      if (updateError) throw updateError;
      console.log('✅ Updated admin profile');
    } else {
      console.log('📝 Creating new admin profile...');
      
      const { error: insertError } = await supabase
        .from('admin_meta')
        .insert({
          id: authData.user.id,
          full_name: adminUser.fullName,
          role: adminUser.role,
          created_at: new Date().toISOString()
        });

      if (insertError) throw insertError;
      console.log('✅ Created admin profile');
    }

    // Step 3: Test authentication
    console.log('🔐 Testing authentication...');
    
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: adminUser.email,
      password: adminUser.password
    });

    if (signInError) {
      console.log('⚠️  Authentication test failed:', signInError.message);
    } else {
      console.log('✅ Authentication test successful');
      
      // Sign out after test
      await supabase.auth.signOut();
    }

    console.log('\n🎉 Admin user setup completed successfully!');
    console.log('\n📋 Login Credentials:');
    console.log(`   Email: ${adminUser.email}`);
    console.log(`   Password: ${adminUser.password}`);
    console.log('\n🔄 Next Steps:');
    console.log('1. Restart your development server');
    console.log('2. Try logging in with the credentials above');
    console.log('3. The "Database error querying schema" should be resolved');

  } catch (error) {
    console.error('❌ Error creating admin user:', error.message);
    
    if (error.message.includes('service_role')) {
      console.log('\n💡 This error suggests the service role key is invalid.');
      console.log('Please verify you copied the correct service_role key from Supabase Dashboard.');
    }
    
    process.exit(1);
  }
}

// Run the script
createAdminUser();