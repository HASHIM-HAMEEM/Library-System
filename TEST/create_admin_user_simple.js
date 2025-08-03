const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

async function createAdminUser() {
  try {
    console.log('🔍 Checking if admin user already exists...');
    
    // Check if admin profile already exists
    const { data: existingProfile, error: checkError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('email', 'scnz141@gmail.com')
      .single();
    
    if (existingProfile) {
      console.log('✅ Admin profile already exists:');
      console.log('   Email:', existingProfile.email);
      console.log('   Role:', existingProfile.role);
      console.log('   Status:', existingProfile.status);
      console.log('   ID:', existingProfile.id);
      
      if (existingProfile.role === 'admin' && existingProfile.status === 'verified') {
        console.log('\n🎉 Admin user is properly configured!');
        console.log('\n📝 Login credentials:');
        console.log('   Email: scnz141@gmail.com');
        console.log('   Password: Wehere');
        return;
      } else {
        console.log('\n🔧 Updating profile to admin status...');
        const { error: updateError } = await supabase
          .from('user_profiles')
          .update({
            role: 'admin',
            status: 'verified',
            subscription_status: 'active',
            updated_at: new Date().toISOString()
          })
          .eq('email', 'scnz141@gmail.com');
        
        if (updateError) {
          console.error('❌ Error updating profile:', updateError.message);
          return;
        }
        
        console.log('✅ Profile updated to admin status!');
      }
    } else {
      console.log('📝 Creating new admin profile...');
      
      // Generate UUID for admin user
      const adminUserId = crypto.randomUUID();
      
      // Create admin profile
      const { data: newProfile, error: createError } = await supabase
        .from('user_profiles')
        .insert({
          id: adminUserId,
          name: 'Admin User',
          email: 'scnz141@gmail.com',
          role: 'admin',
          status: 'verified',
          subscription_status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (createError) {
        console.error('❌ Error creating admin profile:', createError.message);
        console.error('Details:', createError);
        return;
      }
      
      console.log('✅ Admin profile created successfully!');
      console.log('   ID:', newProfile.id);
      console.log('   Email:', newProfile.email);
      console.log('   Role:', newProfile.role);
    }
    
    console.log('\n🔐 Next steps:');
    console.log('1. Go to Supabase Dashboard → Authentication → Users');
    console.log('2. Click "Add User"');
    console.log('3. Use these credentials:');
    console.log('   Email: scnz141@gmail.com');
    console.log('   Password: Wehere');
    console.log('   Auto Confirm: ✅ (checked)');
    console.log('\n🚀 Then you can login to your app!');
    
  } catch (error) {
    console.error('❌ Unexpected error:', error.message);
  }
}

// Run the function
createAdminUser();