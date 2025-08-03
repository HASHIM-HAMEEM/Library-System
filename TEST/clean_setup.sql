DROP FUNCTION IF EXISTS log_scan(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS log_scan(TEXT, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS log_scan;
DROP FUNCTION IF EXISTS create_library_user(uuid,text,date);
DROP FUNCTION IF EXISTS log_scan_library(text,text,text,text);
DROP FUNCTION IF EXISTS log_scan_library(UUID, TEXT);
DROP FUNCTION IF EXISTS log_scan_library(UUID, TEXT, UUID);
DROP FUNCTION IF EXISTS log_scan_library(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS log_scan_library;
DROP FUNCTION IF EXISTS update_admin_last_login(uuid);
DROP FUNCTION IF EXISTS get_user_scan_history(uuid,integer);
DROP FUNCTION IF EXISTS create_admin_user(uuid,text);

CREATE TABLE IF NOT EXISTS public.admin_meta (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  full_name TEXT NOT NULL,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_library_users_qr_code ON library_users(qr_code);
CREATE INDEX IF NOT EXISTS idx_library_users_subscription ON library_users(subscription_valid_until);
CREATE INDEX IF NOT EXISTS idx_admin_meta_user_id ON admin_meta(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_meta_last_login ON admin_meta(last_login);

ALTER TABLE library_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_meta ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own profile" ON library_users;
DROP POLICY IF EXISTS "Users can update their own profile" ON library_users;
DROP POLICY IF EXISTS "Admins can view all library users" ON library_users;
DROP POLICY IF EXISTS "Admins can update all library users" ON library_users;
DROP POLICY IF EXISTS "Allow library user creation" ON library_users;
DROP POLICY IF EXISTS "Admins can view own metadata" ON admin_meta;
DROP POLICY IF EXISTS "Admins can update own metadata" ON admin_meta;
DROP POLICY IF EXISTS "Allow admin creation" ON admin_meta;

CREATE POLICY "Allow authenticated read library_users"
ON public.library_users
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated write library_users"
ON public.library_users
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "Allow authenticated read admin_meta"
ON public.admin_meta
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Allow authenticated write admin_meta"
ON public.admin_meta
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

CREATE OR REPLACE FUNCTION create_library_user(
  user_id_param UUID,
  full_name_param TEXT,
  subscription_valid_until_param DATE DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  new_qr_code TEXT;
BEGIN
  new_qr_code := encode(digest(user_id_param::text || extract(epoch from now())::text || random()::text, 'sha256'), 'hex');
  
  INSERT INTO library_users (id, full_name, subscription_valid_until, qr_code)
  VALUES (user_id_param, full_name_param, subscription_valid_until_param, new_qr_code)
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    subscription_valid_until = EXCLUDED.subscription_valid_until,
    qr_code = COALESCE(library_users.qr_code, EXCLUDED.qr_code);
  
  RETURN user_id_param;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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
BEGIN
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
  
  IF user_record.subscription_valid_until IS NULL OR user_record.subscription_valid_until < CURRENT_DATE THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Subscription expired or inactive',
      'user_id', user_record.id,
      'user_name', user_record.full_name
    );
  END IF;
  
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

CREATE OR REPLACE FUNCTION update_admin_last_login(
  admin_user_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE admin_meta
  SET last_login = NOW(), updated_at = NOW()
  WHERE user_id = admin_user_id;
  
  IF NOT FOUND THEN
    INSERT INTO admin_meta (user_id, full_name, last_login)
    VALUES (admin_user_id, 'Admin User', NOW())
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

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

GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE library_users TO anon, authenticated;
GRANT ALL ON TABLE admin_meta TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_library_user TO anon, authenticated;
GRANT EXECUTE ON FUNCTION log_scan_library TO anon, authenticated;
GRANT EXECUTE ON FUNCTION get_user_scan_history TO anon, authenticated;
GRANT EXECUTE ON FUNCTION update_admin_last_login TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_admin_user TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'library_users'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE library_users;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'admin_meta'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE admin_meta;
  END IF;
END $$;

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

COMMENT ON TABLE library_users IS 'Library user profiles with QR codes for access control';
COMMENT ON TABLE admin_meta IS 'Admin metadata for library management system';
COMMENT ON FUNCTION log_scan_library IS 'Main function for logging QR code scans with validation';
COMMENT ON FUNCTION create_library_user IS 'Function to create library user profiles with QR codes';
COMMENT ON FUNCTION update_admin_last_login IS 'Function to track admin login activity';
COMMENT ON FUNCTION create_admin_user IS 'Function to create admin user profiles';

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

SELECT 'Library system implementation completed successfully! Tables corrected to work with existing structure. Use log_scan_library() function for QR code scanning.' as result;