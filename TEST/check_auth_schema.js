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

async function checkAuthSchema() {
  console.log('\n=== Checking Auth Schema ===\n');
  
  try {
    // Try to query auth schema directly
    console.log('1. Checking auth schema tables...');
    
    // Check if we can access auth.users through RPC or direct query
    const { data: rpcResult, error: rpcError } = await supabase
      .rpc('get_auth_users_info');
    
    if (rpcError) {
      console.log('RPC function not available:', rpcError.message);
    } else {
      console.log('Auth users via RPC:', rpcResult);
    }
    
    // Try different approaches to check auth users
    console.log('\n2. Trying to access auth information...');
    
    // Check current session
    const { data: session } = await supabase.auth.getSession();
    console.log('Current session:', session.session ? 'Active' : 'None');
    
    // Try to get user info
    const { data: user } = await supabase.auth.getUser();
    console.log('Current user:', user.user ? user.user.email : 'None');
    
    // Check what tables we can actually access
    console.log('\n3. Checking accessible tables...');
    
    // Get table information from information_schema
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name, table_schema')
      .eq('table_schema', 'public');
    
    if (tablesError) {
      console.log('Cannot access information_schema:', tablesError.message);
    } else {
      console.log('Available public tables:');
      tables?.forEach(table => {
        console.log(`  - ${table.table_name}`);
      });
    }
    
    // Check if we have any auth-related functions
    console.log('\n4. Testing auth functions...');
    
    try {
      const { data: signUpTest, error: signUpError } = await supabase.auth.signUp({
        email: 'test@example.com',
        password: 'testpassword123'
      });
      
      if (signUpError) {
        console.log('SignUp test error:', signUpError.message);
      } else {
        console.log('SignUp test successful - auth is working');
        // Clean up test user if created
        if (signUpTest.user) {
          console.log('Test user created, should be cleaned up');
        }
      }
    } catch (err) {
      console.log('SignUp test failed:', err.message);
    }
    
  } catch (error) {
    console.error('Schema check failed:', error.message);
  }
}

checkAuthSchema();