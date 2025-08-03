import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log('Checking what tables exist in the database...');
  
  // Try to query information_schema to see what tables exist
  try {
    const { data, error } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    if (error) {
      console.log('Cannot query information_schema:', error.message);
    } else {
      console.log('Tables found:', data?.map(t => t.table_name));
    }
  } catch (err) {
    console.log('Error querying information_schema:', err.message);
  }
  
  // Test specific tables
  const tablesToTest = ['user_profiles', 'library_users', 'admin_meta', 'attendance_logs', 'scan_logs'];
  
  for (const table of tablesToTest) {
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error) {
        console.log(`❌ Table '${table}': ${error.message}`);
      } else {
        console.log(`✅ Table '${table}': exists (${data?.length || 0} rows in sample)`);
      }
    } catch (err) {
      console.log(`❌ Table '${table}': ${err.message}`);
    }
  }
}

checkTables();