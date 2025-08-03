// Simple script to execute the admin profile creation
// This will create the profile and show the UUID needed for auth user creation

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase configuration!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdminWithSQL() {
  try {
    console.log('🚀 Creating admin user profile using SQL...');
    
    // Generate UUID for admin user
    const adminUserId = randomUUID();
    
    console.log(`📧 Email: scnz141@gmail.com`);
    console.log(`🆔 Generated User ID: ${adminUserId}`);
    
    // Execute SQL to create admin profile with RLS disabled temporarily
    const { data, error } = await supabase.rpc('create_admin_profile', {
      admin_id: adminUserId,
      admin_email: 'scnz141@gmail.com',
      admin_name: 'Admin User'
    });
    
    if (error) {
      // If the function doesn't exist, we'll create the profile directly
      console.log('⚠️  RPC function not found, trying direct SQL...');
      
      // Try to create using raw SQL
      const { data: sqlResult, error: sqlError } = await supabase
        .from('user_profiles')
        .insert({
          id: adminUserId,
          name: 'Admin User',
          email: 'scnz141@gmail.com',
          role: 'admin',
          status: 'verified',
          subscription_status: 'active'
        })
        .select()
        .single();
      
      if (sqlError) {
        if (sqlError.message.includes('row-level security')) {
          console.log('❌ RLS is blocking the insert. Please use the SQL script in Supabase Dashboard.');
          console.log('\n📋 Manual Steps:');
          console.log('1. Go to Supabase Dashboard > SQL Editor');
          console.log('2. Run the script from: TEST/create_admin_direct.sql');
          console.log('3. Follow the instructions in: TEST/ADMIN_USER_CREATION_GUIDE.md');
          return;
        }
        throw sqlError;
      }
      
      console.log('✅ Admin profile created successfully!');
      console.log('📋 Profile details:', sqlResult);
    } else {
      console.log('✅ Admin profile created via RPC!');
      console.log('📋 Result:', data);
    }
    
    console.log('\n🎉 Admin user profile is ready!');
    console.log('\n📝 Next Steps:');
    console.log('1. Create auth user in Supabase Dashboard:');
    console.log('   - Go to Authentication > Users > Add User');
    console.log('   - Email: scnz141@gmail.com');
    console.log('   - Password: Wehere');
    console.log(`   - User ID: ${adminUserId} (IMPORTANT: Use this exact ID)`);
    console.log('\n2. Or use Supabase CLI:');
    console.log(`   supabase auth users create scnz141@gmail.com --password Wehere --user-id ${adminUserId}`);
    console.log('\n3. Test login on your application');
    console.log('\n📖 For detailed instructions, see: TEST/ADMIN_USER_CREATION_GUIDE.md');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Alternative: Use SQL script directly');
    console.log('1. Go to Supabase Dashboard > SQL Editor');
    console.log('2. Run the script from: TEST/create_admin_direct.sql');
    console.log('3. Follow the guide: TEST/ADMIN_USER_CREATION_GUIDE.md');
  }
}

createAdminWithSQL();