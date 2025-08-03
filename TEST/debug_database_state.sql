-- Debug Database State Script
-- Run this in Supabase SQL Editor to check current state

-- Check current policies on user_profiles
SELECT 
    'Current Policies on user_profiles' as info,
    policyname,
    cmd as policy_type,
    qual as using_clause,
    with_check as with_check_clause
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

-- Check for duplicate admin users
SELECT 
    'Admin Users Check' as info,
    au.id,
    au.email,
    au.raw_app_meta_data->>'role' as auth_role,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    up.role as profile_role,
    up.status as profile_status,
    up.subscription_status
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE au.email IN ('admin@library.com', 'scnz141@gmail.com')
ORDER BY au.email;

-- Check for any duplicate user_profiles records
SELECT 
    'Duplicate Profile Check' as info,
    id,
    email,
    COUNT(*) as count
FROM user_profiles 
WHERE email IN ('admin@library.com', 'scnz141@gmail.com')
GROUP BY id, email
HAVING COUNT(*) > 1;

-- Check all user_profiles for admin@library.com
SELECT 
    'All admin@library.com profiles' as info,
    *
FROM user_profiles 
WHERE email = 'admin@library.com';

-- Check auth.users for admin@library.com
SELECT 
    'Auth users for admin@library.com' as info,
    id,
    email,
    raw_app_meta_data,
    raw_user_meta_data,
    email_confirmed_at,
    created_at
FROM auth.users 
WHERE email = 'admin@library.com';

-- Test the admin policy query directly
SELECT 
    'Admin policy test' as info,
    EXISTS (
        SELECT 1 FROM auth.users 
        WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@library.com' LIMIT 1)
        AND raw_app_meta_data->>'role' = 'admin'
    ) as is_admin_check;

-- Check if there are any conflicting functions
SELECT 
    'Functions check' as info,
    proname as function_name,
    prosrc as function_body
FROM pg_proc 
WHERE proname LIKE '%admin%' OR proname LIKE '%is_admin%';