import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://hkpetmoloqeqkexxlfcz.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY not found');
  process.exit(1);
}

// Create Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function fixAdminUser() {
  console.log('🔧 Fixing admin user...');
  
  const adminEmail = 'scnz141@gmail.com';
  
  try {
    // Step 1: Update the existing profile to verified status
    console.log('📝 Updating user profile status...');
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .update({
        status: 'verified',
        subscription_status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('email', adminEmail)
      .select()
      .single();
    
    if (profileError) {
      console.error('❌ Error updating profile:', profileError.message);
      return;
    }
    
    console.log('✅ Profile updated successfully!');
    console.log('👤 Profile details:');
    console.log(`  - ID: ${profile.id}`);
    console.log(`  - Email: ${profile.email}`);
    console.log(`  - Role: ${profile.role}`);
    console.log(`  - Status: ${profile.status}`);
    
    // Step 2: Try to create auth user (this might fail due to auth issues)
    console.log('\n🔐 Attempting to create auth user...');
    try {
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: adminEmail,
        password: 'Wehere',
        email_confirm: true,
        user_metadata: {
          name: 'Admin User',
          role: 'admin'
        }
      });
      
      if (authError) {
        console.log('⚠️  Auth user creation failed:', authError.message);
        console.log('\n📋 Manual steps required:');
        console.log('1. Go to Supabase Dashboard: https://supabase.com/dashboard');
        console.log('2. Navigate to Authentication > Users');
        console.log('3. Click "Add User"');
        console.log('4. Use these details:');
        console.log(`   - Email: ${adminEmail}`);
        console.log('   - Password: Wehere');
        console.log(`   - User ID: ${profile.id} (IMPORTANT: Use this exact ID)`);
        console.log('   - Auto Confirm User: ✅ (checked)');
        console.log('5. Click "Create User"');
      } else {
        console.log('✅ Auth user created successfully!');
        console.log(`🆔 Auth User ID: ${authUser.user.id}`);
        
        // Update profile with correct ID if needed
        if (authUser.user.id !== profile.id) {
          console.log('🔄 Updating profile ID to match auth user...');
          const { error: updateError } = await supabase
            .from('user_profiles')
            .update({ id: authUser.user.id })
            .eq('email', adminEmail);
          
          if (updateError) {
            console.log('⚠️  Could not update profile ID:', updateError.message);
          } else {
            console.log('✅ Profile ID updated to match auth user');
          }
        }
      }
    } catch (authCreateError) {
      console.log('⚠️  Auth system error:', authCreateError.message);
      console.log('\n📋 Manual creation required - see instructions above');
    }
    
    console.log('\n🎉 Admin user setup completed!');
    console.log('📧 Login credentials:');
    console.log(`   Email: ${adminEmail}`);
    console.log('   Password: Wehere');
    console.log('\n✨ Try logging in to the admin dashboard now!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the function
fixAdminUser();