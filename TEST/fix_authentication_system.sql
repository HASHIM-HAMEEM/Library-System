-- Authentication System Fix Script
-- This script fixes the authentication system to work with the existing library_users table
-- Run this in your Supabase SQL Editor

-- =====================================================
-- STEP 0: CREATE TABLE IF IT DOESN'T EXIST
-- =====================================================

-- Create library_users table if it doesn't exist (with current structure)
CREATE TABLE IF NOT EXISTS public.library_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subscription_valid_until DATE,
  qr_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- STEP 1: ADD MISSING FIELDS TO LIBRARY_USERS
-- =====================================================

-- Add authentication-related fields to existing library_users table
-- Note: The table currently has 'name', 'subscription_valid_until', 'qr_code', 'created_at', 'updated_at'
ALTER TABLE public.library_users 
ADD COLUMN IF NOT EXISTS user_id UUID, -- Reference to auth user
ADD COLUMN IF NOT EXISTS full_name TEXT,
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin')),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'expired'));

-- Add unique constraint on email (only if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'library_users_email_unique' 
        AND table_name = 'library_users'
    ) THEN
        ALTER TABLE public.library_users ADD CONSTRAINT library_users_email_unique UNIQUE (email);
    END IF;
END $$;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_library_users_email ON library_users(email);
CREATE INDEX IF NOT EXISTS idx_library_users_status ON library_users(status);
CREATE INDEX IF NOT EXISTS idx_library_users_role ON library_users(role);
CREATE INDEX IF NOT EXISTS idx_library_users_user_id ON library_users(user_id);

-- =====================================================
-- STEP 2: ENABLE RLS AND CREATE POLICIES
-- =====================================================

-- Enable RLS on library_users
ALTER TABLE public.library_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.library_users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.library_users;
DROP POLICY IF EXISTS "Allow profile creation" ON public.library_users;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.library_users;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.library_users;

-- Create new RLS policies for library_users
CREATE POLICY "Users can view own profile" ON public.library_users
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.library_users
    FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow profile creation" ON public.library_users
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can insert profiles" ON public.library_users
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can manage all profiles" ON public.library_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.library_users
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );

-- =====================================================
-- STEP 3: CREATE/UPDATE TRIGGER FUNCTIONS
-- =====================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create new trigger function for library_users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.library_users (
    user_id,
    full_name,
    email,
    role,
    status,
    is_active,
    subscription_status
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    'user',
    'pending',
    false,
    'inactive'
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth user creation
    RAISE WARNING 'Failed to create library_users profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- STEP 4: CREATE ADMIN MANAGEMENT FUNCTIONS
-- =====================================================

-- Function to approve a user
CREATE OR REPLACE FUNCTION public.approve_user(target_user_id UUID, admin_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the admin exists and has admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.library_users 
    WHERE user_id = admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can approve users';
  END IF;

  -- Update user status
  UPDATE public.library_users
  SET 
    status = 'verified',
    is_active = true,
    updated_at = NOW()
  WHERE user_id = target_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject a user
CREATE OR REPLACE FUNCTION public.reject_user(target_user_id UUID, reason TEXT, admin_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the admin exists and has admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.library_users 
    WHERE user_id = admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can reject users';
  END IF;

  -- Update user status
  UPDATE public.library_users
  SET 
    status = 'rejected',
    is_active = false,
    updated_at = NOW()
  WHERE user_id = target_user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user profile by auth user ID
CREATE OR REPLACE FUNCTION public.get_user_profile(auth_user_id UUID)
RETURNS TABLE (
  id UUID,
  user_id UUID,
  full_name TEXT,
  email TEXT,
  phone TEXT,
  role TEXT,
  status TEXT,
  is_active BOOLEAN,
  subscription_status TEXT,
  subscription_valid_until DATE,
  qr_code TEXT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    lu.id,
    lu.user_id,
    lu.full_name,
    lu.email,
    lu.phone,
    lu.role,
    lu.status,
    lu.is_active,
    lu.subscription_status,
    lu.subscription_valid_until,
    lu.qr_code,
    lu.created_at,
    lu.updated_at
  FROM public.library_users lu
  WHERE lu.user_id = auth_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 5: CREATE VIEWS FOR ADMIN MANAGEMENT
-- =====================================================

-- Create view for pending users (admin use)
CREATE OR REPLACE VIEW public.pending_users AS
SELECT 
  id,
  user_id,
  full_name,
  email,
  phone,
  status,
  created_at
FROM public.library_users
WHERE status = 'pending'
ORDER BY created_at DESC;

-- Create view for all users (admin use)
CREATE OR REPLACE VIEW public.all_users_admin AS
SELECT 
  id,
  user_id,
  full_name,
  email,
  phone,
  role,
  status,
  is_active,
  subscription_status,
  subscription_valid_until,
  created_at,
  updated_at
FROM public.library_users
ORDER BY created_at DESC;

-- =====================================================
-- STEP 6: GRANT NECESSARY PERMISSIONS
-- =====================================================

-- Grant permissions for the functions
GRANT EXECUTE ON FUNCTION public.approve_user(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_user(UUID, TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_profile(UUID) TO authenticated;

-- Grant permissions for the views
GRANT SELECT ON public.pending_users TO authenticated;
GRANT SELECT ON public.all_users_admin TO authenticated;

-- =====================================================
-- STEP 7: UPDATE EXISTING DATA (IF ANY)
-- =====================================================

-- Update existing records with default values for new columns
-- Populate full_name from existing name column and set defaults
UPDATE public.library_users 
SET 
  full_name = COALESCE(full_name, name),
  email = COALESCE(email, name || '@library.local'),
  role = COALESCE(role, 'user'),
  status = COALESCE(status, 'verified'),
  is_active = COALESCE(is_active, true),
  subscription_status = COALESCE(subscription_status, 
    CASE 
      WHEN subscription_valid_until IS NOT NULL AND subscription_valid_until > CURRENT_DATE 
      THEN 'active' 
      ELSE 'inactive' 
    END
  )
WHERE full_name IS NULL OR email IS NULL OR role IS NULL OR status IS NULL OR is_active IS NULL OR subscription_status IS NULL;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check that all fields were added
SELECT 'Checking library_users table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'library_users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check RLS policies
SELECT 'Checking RLS policies:' as info;
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'library_users';

-- Check functions
SELECT 'Checking functions:' as info;
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
AND routine_name IN ('handle_new_user', 'approve_user', 'reject_user', 'get_user_profile');

-- Check triggers
SELECT 'Checking triggers:' as info;
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';

-- Check views
SELECT 'Checking views:' as info;
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public' 
AND table_name IN ('pending_users', 'all_users_admin');

SELECT 'Authentication system fix completed successfully!' as result;