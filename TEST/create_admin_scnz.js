import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase URL or Service Role Key');
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
  const email = 'scnz@gmail.com';
  const password = 'Wehere';
  const userId = '22222222-2222-2222-2222-222222222222';

  try {
    console.log('Creating admin user:', email);

    // First, try to create the auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: email,
      password: password,
      user_metadata: {
        role: 'admin'
      },
      email_confirm: true
    });

    if (authError) {
      console.error('Auth user creation error:', authError.message);
      // Continue to try profile creation even if auth fails
    } else {
      console.log('Auth user created successfully:', authData.user?.id);
    }

    // Create or update user profile
    const { data: profileData, error: profileError } = await supabase
      .from('user_profiles')
      .upsert({
        id: authData?.user?.id || userId,
        email: email,
        name: 'Admin User',
        role: 'admin',
        status: 'verified',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'id'
      });

    if (profileError) {
      console.error('Profile creation error:', profileError.message);
    } else {
      console.log('User profile created/updated successfully');
    }

    console.log('\n=== ADMIN USER SETUP COMPLETE ===');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Role: admin');
    console.log('Status: verified');
    console.log('\nYou can now try logging in to the admin dashboard.');

  } catch (error) {
    console.error('Unexpected error:', error.message);
  }
}

createAdminUser();