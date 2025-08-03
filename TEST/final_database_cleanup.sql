-- Final Database Cleanup Script
-- This script will completely clean up all issues and ensure proper admin setup

-- Step 1: Disable RLS temporarily
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Remove any duplicate user_profiles records
-- Keep only the most recent record for each user
WITH duplicates AS (
    SELECT id, email, 
           ROW_NUMBER() OVER (PARTITION BY id ORDER BY updated_at DESC, created_at DESC) as rn
    FROM user_profiles
    WHERE email IN ('admin@library.com', 'scnz141@gmail.com')
)
DELETE FROM user_profiles 
WHERE (id, email) IN (
    SELECT id, email FROM duplicates WHERE rn > 1
);

-- Step 3: Drop ALL existing policies completely
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
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Allow profile creation" ON user_profiles;
DROP POLICY IF EXISTS "users_view_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "users_update_own_profile" ON user_profiles;
DROP POLICY IF EXISTS "admins_view_all_profiles" ON user_profiles;
DROP POLICY IF EXISTS "admins_update_all_profiles" ON user_profiles;
DROP POLICY IF EXISTS "allow_profile_creation" ON user_profiles;
DROP POLICY IF EXISTS "service_role_access" ON user_profiles;
DROP POLICY IF EXISTS "users_own_profile_select" ON user_profiles;
DROP POLICY IF EXISTS "users_own_profile_update" ON user_profiles;
DROP POLICY IF EXISTS "profile_creation" ON user_profiles;
DROP POLICY IF EXISTS "admin_full_access" ON user_profiles;
DROP POLICY IF EXISTS "authenticated_access" ON user_profiles;

-- Step 4: Drop any problematic functions
DROP FUNCTION IF EXISTS is_admin(UUID);

-- Step 5: Ensure admin users exist in auth.users with correct metadata
-- First, delete any existing admin users to start fresh
DELETE FROM auth.users WHERE email IN ('admin@library.com', 'scnz141@gmail.com');

-- Insert admin users with proper structure
INSERT INTO auth.users (
    instance_id,
    id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES 
(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'admin@library.com',
    crypt('admin123', gen_salt('bf')),
    NOW(),
    '{"role": "admin"}',
    '{"name": "Admin User"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
),
(
    '00000000-0000-0000-0000-000000000000',
    gen_random_uuid(),
    'authenticated',
    'authenticated',
    'scnz141@gmail.com',
    crypt('Wehere', gen_salt('bf')),
    NOW(),
    '{"role": "admin"}',
    '{"name": "Admin User 2"}',
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
)
ON CONFLICT (email) DO UPDATE SET
    encrypted_password = EXCLUDED.encrypted_password,
    raw_app_meta_data = EXCLUDED.raw_app_meta_data,
    email_confirmed_at = NOW(),
    updated_at = NOW();

-- Step 6: Clean up user_profiles and insert admin profiles
DELETE FROM user_profiles WHERE email IN ('admin@library.com', 'scnz141@gmail.com');

INSERT INTO user_profiles (
    id,
    email,
    name,
    role,
    status,
    subscription_status,
    created_at,
    updated_at
)
SELECT 
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', 'Admin User'),
    'admin',
    'verified',
    'active',
    au.created_at,
    NOW()
FROM auth.users au
WHERE au.email IN ('admin@library.com', 'scnz141@gmail.com');

-- Step 7: Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 8: Create ONLY the essential policies (no overlaps)
-- Policy 1: Users can view their own profile
CREATE POLICY "user_own_select" ON user_profiles
    FOR SELECT 
    TO authenticated
    USING (auth.uid() = id);

-- Policy 2: Users can update their own profile
CREATE POLICY "user_own_update" ON user_profiles
    FOR UPDATE 
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Policy 3: Allow profile creation during signup
CREATE POLICY "user_insert" ON user_profiles
    FOR INSERT 
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- Policy 4: Admin full access (simplified, no recursion)
CREATE POLICY "admin_access" ON user_profiles
    FOR ALL 
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE raw_app_meta_data->>'role' = 'admin'
        )
    )
    WITH CHECK (
        auth.uid() IN (
            SELECT id FROM auth.users 
            WHERE raw_app_meta_data->>'role' = 'admin'
        )
    );

-- Step 9: Verification queries
SELECT 
    'Final Verification' as status,
    au.id,
    au.email,
    au.raw_app_meta_data->>'role' as auth_role,
    au.email_confirmed_at IS NOT NULL as email_confirmed,
    up.role as profile_role,
    up.status as profile_status
FROM auth.users au
JOIN user_profiles up ON au.id = up.id
WHERE au.email IN ('admin@library.com', 'scnz141@gmail.com')
ORDER BY au.email;

-- Show final policies
SELECT 
    'Final Policies' as status,
    policyname,
    cmd as policy_type
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;

RAISE NOTICE '✅ Database cleanup completed!';
RAISE NOTICE 'Admin credentials:';
RAISE NOTICE '  📧 admin@library.com / 🔑 admin123';
RAISE NOTICE '  📧 scnz141@gmail.com / 🔑 Wehere';
RAISE NOTICE 'Only 4 clean policies remain on user_profiles table.';