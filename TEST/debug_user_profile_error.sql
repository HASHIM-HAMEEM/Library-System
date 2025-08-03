-- Debug script to identify the cause of 'multiple rows returned' error
-- Run this in Supabase SQL Editor

-- 1. Check current user_profiles table structure and data
SELECT 'user_profiles table data:' as debug_section;
SELECT * FROM user_profiles ORDER BY created_at;

-- 2. Check admin_meta table
SELECT 'admin_meta table data:' as debug_section;
SELECT * FROM admin_meta ORDER BY created_at;

-- 3. Check library_users table
SELECT 'library_users table data:' as debug_section;
SELECT * FROM library_users ORDER BY created_at;

-- 4. Check auth.users for admin users
SELECT 'auth.users admin data:' as debug_section;
SELECT id, email, raw_app_meta_data, raw_user_meta_data, created_at 
FROM auth.users 
WHERE email IN ('admin@library.com', 'scnz141@gmail.com')
ORDER BY created_at;

-- 5. Check for duplicate admin records
SELECT 'Duplicate admin check:' as debug_section;
SELECT email, COUNT(*) as count
FROM auth.users 
WHERE email IN ('admin@library.com', 'scnz141@gmail.com')
GROUP BY email
HAVING COUNT(*) > 1;

-- 6. Check current RLS policies on user_profiles
SELECT 'Current RLS policies:' as debug_section;
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename = 'user_profiles';

-- 7. Test the exact query that's failing
SELECT 'Testing admin_meta query:' as debug_section;
-- Replace 'USER_ID_HERE' with the actual user ID from the logs
-- SELECT * FROM admin_meta WHERE user_id = 'USER_ID_HERE';

SELECT 'Testing library_users query:' as debug_section;
-- Replace 'USER_ID_HERE' with the actual user ID from the logs  
-- SELECT * FROM library_users WHERE id = 'USER_ID_HERE';

-- 8. Check if there are any foreign key constraints causing issues
SELECT 'Foreign key constraints:' as debug_section;
SELECT 
    tc.table_name, 
    kcu.column_name, 
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM 
    information_schema.table_constraints AS tc 
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY' 
  AND (tc.table_name = 'user_profiles' OR tc.table_name = 'admin_meta' OR tc.table_name = 'library_users');

-- Instructions:
-- 1. Run this script in Supabase SQL Editor
-- 2. Look for duplicate records or missing data
-- 3. Check if the user ID from the error logs exists in the expected tables
-- 4. Verify RLS policies are not conflicting