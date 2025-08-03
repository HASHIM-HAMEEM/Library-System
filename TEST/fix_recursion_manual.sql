-- Manual Fix for Infinite Recursion in RLS Policies
-- Run this script in Supabase Dashboard > SQL Editor

-- Step 1: Disable RLS temporarily to clean up
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;

-- Step 2: Drop ALL existing policies that might cause recursion
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

-- Drop any recursive functions
DROP FUNCTION IF EXISTS is_admin(UUID);

-- Step 3: Update admin user's auth metadata to include role
-- This allows us to check admin status without querying user_profiles
UPDATE auth.users 
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb
WHERE email = 'scnz141@gmail.com';

-- Step 4: Re-enable RLS
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Step 5: Create simple, non-recursive policies

-- Users can view their own profile
CREATE POLICY "users_own_profile_select" ON user_profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "users_own_profile_update" ON user_profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Allow profile creation during signup
CREATE POLICY "allow_profile_creation" ON user_profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

-- Service role has full access (no recursion)
CREATE POLICY "service_role_full_access" ON user_profiles
    FOR ALL TO service_role
    USING (true)
    WITH CHECK (true);

-- Step 6: Verify the admin user exists in user_profiles
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
    COALESCE(au.raw_user_meta_data->>'name', au.email),
    'admin',
    'verified',
    'active',
    au.created_at,
    NOW()
FROM auth.users au
WHERE au.email = 'scnz141@gmail.com'
ON CONFLICT (id) DO UPDATE SET
    role = 'admin',
    status = 'verified',
    subscription_status = 'active',
    updated_at = NOW();

-- Step 7: Test the fix
SELECT 'Fix completed successfully' as status;
SELECT id, email, role FROM user_profiles WHERE email = 'scnz141@gmail.com';
SELECT id, email, raw_app_meta_data FROM auth.users WHERE email = 'scnz141@gmail.com';