-- Complete Library System Implementation (Final Fixed Version)
-- Execute this SQL in Supabase SQL Editor to add missing library system components
-- This version resolves foreign key constraint issues with auth.users

-- =====================================================
-- 0. DROP CONFLICTING FUNCTIONS FIRST
-- =====================================================

-- Drop existing log_scan function that has different signature
DROP FUNCTION IF EXISTS log_scan(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS log_scan(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS log_scan;

-- =====================================================
-- 1. CREATE MISSING TABLES (WITHOUT AUTH CONSTRAINTS)
-- =====================================================

-- Create library_users table (standalone, no auth.users FK)
CREATE TABLE IF NOT EXISTS public.library_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- Reference to auth user but not enforced as FK
  full_name TEXT NOT NULL,
  subscription_valid_until DATE,
  qr_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin_meta table (standalone, no auth.users FK)
CREATE TABLE IF NOT EXISTS public.admin_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- Reference to auth user but not enforced as FK
  full_name TEXT NOT NULL,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_library_users_qr_code ON library_users(qr_code);
CREATE INDEX IF NOT EXISTS idx_library_users_user_id ON library_users(user_id);
CREATE INDEX IF NOT EXISTS idx_library_users_subscription ON library_users(subscription_valid_until);
CREATE INDEX IF NOT EXISTS idx_admin_meta_user_id ON admin_meta(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_meta_last_login ON admin_meta(last_login);

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE library_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_meta ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. CREATE RLS POLICIES
-- =====================================================

-- RLS Policies for library_users
-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.library_users
FOR SELECT
USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.library_users
FOR UPDATE
USING (auth.uid() = user_id);

-- Admins can view all library users
CREATE POLICY "Admins can view all library users"
ON public.library_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_meta
    WHERE user_id = auth.uid()
  )
);

-- Admins can update all library users
CREATE POLICY "Admins can update all library users"
ON public.library_users
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_meta
    WHERE user_id = auth.uid()
  )
);

-- Allow profile creation during signup
CREATE POLICY "Allow library user creation"
ON public.library_users
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- RLS Policies for admin_meta
-- Admins can view their own metadata
CREATE POLICY "Admins can view own metadata"
ON public.admin_meta
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can update their own metadata
CREATE POLICY "Admins can update own metadata"
ON public.admin_meta
FOR UPDATE
USING (auth.uid() = user_id);

-- Allow admin creation
CREATE POLICY "Allow admin creation"
ON public.admin_meta
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- =====================================================
-- 5. CREATE UTILITY FUNCTIONS
-- =====================================================

-- Function to create library user profile
CREATE OR REPLACE FUNCTION create_library_user(
  user_id_param UUID,
  full_name_param TEXT,
  subscription_valid_until_param DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_qr_code TEXT;
  result_id UUID;
BEGIN
  -- Generate unique QR code
  new_qr_code := encode(digest(user_id_param::text || extract(epoch from now())::text || random()::text, 'sha256'), 'hex');
  
  -- Insert library user
  INSERT INTO library_users (user_id, full_name, subscription_valid_until, qr_code)
  VALUES (user_id_param, full_name_param, subscription_valid_until_param, new_qr_code)
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    subscription_valid_until = EXCLUDED.subscription_valid_until,
    qr_code = COALESCE(library_users.qr_code, EXCLUDED.qr_code),
    updated_at = NOW()
  RETURNING id INTO result_id;
  
  RETURN result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log scan (entry/exit) - NEW SIGNATURE
CREATE OR REPLACE FUNCTION log_scan_library(
  qr_code_param TEXT,
  scan_type_param TEXT,
  scanned_by_param TEXT DEFAULT 'admin_panel',
  location_param TEXT DEFAULT 'main_entrance'
)
RETURNS JSONB AS $$
DECLARE
  user_record RECORD;
  scan_id UUID;
  result JSONB;
BEGIN
  -- Find user by QR code
  SELECT lu.id, lu.user_id, lu.full_name, lu.subscription_valid_until
  INTO user_record
  FROM library_users lu
  WHERE lu.qr_code = qr_code_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid QR code',
      'user_id', null
    );
  END IF;
  
  -- Check subscription validity
  IF user_record.subscription_valid_until IS NULL OR user_record.subscription_valid_until < CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Subscription expired or inactive',
      'user_id', user_record.user_id,
      'user_name', user_record.full_name
    );
  END IF;
  
  -- Log the scan
  INSERT INTO scan_logs (user_id, scan_type, scanned_by, location)
  VALUES (user_record.user_id, scan_type_param, scanned_by_param, location_param)
  RETURNING id INTO scan_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'scan_id', scan_id,
    'user_id', user_record.user_id,
    'user_name', user_record.full_name,
    'scan_type', scan_type_param,
    'scan_time', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update admin last login
CREATE OR REPLACE FUNCTION update_admin_last_login(
  admin_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE admin_meta
  SET last_login = NOW(), updated_at = NOW()
  WHERE user_id = admin_user_id;
  
  IF NOT FOUND THEN
    -- Create admin record if it doesn't exist
    INSERT INTO admin_meta (user_id, full_name, last_login)
    VALUES (admin_user_id, 'Admin User', NOW())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user scan history
CREATE OR REPLACE FUNCTION get_user_scan_history(
  user_id_param UUID,
  limit_param INTEGER DEFAULT 50
)
RETURNS TABLE(
  scan_id UUID,
  scan_time TIMESTAMPTZ,
  scan_type TEXT,
  location TEXT,
  scanned_by TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT sl.id, sl.scan_time, sl.scan_type, sl.location, sl.scanned_by
  FROM scan_logs sl
  WHERE sl.user_id = user_id_param
  ORDER BY sl.scan_time DESC
  LIMIT limit_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create admin user
CREATE OR REPLACE FUNCTION create_admin_user(
  admin_user_id UUID,
  admin_full_name TEXT
)
RETURNS UUID AS $$
DECLARE
  result_id UUID;
BEGIN
  INSERT INTO admin_meta (user_id, full_name, last_login)
  VALUES (admin_user_id, admin_full_name, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    last_login = NOW(),
    updated_at = NOW()
  RETURNING id INTO result_id;
  
  RETURN result_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- 6. GRANT PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE library_users TO anon, authenticated;
GRANT ALL ON TABLE admin_meta TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_library_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_scan_library TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_scan_history TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_admin_last_login TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_admin_user TO anon, authenticated;

-- =====================================================
-- 7. ENABLE REALTIME
-- =====================================================

ALTER PUBLICATION supabase_realtime ADD TABLE library_users;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_meta;

-- =====================================================
-- 8. CREATE VIEWS
-- =====================================================

-- Create view for easy data access
CREATE OR REPLACE VIEW library_user_stats AS
SELECT 
  lu.id,
  lu.user_id,
  lu.full_name,
  lu.subscription_valid_until,
  lu.created_at as user_created_at,
  CASE 
    WHEN lu.subscription_valid_until IS NULL THEN 'inactive'
    WHEN lu.subscription_valid_until < CURRENT_DATE THEN 'expired'
    ELSE 'active'
  END as subscription_status
FROM library_users lu;

-- =====================================================
-- 9. ADD COMMENTS
-- =====================================================

COMMENT ON TABLE library_users IS 'Library user profiles with QR codes for access control';
COMMENT ON TABLE admin_meta IS 'Admin metadata for library management system';
COMMENT ON FUNCTION log_scan_library IS 'Main function for logging QR code scans with validation';
COMMENT ON FUNCTION create_library_user IS 'Function to create library user profiles with QR codes';
COMMENT ON FUNCTION update_admin_last_login IS 'Function to track admin login activity';
COMMENT ON FUNCTION create_admin_user IS 'Function to create admin user profiles';

-- =====================================================
-- 10. INSERT SAMPLE DATA FOR TESTING
-- =====================================================

-- Create a sample library user for testing
INSERT INTO library_users (user_id, full_name, subscription_valid_until, qr_code)
VALUES (
  gen_random_uuid(),
  'Test Library User',
  CURRENT_DATE + INTERVAL '30 days',
  encode(digest('test_user_' || extract(epoch from now())::text, 'sha256'), 'hex')
) ON CONFLICT DO NOTHING;

-- Create a sample admin for testing
INSERT INTO admin_meta (user_id, full_name, last_login)
VALUES (
  gen_random_uuid(),
  'Test Admin User',
  NOW()
) ON CONFLICT DO NOTHING;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

SELECT 'Library system implementation completed successfully! Tables created without auth.users constraints. Use log_scan_library() function for QR code scanning.' as result;