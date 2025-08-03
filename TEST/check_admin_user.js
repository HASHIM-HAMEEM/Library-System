import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAdminUser() {
  console.log('🔍 Checking admin user data...');
  console.log('🌐 Connected to:', supabaseUrl);
  
  try {
    // Check admin_meta table
    console.log('\n📋 Checking admin_meta table:');
    const { data: adminData, error: adminError } = await supabase
      .from('admin_meta')
      .select('*');
    
    if (adminError) {
      console.log('❌ Error accessing admin_meta:', adminError.message);
    } else {
      console.log('✅ Admin meta data:');
      adminData.forEach(admin => {
        console.log(`   - ID: ${admin.user_id}`);
        console.log(`   - Name: ${admin.name}`);
        console.log(`   - Email: ${admin.email}`);
        console.log(`   - Created: ${admin.created_at}`);
        console.log('   ---');
      });
    }
    
    // Check library_users table
    console.log('\n📋 Checking library_users table:');
    const { data: usersData, error: usersError } = await supabase
      .from('library_users')
      .select('*');
    
    if (usersError) {
      console.log('❌ Error accessing library_users:', usersError.message);
    } else {
      console.log('✅ Library users data:');
      usersData.forEach(user => {
        console.log(`   - ID: ${user.id}`);
        console.log(`   - Name: ${user.name}`);
        console.log(`   - Email: ${user.email}`);
        console.log(`   - Created: ${user.created_at}`);
        console.log('   ---');
      });
    }
    
    // Try to authenticate with the expected admin credentials
    console.log('\n🔐 Testing authentication with admin@example.com...');
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: 'admin@example.com',
      password: 'admin123'
    });
    
    if (authError) {
      console.log('❌ Auth failed:', authError.message);
      
      // Try alternative admin email
      console.log('\n🔐 Testing authentication with admin@library.com...');
      const { data: authData2, error: authError2 } = await supabase.auth.signInWithPassword({
        email: 'admin@library.com',
        password: 'admin123'
      });
      
      if (authError2) {
        console.log('❌ Auth failed:', authError2.message);
      } else {
        console.log('✅ Authentication successful with admin@library.com');
        console.log('   User ID:', authData2.user?.id);
        console.log('   Email:', authData2.user?.email);
      }
    } else {
      console.log('✅ Authentication successful with admin@example.com');
      console.log('   User ID:', authData.user?.id);
      console.log('   Email:', authData.user?.email);
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkAdminUser().catch(console.error);