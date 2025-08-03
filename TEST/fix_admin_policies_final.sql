-- Final Admin Policy Fix Script
-- This script cleans up all overlapping policies and creates proper admin users
-- Run this in Supabase SQL Editor

-- Step 1: Disable RLS temporarily to clean up
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop all existing policies on user_profiles to start fresh
DROP POLICY IF EXISTS "Admins can manage all user profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow authenticated users to read profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow service role full access" ON user_profiles;
DROP POLICY IF EXISTS "Allow service role to insert profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable profile creation for authenticated users" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "admin_all" ON user_profiles;
DROP POLICY IF EXISTS "student_self_select" ON user_profiles;
DROP POLICY IF EXISTS "student_self_update" ON user_profiles;
DROP POLICY IF EXISTS "user_profile_access" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON user_profiles;

-- Step 3: Create or update admin users in auth.users
-- First, check if admin@library.com exists
DO $$
BEGIN
    -- Create admin@library.com if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'admin@library.com') THEN
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            role,
            aud
        ) VALUES (
            '00000000-0000-0000-0000-000000000001',
            'admin@library.com',
            crypt('admin123', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"role": "admin"}',
            '{"name": "Library Admin", "full_name": "Library Admin"}',
            'authenticated',
            'authenticated'
        );
        RAISE NOTICE 'Created admin@library.com user';
    ELSE
        -- Update existing user to ensure admin role
        UPDATE auth.users 
        SET 
            raw_app_meta_data = '{"role": "admin"}',
            raw_user_meta_data = COALESCE(raw_user_meta_data, '{}') || '{"name": "Library Admin", "full_name": "Library Admin"}',
            email_confirmed_at = COALESCE(email_confirmed_at, NOW())
        WHERE email = 'admin@library.com';
        RAISE NOTICE 'Updated admin@library.com user';
    END IF;

    -- Create scnz141@gmail.com if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'scnz141@gmail.com') THEN
        INSERT INTO auth.users (
            id,
            email,
            encrypted_password,
            email_confirmed_at,
            created_at,
            updated_at,
            raw_app_meta_data,
            raw_user_meta_data,
            role,
            aud
        ) VALUES (
            '00000000-0000-0000-0000-000000000002',
            'scnz141@gmail.com',
            crypt('Wehere', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"role": "admin"}',
            '{"name": "Admin User", "full_name": "Admin User"}',
            'authenticated',
            'authenticated'
        );
        RAISE NOTICE 'Created scnz141@gmail.com user';
    ELSE
        -- Update existing user to ensure admin role
        UPDATE auth.users 
        SET 
            raw_app_meta_data = '{"role": "admin"}',
            raw_user_meta_data = COALESCE(raw_user_meta_data, '{}') || '{"name": "Admin User", "full_name": "Admin User"}',
            email_confirmed_at = COALESCE(email_confirmed_at, NOW())
        WHERE email = 'scnz141@gmail.com';
        RAISE NOTICE 'Updated scnz141@gmail.com user';
    END IF;
END $$;

-- Step 4: Create or update user profiles for admin users
INSERT INTO user_profiles (id, email, name, role, status, subscription_status, created_at, updated_at)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', au.email),
    'admin',
    'verified',
    'active',
    au.created_at,
    NOW()
FROM auth.users au
WHERE au.email IN ('admin@library.com', 'scnz141@gmail.com')
ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    status = 'verified',
    subscription_status = 'active',
    updated_at = NOW();

-- Step 5: Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 6: Create clean, simple policies
-- Users can view their own profile
CREATE POLICY "users_view_own_profile" ON user_profiles
    FOR SELECT 
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_update_own_profile" ON user_profiles
    FOR UPDATE 
    USING (auth.uid() = id);

-- Admins can view all profiles
CREATE POLICY "admins_view_all_profiles" ON user_profiles
    FOR SELECT 
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_app_meta_data->>'role' = 'admin'
        )
    );

-- Admins can update all profiles
CREATE POLICY "admins_update_all_profiles" ON user_profiles
    FOR UPDATE 
    USING (
        EXISTS (
            SELECT 1 FROM auth.users 
            WHERE id = auth.uid() 
            AND raw_app_meta_data->>'role' = 'admin'
        )
    );

-- Allow profile creation during signup
CREATE POLICY "allow_profile_creation" ON user_profiles
    FOR INSERT 
    WITH CHECK (auth.uid() = id);

-- Step 7: Verify the setup
SELECT 
    'Admin Users Created/Updated' as status,
    au.id,
    au.email,
    au.raw_app_meta_data->>'role' as auth_role,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    up.role as profile_role,
    up.status as profile_status
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE au.email IN ('admin@library.com', 'scnz141@gmail.com')
ORDER BY au.email;

-- Step 8: Show current policies
SELECT 
    'Current Policies on user_profiles' as info,
    policyname,
    cmd as policy_type
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

RAISE NOTICE '';
RAISE NOTICE '✅ Admin setup completed!';
RAISE NOTICE 'You can now login with:';
RAISE NOTICE '  📧 admin@library.com / 🔑 admin123';
RAISE NOTICE '  📧 scnz141@gmail.com / 🔑 Wehere';
RAISE NOTICE '';
RAISE NOTICE 'All overlapping policies have been cleaned up.';
RAISE NOTICE 'Only 5 clean policies remain on user_profiles table.';