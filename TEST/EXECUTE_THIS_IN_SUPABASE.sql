-- =====================================================
-- COMPLETE LIBRARY SYSTEM SETUP - AUTO GENERATED
-- Execute this in Supabase SQL Editor
-- =====================================================

-- Drop existing functions to avoid conflicts
DROP FUNCTION IF EXISTS create_library_user(UUID, TEXT, DATE);
DROP FUNCTION IF EXISTS log_scan_library(UUID, TEXT);
DROP FUNCTION IF EXISTS create_admin_user(UUID, TEXT);
DROP FUNCTION IF EXISTS get_user_scan_history(UUID);
DROP FUNCTION IF EXISTS get_user_scan_history(UUID, INTEGER);
DROP FUNCTION IF EXISTS update_admin_last_login(UUID);

-- =====================================================
-- 1. CREATE TABLES
-- =====================================================

-- Library Users Table
-- Drop any existing foreign key constraints that might conflict
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'library_users_id_fkey' 
    AND table_name = 'library_users'
  ) THEN
    ALTER TABLE library_users DROP CONSTRAINT library_users_id_fkey;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS library_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  subscription_valid_until DATE,
  qr_code TEXT UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Admin Meta Table
-- Drop any existing foreign key constraints that might conflict
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'admin_meta_id_fkey' 
    AND table_name = 'admin_meta'
  ) THEN
    ALTER TABLE admin_meta DROP CONSTRAINT admin_meta_id_fkey;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS admin_meta (
  user_id UUID PRIMARY KEY,
  full_name TEXT NOT NULL,
  last_login TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure user_id column exists (in case table was created with different schema)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'admin_meta' AND column_name = 'user_id'
  ) THEN
    -- If user_id doesn't exist, check if there's an 'id' column to rename
    IF EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'admin_meta' AND column_name = 'id'
    ) THEN
      ALTER TABLE admin_meta RENAME COLUMN id TO user_id;
    ELSE
      ALTER TABLE admin_meta ADD COLUMN user_id UUID PRIMARY KEY;
    END IF;
  END IF;
END $$;

-- Scan Logs Table
CREATE TABLE IF NOT EXISTS scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES library_users(id) ON DELETE CASCADE,
  scan_type TEXT NOT NULL CHECK (scan_type IN ('entry', 'exit')),
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  scanned_by UUID REFERENCES admin_meta(user_id) ON DELETE SET NULL
);

-- Ensure scanned_at column exists (in case table was created earlier without it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'scan_logs' AND column_name = 'scanned_at'
  ) THEN
    ALTER TABLE scan_logs ADD COLUMN scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
  END IF;
END $$;

-- =====================================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_library_users_qr_code ON library_users(qr_code);
CREATE INDEX IF NOT EXISTS idx_scan_logs_user_id ON scan_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scanned_at ON scan_logs(scanned_at);
CREATE INDEX IF NOT EXISTS idx_library_users_subscription ON library_users(subscription_valid_until);

-- =====================================================
-- 3. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE library_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_meta ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 4. CREATE RLS POLICIES
-- =====================================================

-- Library Users Policies
DROP POLICY IF EXISTS "Allow public read access to library_users" ON library_users;
CREATE POLICY "Allow public read access to library_users" ON library_users
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow public insert to library_users" ON library_users;
CREATE POLICY "Allow public insert to library_users" ON library_users
  FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update to library_users" ON library_users;
CREATE POLICY "Allow public update to library_users" ON library_users
  FOR UPDATE USING (true);

-- Admin Meta Policies
DROP POLICY IF EXISTS "Allow public access to admin_meta" ON admin_meta;
CREATE POLICY "Allow public access to admin_meta" ON admin_meta
  FOR ALL USING (true);

-- Scan Logs Policies
DROP POLICY IF EXISTS "Allow public access to scan_logs" ON scan_logs;
CREATE POLICY "Allow public access to scan_logs" ON scan_logs
  FOR ALL USING (true);

-- =====================================================
-- 5. CREATE LIBRARY USER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION create_library_user(
  p_user_id UUID,
  p_full_name TEXT,
  p_subscription_valid_until DATE DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_qr_code TEXT;
  v_result JSON;
BEGIN
  -- Generate QR code
  v_qr_code := encode(digest(p_user_id::text || p_full_name || extract(epoch from now())::text, 'sha256'), 'hex');
  
  -- Insert user
  INSERT INTO library_users (id, full_name, subscription_valid_until, qr_code)
  VALUES (p_user_id, p_full_name, p_subscription_valid_until, v_qr_code)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    subscription_valid_until = EXCLUDED.subscription_valid_until,
    qr_code = EXCLUDED.qr_code,
    updated_at = NOW();
  
  -- Return result
  SELECT json_build_object(
    'success', true,
    'user_id', p_user_id,
    'qr_code', v_qr_code,
    'message', 'Library user created successfully'
  ) INTO v_result;
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to create library user'
    );
END;
$$;

-- =====================================================
-- 6. CREATE SCAN LOGGING FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION log_scan_library(
  p_user_id UUID,
  p_scan_type TEXT,
  p_scanned_by UUID DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_exists BOOLEAN;
  v_scan_id UUID;
  v_timestamp TIMESTAMP WITH TIME ZONE;
  v_result JSON;
BEGIN
  -- Check if user exists
  SELECT EXISTS(SELECT 1 FROM library_users WHERE id = p_user_id) INTO v_user_exists;
  
  IF NOT v_user_exists THEN
    RETURN json_build_object(
      'success', false,
      'error', 'User not found',
      'message', 'Library user does not exist'
    );
  END IF;
  
  -- Validate scan type
  IF p_scan_type NOT IN ('entry', 'exit') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Invalid scan type',
      'message', 'Scan type must be either entry or exit'
    );
  END IF;
  
  -- Before (Broken)
    -- INSERT INTO scan_logs (user_id, scan_type, scanned_by)
    -- VALUES (p_user_id, p_scan_type, p_scanned_by);
    -- Return with NOW() caused the error
    
    -- After (Fixed)
    INSERT INTO scan_logs (user_id, scan_type, scanned_by)
    VALUES (p_user_id, p_scan_type, p_scanned_by)
    RETURNING id, scanned_at INTO v_scan_id, v_timestamp;
    -- Now properly captures the actual database timestamp
  
  -- Return success
  SELECT json_build_object(
    'success', true,
    'scan_id', v_scan_id,
    'user_id', p_user_id,
    'scan_type', p_scan_type,
    'scanned_at', v_timestamp,
    'message', 'Scan logged successfully'
  ) INTO v_result;
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to log scan'
    );
END;
$$;

-- =====================================================
-- 7. CREATE ADMIN USER FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION create_admin_user(
  p_user_id UUID,
  p_full_name TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  -- Insert admin user
  INSERT INTO admin_meta (user_id, full_name, last_login)
  VALUES (p_user_id, p_full_name, NOW())
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    last_login = NOW();
  
  -- Return result
  SELECT json_build_object(
    'success', true,
    'user_id', p_user_id,
    'full_name', p_full_name,
    'message', 'Admin user created successfully'
  ) INTO v_result;
  
  RETURN v_result;
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to create admin user'
    );
END;
$$;

-- =====================================================
-- 8. CREATE USER SCAN HISTORY FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION get_user_scan_history(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', sl.id,
      'scan_type', sl.scan_type,
      'scanned_at', sl.scanned_at,
      'scanned_by', am.full_name
    ) ORDER BY sl.scanned_at DESC
  )
  FROM scan_logs sl
  LEFT JOIN admin_meta am ON sl.scanned_by = am.user_id
  WHERE sl.user_id = p_user_id
  LIMIT p_limit
  INTO v_result;
  
  RETURN COALESCE(v_result, '[]'::json);
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM,
      'message', 'Failed to get scan history'
    );
END;
$$;

-- =====================================================
-- 9. CREATE ADMIN LOGIN UPDATE FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION update_admin_last_login(
  p_user_id UUID
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE admin_meta 
  SET last_login = NOW() 
  WHERE user_id = p_user_id;
  
  RETURN json_build_object(
    'success', true,
    'message', 'Admin last login updated'
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$;

-- =====================================================
-- 10. CREATE VIEWS
-- =====================================================

CREATE OR REPLACE VIEW library_user_stats AS
SELECT 
  lu.id,
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
-- 11. INSERT SAMPLE DATA
-- =====================================================

DO $$
DECLARE
  test_user_id UUID := gen_random_uuid();
  test_qr_code TEXT;
BEGIN
  test_qr_code := encode(digest('test_user_' || extract(epoch from now())::text, 'sha256'), 'hex');
  
  INSERT INTO library_users (id, full_name, subscription_valid_until, qr_code)
  VALUES (
    test_user_id,
    'Test Library User',
    CURRENT_DATE + INTERVAL '30 days',
    test_qr_code
  ) ON CONFLICT (id) DO NOTHING;
END $$;

DO $$
DECLARE
  test_admin_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO admin_meta (user_id, full_name, last_login)
  VALUES (
    test_admin_id,
    'Test Admin User',
    NOW()
  ) ON CONFLICT (user_id) DO NOTHING;
END $$;

-- =====================================================
-- 12. FINAL SUCCESS MESSAGE
-- =====================================================

SELECT 'Library system setup completed successfully! All functions and tables are ready.' as setup_result;

-- Test the functions (optional - run these after the main setup)
-- SELECT create_library_user('550e8400-e29b-41d4-a716-446655440000'::uuid, 'John Doe', '2024-12-31'::date);
-- SELECT create_admin_user('550e8400-e29b-41d4-a716-446655440001'::uuid, 'Admin User');
-- SELECT log_scan_library('550e8400-e29b-41d4-a716-446655440000'::uuid, 'entry', '550e8400-e29b-41d4-a716-446655440001'::uuid);
