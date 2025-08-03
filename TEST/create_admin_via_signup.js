import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createAdminViaSignup() {
  console.log('\n=== Creating Admin User via Signup ===\n');
  
  try {
    // First, try to sign up the admin user
    console.log('1. Attempting to create admin user...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: 'scnz141@gmail.com',
      password: 'Wehere',
      options: {
        data: {
          name: 'Admin User',
          role: 'admin'
        }
      }
    });
    
    if (signUpError) {
      if (signUpError.message.includes('already registered')) {
        console.log('✅ Admin user already exists, proceeding to link with admin_meta...');
        
        // Try to sign in to get the user ID
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: 'scnz141@gmail.com',
          password: 'Wehere'
        });
        
        if (signInError) {
          console.error('❌ Cannot sign in with existing user:', signInError.message);
          return;
        }
        
        console.log('✅ Successfully signed in existing user');
        const userId = signInData.user.id;
        
        // Update admin_meta with correct user_id
        await updateAdminMeta(userId);
        
        // Sign out
        await supabase.auth.signOut();
        
      } else {
        console.error('❌ Signup failed:', signUpError.message);
        return;
      }
    } else {
      console.log('✅ Admin user created successfully!');
      console.log('User ID:', signUpData.user?.id);
      console.log('Email:', signUpData.user?.email);
      console.log('Email confirmed:', signUpData.user?.email_confirmed_at ? 'Yes' : 'No');
      
      if (signUpData.user?.id) {
        await updateAdminMeta(signUpData.user.id);
      }
      
      // Sign out
      await supabase.auth.signOut();
    }
    
    // Test final authentication
    console.log('\n3. Testing final authentication...');
    const { data: testAuth, error: testError } = await supabase.auth.signInWithPassword({
      email: 'scnz141@gmail.com',
      password: 'Wehere'
    });
    
    if (testError) {
      console.error('❌ Final auth test failed:', testError.message);
    } else {
      console.log('✅ Final authentication successful!');
      console.log('User ID:', testAuth.user?.id);
      
      // Check admin_meta linkage
      const { data: adminMeta, error: metaError } = await supabase
        .from('admin_meta')
        .select('*')
        .eq('user_id', testAuth.user?.id);
      
      if (metaError) {
        console.error('❌ Error checking admin_meta:', metaError.message);
      } else if (adminMeta && adminMeta.length > 0) {
        console.log('✅ Admin meta record found:', adminMeta[0]);
      } else {
        console.log('⚠️  No admin_meta record found for this user');
      }
      
      // Sign out
      await supabase.auth.signOut();
    }
    
  } catch (error) {
    console.error('❌ Process failed:', error.message);
  }
}

async function updateAdminMeta(userId) {
  console.log('\n2. Updating admin_meta table...');
  
  try {
    // First, check if admin_meta record exists for this user
    const { data: existingMeta, error: checkError } = await supabase
      .from('admin_meta')
      .select('*')
      .eq('user_id', userId);
    
    if (checkError) {
      console.error('❌ Error checking admin_meta:', checkError.message);
      return;
    }
    
    if (existingMeta && existingMeta.length > 0) {
      console.log('✅ Admin meta record already exists for this user');
      return;
    }
    
    // Check if there's an admin_meta record with a different user_id that we need to update
    const { data: allMeta, error: allMetaError } = await supabase
      .from('admin_meta')
      .select('*');
    
    if (allMetaError) {
      console.error('❌ Error fetching admin_meta:', allMetaError.message);
      return;
    }
    
    if (allMeta && allMeta.length > 0) {
      // Update existing record with new user_id
      const { error: updateError } = await supabase
        .from('admin_meta')
        .update({ 
          user_id: userId,
          name: 'Admin User'
        })
        .eq('user_id', allMeta[0].user_id);
      
      if (updateError) {
        console.error('❌ Error updating admin_meta:', updateError.message);
      } else {
        console.log('✅ Updated existing admin_meta record with new user_id');
      }
    } else {
      // Create new admin_meta record
      const { error: insertError } = await supabase
        .from('admin_meta')
        .insert({
          user_id: userId,
          name: 'Admin User',
          created_at: new Date().toISOString()
        });
      
      if (insertError) {
        console.error('❌ Error creating admin_meta:', insertError.message);
      } else {
        console.log('✅ Created new admin_meta record');
      }
    }
    
  } catch (error) {
    console.error('❌ Error updating admin_meta:', error.message);
  }
}

createAdminViaSignup();