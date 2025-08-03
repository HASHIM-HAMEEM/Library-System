-- Library Management System Migration
-- Implements the crossDev requirements for library_users, scan_logs, and admin_meta tables
-- This migration creates the simplified schema for cross-platform integration

-- Create library_users table as specified in crossDev
CREATE TABLE IF NOT EXISTS public.library_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  subscription_valid_until DATE,
  qr_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create scan_logs table for entry/exit tracking
CREATE TABLE IF NOT EXISTS public.scan_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES library_users(id) ON DELETE CASCADE,
  scan_time TIMESTAMPTZ DEFAULT NOW(),
  scan_type TEXT CHECK (scan_type IN ('entry', 'exit')) NOT NULL,
  scanned_by TEXT DEFAULT 'admin_panel',
  location TEXT DEFAULT 'main_entrance',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create admin_meta table for admin metadata
CREATE TABLE IF NOT EXISTS public.admin_meta (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_library_users_qr_code ON library_users(qr_code);
CREATE INDEX IF NOT EXISTS idx_library_users_subscription ON library_users(subscription_valid_until);
CREATE INDEX IF NOT EXISTS idx_scan_logs_user_id ON scan_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scan_time ON scan_logs(scan_time);
CREATE INDEX IF NOT EXISTS idx_scan_logs_scan_type ON scan_logs(scan_type);
CREATE INDEX IF NOT EXISTS idx_admin_meta_last_login ON admin_meta(last_login);

-- Enable Row Level Security (RLS)
ALTER TABLE library_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_meta ENABLE ROW LEVEL SECURITY;

-- RLS Policies for library_users
-- Users can view their own profile
CREATE POLICY "Users can view their own profile"
ON public.library_users
FOR SELECT
USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
ON public.library_users
FOR UPDATE
USING (auth.uid() = id);

-- Admins can view all library users
CREATE POLICY "Admins can view all library users"
ON public.library_users
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_meta
    WHERE id = auth.uid()
  )
);

-- Admins can update all library users
CREATE POLICY "Admins can update all library users"
ON public.library_users
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_meta
    WHERE id = auth.uid()
  )
);

-- Allow profile creation during signup
CREATE POLICY "Allow library user creation"
ON public.library_users
FOR INSERT
WITH CHECK (auth.uid() = id);

-- RLS Policies for scan_logs
-- Users can see their own scan logs
CREATE POLICY "User sees own scan logs"
ON public.scan_logs
FOR SELECT
USING (auth.uid() = user_id);

-- Admins can view all scan logs
CREATE POLICY "Admins can view all scan logs"
ON public.scan_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM admin_meta
    WHERE id = auth.uid()
  )
);

-- Admins can insert scan logs
CREATE POLICY "Admins can insert scan logs"
ON public.scan_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM admin_meta
    WHERE id = auth.uid()
  )
);

-- Admins can update scan logs
CREATE POLICY "Admins can update scan logs"
ON public.scan_logs
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM admin_meta
    WHERE id = auth.uid()
  )
);

-- RLS Policies for admin_meta
-- Admins can view their own metadata
CREATE POLICY "Admins can view own metadata"
ON public.admin_meta
FOR SELECT
USING (auth.uid() = id);

-- Admins can update their own metadata
CREATE POLICY "Admins can update own metadata"
ON public.admin_meta
FOR UPDATE
USING (auth.uid() = id);

-- Super admins can view all admin metadata
CREATE POLICY "Super admins can view all admin metadata"
ON public.admin_meta
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM auth.users
    WHERE id = auth.uid() AND raw_app_meta_data->>'role' = 'super_admin'
  )
);

-- Create RPC functions for smooth SDK integration

-- Function to create library user profile
CREATE OR REPLACE FUNCTION create_library_user(
  user_id UUID,
  full_name TEXT,
  subscription_valid_until DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_qr_code TEXT;
BEGIN
  -- Generate unique QR code
  new_qr_code := encode(digest(user_id::text || extract(epoch from now())::text || random()::text, 'sha256'), 'hex');
  
  -- Insert library user
  INSERT INTO library_users (id, full_name, subscription_valid_until, qr_code)
  VALUES (user_id, full_name, subscription_valid_until, new_qr_code)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    subscription_valid_until = EXCLUDED.subscription_valid_until,
    qr_code = COALESCE(library_users.qr_code, EXCLUDED.qr_code);
  
  RETURN user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log scan (entry/exit)
CREATE OR REPLACE FUNCTION log_scan(
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
  SELECT lu.id, lu.full_name, lu.subscription_valid_until
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
      'user_id', user_record.id,
      'user_name', user_record.full_name
    );
  END IF;
  
  -- Log the scan
  INSERT INTO scan_logs (user_id, scan_type, scanned_by, location)
  VALUES (user_record.id, scan_type_param, scanned_by_param, location_param)
  RETURNING id INTO scan_id;
  
  RETURN jsonb_build_object(
    'success', true,
    'scan_id', scan_id,
    'user_id', user_record.id,
    'user_name', user_record.full_name,
    'scan_type', scan_type_param,
    'scan_time', NOW()
  );
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

-- Function to get scan analytics
CREATE OR REPLACE FUNCTION get_scan_analytics(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '30 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE(
  total_scans BIGINT,
  unique_users BIGINT,
  entry_scans BIGINT,
  exit_scans BIGINT,
  daily_stats JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_scans,
    COUNT(DISTINCT sl.user_id)::BIGINT as unique_users,
    COUNT(*) FILTER (WHERE sl.scan_type = 'entry')::BIGINT as entry_scans,
    COUNT(*) FILTER (WHERE sl.scan_type = 'exit')::BIGINT as exit_scans,
    '{}'::JSONB as daily_stats
  FROM scan_logs sl
  WHERE DATE(sl.scan_time) BETWEEN start_date AND end_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update admin last login
CREATE OR REPLACE FUNCTION update_admin_last_login(
  admin_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE admin_meta
  SET last_login = NOW(), updated_at = NOW()
  WHERE id = admin_id;
  
  IF NOT FOUND THEN
    INSERT INTO admin_meta (id, full_name, last_login)
    SELECT admin_id, COALESCE(au.raw_user_meta_data->>'name', au.email), NOW()
    FROM auth.users au
    WHERE au.id = admin_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically create library user profile on auth user creation
CREATE OR REPLACE FUNCTION handle_new_library_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Only create library user profile for non-admin users
  IF NEW.raw_app_meta_data->>'role' != 'admin' THEN
    PERFORM create_library_user(
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      NULL
    );
  ELSE
    -- Create admin metadata for admin users
    INSERT INTO admin_meta (id, full_name, last_login)
    VALUES (
      NEW.id,
      COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
      NOW()
    ) ON CONFLICT (id) DO NOTHING;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created_library ON auth.users;
CREATE TRIGGER on_auth_user_created_library
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_library_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE library_users TO anon, authenticated;
GRANT ALL ON TABLE scan_logs TO anon, authenticated;
GRANT ALL ON TABLE admin_meta TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_library_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_scan TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_scan_history TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_scan_analytics TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_admin_last_login TO anon, authenticated;

-- Enable realtime for live updates
ALTER PUBLICATION supabase_realtime ADD TABLE library_users;
ALTER PUBLICATION supabase_realtime ADD TABLE scan_logs;
ALTER PUBLICATION supabase_realtime ADD TABLE admin_meta;

-- View definition moved below to avoid scan_time reference issues

-- Create view for easy data access (simplified to avoid scan_time reference issues)
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

COMMENT ON TABLE library_users IS 'Simplified user metadata for cross-platform library management';
COMMENT ON TABLE scan_logs IS 'Entry/exit tracking for library access';
COMMENT ON TABLE admin_meta IS 'Admin metadata for library management system';
COMMENT ON FUNCTION log_scan IS 'Main function for logging QR code scans with validation';
COMMENT ON FUNCTION get_scan_analytics IS 'Analytics function for scan data reporting';