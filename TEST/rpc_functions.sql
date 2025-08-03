-- RPC Functions for Smooth SDK Integration
-- These functions provide clean interfaces for Flutter app and Web Admin
-- As specified in crossDev: "Use Supabase SDKs and RPC for smoother logic bridging"

-- Function for Flutter app: Get user's own QR code and profile
CREATE OR REPLACE FUNCTION get_my_library_profile()
RETURNS JSONB AS $$
DECLARE
  user_data RECORD;
  result JSONB;
BEGIN
  -- Get current user's library profile
  SELECT 
    lu.id,
    lu.full_name,
    lu.subscription_valid_until,
    lu.qr_code,
    lu.created_at,
    CASE 
      WHEN lu.subscription_valid_until IS NULL THEN 'inactive'
      WHEN lu.subscription_valid_until < CURRENT_DATE THEN 'expired'
      ELSE 'active'
    END as subscription_status
  INTO user_data
  FROM library_users lu
  WHERE lu.id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User profile not found'
    );
  END IF;
  
  result := jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', user_data.id,
      'fullName', user_data.full_name,
      'subscriptionValidUntil', user_data.subscription_valid_until,
      'qrCode', user_data.qr_code,
      'subscriptionStatus', user_data.subscription_status,
      'createdAt', user_data.created_at
    )
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for Flutter app: Get user's scan history
CREATE OR REPLACE FUNCTION get_my_scan_history(
  limit_param INTEGER DEFAULT 20,
  offset_param INTEGER DEFAULT 0
)
RETURNS JSONB AS $$
DECLARE
  scan_records RECORD;
  scans_array JSONB := '[]'::JSONB;
  total_count INTEGER;
BEGIN
  -- Get total count
  SELECT COUNT(*) INTO total_count
  FROM scan_logs sl
  WHERE sl.user_id = auth.uid();
  
  -- Get scan records
  FOR scan_records IN
    SELECT 
      sl.id,
      sl.scan_time,
      sl.scan_type,
      sl.location,
      sl.scanned_by
    FROM scan_logs sl
    WHERE sl.user_id = auth.uid()
    ORDER BY sl.scan_time DESC
    LIMIT limit_param OFFSET offset_param
  LOOP
    scans_array := scans_array || jsonb_build_object(
      'id', scan_records.id,
      'scanTime', scan_records.scan_time,
      'scanType', scan_records.scan_type,
      'location', scan_records.location,
      'scannedBy', scan_records.scanned_by
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'scans', scans_array,
    'totalCount', total_count,
    'hasMore', (offset_param + limit_param) < total_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for Web Admin: Scan QR code and log entry/exit
CREATE OR REPLACE FUNCTION admin_scan_qr(
  qr_code_param TEXT,
  scan_type_param TEXT,
  location_param TEXT DEFAULT 'main_entrance'
)
RETURNS JSONB AS $$
DECLARE
  admin_record RECORD;
  user_record RECORD;
  scan_id UUID;
  result JSONB;
BEGIN
  -- Verify admin permissions
  SELECT am.id, am.full_name
  INTO admin_record
  FROM admin_meta am
  WHERE am.id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;
  
  -- Find user by QR code
  SELECT lu.id, lu.full_name, lu.subscription_valid_until
  INTO user_record
  FROM library_users lu
  WHERE lu.qr_code = qr_code_param;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Invalid QR code',
      'scannedBy', admin_record.full_name
    );
  END IF;
  
  -- Check subscription validity
  IF user_record.subscription_valid_until IS NULL OR user_record.subscription_valid_until < CURRENT_DATE THEN
    -- Still log the scan attempt for audit purposes
    INSERT INTO scan_logs (user_id, scan_type, scanned_by, location, notes)
    VALUES (user_record.id, scan_type_param, admin_record.full_name, location_param, 'Subscription expired - access denied')
    RETURNING id INTO scan_id;
    
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Subscription expired or inactive',
      'user', jsonb_build_object(
        'id', user_record.id,
        'fullName', user_record.full_name,
        'subscriptionValidUntil', user_record.subscription_valid_until
      ),
      'scannedBy', admin_record.full_name,
      'scanId', scan_id
    );
  END IF;
  
  -- Log successful scan
  INSERT INTO scan_logs (user_id, scan_type, scanned_by, location)
  VALUES (user_record.id, scan_type_param, admin_record.full_name, location_param)
  RETURNING id INTO scan_id;
  
  -- Update admin last login
  UPDATE admin_meta
  SET last_login = NOW(), updated_at = NOW()
  WHERE id = admin_record.id;
  
  RETURN jsonb_build_object(
    'success', true,
    'scanId', scan_id,
    'user', jsonb_build_object(
      'id', user_record.id,
      'fullName', user_record.full_name,
      'subscriptionValidUntil', user_record.subscription_valid_until
    ),
    'scanType', scan_type_param,
    'location', location_param,
    'scannedBy', admin_record.full_name,
    'scanTime', NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for Web Admin: Get all library users with stats
CREATE OR REPLACE FUNCTION admin_get_library_users(
  limit_param INTEGER DEFAULT 50,
  offset_param INTEGER DEFAULT 0,
  search_param TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  admin_record RECORD;
  user_records RECORD;
  users_array JSONB := '[]'::JSONB;
  total_count INTEGER;
  where_clause TEXT := '';
BEGIN
  -- Verify admin permissions
  SELECT am.id INTO admin_record
  FROM admin_meta am
  WHERE am.id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;
  
  -- Build search clause
  IF search_param IS NOT NULL AND search_param != '' THEN
    where_clause := ' AND (lu.full_name ILIKE ''%' || search_param || '%'' OR lu.qr_code ILIKE ''%' || search_param || '%'')';
  END IF;
  
  -- Get total count
  EXECUTE 'SELECT COUNT(*) FROM library_users lu WHERE 1=1' || where_clause INTO total_count;
  
  -- Get user records with stats
  FOR user_records IN
    EXECUTE 'SELECT 
      lu.id,
      lu.full_name,
      lu.subscription_valid_until,
      lu.created_at,
      COUNT(sl.id) as total_scans,
      COUNT(sl.id) FILTER (WHERE sl.scan_type = ''entry'') as total_entries,
      COUNT(sl.id) FILTER (WHERE sl.scan_type = ''exit'') as total_exits,
      MAX(sl.scan_time) as last_scan_time,
      CASE 
        WHEN lu.subscription_valid_until IS NULL THEN ''inactive''
        WHEN lu.subscription_valid_until < CURRENT_DATE THEN ''expired''
        ELSE ''active''
      END as subscription_status
    FROM library_users lu
    LEFT JOIN scan_logs sl ON lu.id = sl.user_id
    WHERE 1=1' || where_clause || '
    GROUP BY lu.id, lu.full_name, lu.subscription_valid_until, lu.created_at
    ORDER BY lu.created_at DESC
    LIMIT ' || limit_param || ' OFFSET ' || offset_param
  LOOP
    users_array := users_array || jsonb_build_object(
      'id', user_records.id,
      'fullName', user_records.full_name,
      'subscriptionValidUntil', user_records.subscription_valid_until,
      'subscriptionStatus', user_records.subscription_status,
      'createdAt', user_records.created_at,
      'stats', jsonb_build_object(
        'totalScans', user_records.total_scans,
        'totalEntries', user_records.total_entries,
        'totalExits', user_records.total_exits,
        'lastScanTime', user_records.last_scan_time
      )
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'users', users_array,
    'totalCount', total_count,
    'hasMore', (offset_param + limit_param) < total_count
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function for Web Admin: Get scan analytics
CREATE OR REPLACE FUNCTION admin_get_scan_analytics(
  start_date DATE DEFAULT CURRENT_DATE - INTERVAL '7 days',
  end_date DATE DEFAULT CURRENT_DATE
)
RETURNS JSONB AS $$
DECLARE
  admin_record RECORD;
  daily_stats RECORD;
  daily_array JSONB := '[]'::JSONB;
  total_stats RECORD;
BEGIN
  -- Verify admin permissions
  SELECT am.id INTO admin_record
  FROM admin_meta am
  WHERE am.id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;
  
  -- Get total stats for the period
  SELECT 
    COUNT(*) as total_scans,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(*) FILTER (WHERE scan_type = 'entry') as total_entries,
    COUNT(*) FILTER (WHERE scan_type = 'exit') as total_exits
  INTO total_stats
  FROM scan_logs
  WHERE DATE(scan_time) BETWEEN start_date AND end_date;
  
  -- Get daily breakdown
  FOR daily_stats IN
    SELECT 
      DATE(scan_time) as date,
      COUNT(*) as total_scans,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(*) FILTER (WHERE scan_type = 'entry') as entries,
      COUNT(*) FILTER (WHERE scan_type = 'exit') as exits
    FROM scan_logs
    WHERE DATE(scan_time) BETWEEN start_date AND end_date
    GROUP BY DATE(scan_time)
    ORDER BY DATE(scan_time)
  LOOP
    daily_array := daily_array || jsonb_build_object(
      'date', daily_stats.date,
      'totalScans', daily_stats.total_scans,
      'uniqueUsers', daily_stats.unique_users,
      'entries', daily_stats.entries,
      'exits', daily_stats.exits
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'success', true,
    'period', jsonb_build_object(
      'startDate', start_date,
      'endDate', end_date
    ),
    'totals', jsonb_build_object(
      'totalScans', total_stats.total_scans,
      'uniqueUsers', total_stats.unique_users,
      'totalEntries', total_stats.total_entries,
      'totalExits', total_stats.total_exits
    ),
    'dailyStats', daily_array
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to update user subscription (admin only)
CREATE OR REPLACE FUNCTION admin_update_user_subscription(
  user_id_param UUID,
  subscription_valid_until_param DATE
)
RETURNS JSONB AS $$
DECLARE
  admin_record RECORD;
  user_record RECORD;
BEGIN
  -- Verify admin permissions
  SELECT am.id INTO admin_record
  FROM admin_meta am
  WHERE am.id = auth.uid();
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Unauthorized: Admin access required'
    );
  END IF;
  
  -- Update user subscription
  UPDATE library_users
  SET subscription_valid_until = subscription_valid_until_param
  WHERE id = user_id_param
  RETURNING id, full_name, subscription_valid_until INTO user_record;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'user', jsonb_build_object(
      'id', user_record.id,
      'fullName', user_record.full_name,
      'subscriptionValidUntil', user_record.subscription_valid_until
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to regenerate QR code for user
CREATE OR REPLACE FUNCTION regenerate_qr_code(
  user_id_param UUID DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  target_user_id UUID;
  new_qr_code TEXT;
  is_admin BOOLEAN := false;
BEGIN
  -- Check if user is admin
  SELECT EXISTS(SELECT 1 FROM admin_meta WHERE id = auth.uid()) INTO is_admin;
  
  -- Determine target user
  IF user_id_param IS NOT NULL THEN
    -- Admin can regenerate for any user
    IF NOT is_admin THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Unauthorized: Admin access required to regenerate QR for other users'
      );
    END IF;
    target_user_id := user_id_param;
  ELSE
    -- User can regenerate their own QR
    target_user_id := auth.uid();
  END IF;
  
  -- Generate new QR code
  new_qr_code := encode(digest(target_user_id::text || extract(epoch from now())::text || random()::text, 'sha256'), 'hex');
  
  -- Update user's QR code
  UPDATE library_users
  SET qr_code = new_qr_code
  WHERE id = target_user_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'User not found'
    );
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'qrCode', new_qr_code,
    'userId', target_user_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_my_library_profile TO authenticated;
GRANT EXECUTE ON FUNCTION get_my_scan_history TO authenticated;
GRANT EXECUTE ON FUNCTION admin_scan_qr TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_library_users TO authenticated;
GRANT EXECUTE ON FUNCTION admin_get_scan_analytics TO authenticated;
GRANT EXECUTE ON FUNCTION admin_update_user_subscription TO authenticated;
GRANT EXECUTE ON FUNCTION regenerate_qr_code TO authenticated;

COMMENT ON FUNCTION get_my_library_profile IS 'Flutter app: Get current user profile and QR code';
COMMENT ON FUNCTION get_my_scan_history IS 'Flutter app: Get user scan history with pagination';
COMMENT ON FUNCTION admin_scan_qr IS 'Web Admin: Scan QR code and log entry/exit';
COMMENT ON FUNCTION admin_get_library_users IS 'Web Admin: Get all users with stats and search';
COMMENT ON FUNCTION admin_get_scan_analytics IS 'Web Admin: Get scan analytics and reports';
COMMENT ON FUNCTION admin_update_user_subscription IS 'Web Admin: Update user subscription validity';
COMMENT ON FUNCTION regenerate_qr_code IS 'Regenerate QR code for user (self or admin for others)';