import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hkpetmoloqeqkexxlfcz.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found in environment variables');
  console.log('Please add your service role key to .env file:');
  console.log('SUPABASE_SERVICE_ROLE_KEY=your_service_key_here');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdminUser() {
  console.log('🚀 Creating new admin user...');
  
  const adminEmail = 'scnz141@gmail.com';
  const adminPassword = 'Wehere';
  
  try {
    // Step 1: Create auth user
    console.log('📝 Creating authentication user...');
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: {
        name: 'Admin User',
        role: 'admin'
      }
    });
    
    if (authError) {
      console.error('❌ Error creating auth user:', authError.message);
      return;
    }
    
    console.log('✅ Auth user created with ID:', authUser.user.id);
    
    // Step 2: Create user profile
    console.log('👤 Creating user profile...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .insert({
        id: authUser.user.id,
        email: adminEmail,
        name: 'Admin User',
        role: 'admin',
        status: 'verified',
        subscription_status: 'active'
      })
      .select()
      .single();
    
    if (profileError) {
      console.error('❌ Error creating user profile:', profileError.message);
      console.log('🔧 Trying to update existing profile...');
      
      // Try to update existing profile
      const { data: updatedProfile, error: updateError } = await supabase
        .from('user_profiles')
        .update({
          role: 'admin',
          status: 'verified',
          subscription_status: 'active'
        })
        .eq('id', authUser.user.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Error updating profile:', updateError.message);
        return;
      }
      
      console.log('✅ Profile updated successfully');
    } else {
      console.log('✅ User profile created successfully');
    }
    
    console.log('\n🎉 Admin user created successfully!');
    console.log('📧 Email:', adminEmail);
    console.log('🔑 Password:', adminPassword);
    console.log('🆔 User ID:', authUser.user.id);
    console.log('\n✨ You can now login to the admin dashboard!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the function
createAdminUser();