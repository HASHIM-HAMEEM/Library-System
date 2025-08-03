-- Fix for specific user ID: 267b2d3f-d089-413a-a53d-b08f6c30f8a2
-- This user is experiencing 'multiple rows returned' error
-- Run this in Supabase SQL Editor

-- 1. Check current state of this specific user
SELECT 'Current auth.users data for problematic user:' as debug_section;
SELECT id, email, raw_app_meta_data, raw_user_meta_data, created_at 
FROM auth.users 
WHERE id = '267b2d3f-d089-413a-a53d-b08f6c30f8a2';

-- 2. Check if this user exists in user_profiles (might be duplicates)
SELECT 'user_profiles records for this user:' as debug_section;
SELECT * FROM user_profiles 
WHERE id = '267b2d3f-d089-413a-a53d-b08f6c30f8a2';

-- 3. Check admin_meta table
SELECT 'admin_meta records for this user:' as debug_section;
SELECT * FROM admin_meta 
WHERE user_id = '267b2d3f-d089-413a-a53d-b08f6c30f8a2';

-- 4. Check library_users table
SELECT 'library_users records for this user:' as debug_section;
SELECT * FROM library_users 
WHERE id = '267b2d3f-d089-413a-a53d-b08f6c30f8a2';

-- 5. Check if there are multiple records causing the issue
SELECT 'Checking for duplicate records:' as debug_section;
SELECT 
    'user_profiles' as table_name,
    COUNT(*) as record_count
FROM user_profiles 
WHERE id = '267b2d3f-d089-413a-a53d-b08f6c30f8a2'
UNION ALL
SELECT 
    'admin_meta' as table_name,
    COUNT(*) as record_count
FROM admin_meta 
WHERE user_id = '267b2d3f-d089-413a-a53d-b08f6c30f8a2'
UNION ALL
SELECT 
    'library_users' as table_name,
    COUNT(*) as record_count
FROM library_users 
WHERE id = '267b2d3f-d089-413a-a53d-b08f6c30f8a2';

-- 6. Fix the issue by ensuring this user is properly set up as admin
-- First, clean up any existing records
DELETE FROM user_profiles WHERE id = '267b2d3f-d089-413a-a53d-b08f6c30f8a2';
DELETE FROM admin_meta WHERE user_id = '267b2d3f-d089-413a-a53d-b08f6c30f8a2';
DELETE FROM library_users WHERE id = '267b2d3f-d089-413a-a53d-b08f6c30f8a2';

-- 7. Update the auth.users record to have proper admin metadata
UPDATE auth.users 
SET raw_app_meta_data = '{"role": "admin"}'
WHERE id = '267b2d3f-d089-413a-a53d-b08f6c30f8a2';

-- 8. Insert proper admin_meta record
INSERT INTO admin_meta (user_id, full_name, created_at, updated_at)
SELECT 
    id,
    COALESCE(raw_user_meta_data ->> 'name', email, 'Admin User'),
    created_at,
    NOW()
FROM auth.users 
WHERE id = '267b2d3f-d089-413a-a53d-b08f6c30f8a2'
ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    updated_at = NOW();

-- 9. Insert proper user_profiles record for admin
INSERT INTO user_profiles (id, email, name, role, status, created_at, updated_at)
SELECT 
    id,
    email,
    COALESCE(raw_user_meta_data ->> 'name', email, 'Admin User'),
    'admin',
    'verified',
    created_at,
    NOW()
FROM auth.users 
WHERE id = '267b2d3f-d089-413a-a53d-b08f6c30f8a2'
ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    status = 'verified',
    updated_at = NOW();

-- 10. Verify the fix
SELECT 'Verification - Final state:' as debug_section;
SELECT 
    'auth.users' as table_name,
    email,
    raw_app_meta_data
FROM auth.users 
WHERE id = '267b2d3f-d089-413a-a53d-b08f6c30f8a2'
UNION ALL
SELECT 
    'user_profiles' as table_name,
    email,
    json_build_object('role', role, 'status', status)::text
FROM user_profiles 
WHERE id = '267b2d3f-d089-413a-a53d-b08f6c30f8a2'
UNION ALL
SELECT 
    'admin_meta' as table_name,
    'N/A' as email,
    json_build_object('full_name', full_name)::text
FROM admin_meta 
WHERE user_id = '267b2d3f-d089-413a-a53d-b08f6c30f8a2';

-- Instructions:
-- 1. Run this script in Supabase SQL Editor
-- 2. This will clean up the problematic user and set them up properly as an admin
-- 3. After running, try logging in again with admin@library.com