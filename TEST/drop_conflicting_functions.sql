-- Drop any existing conflicting functions before running the migration
-- This resolves the "column scan_time does not exist" error

DROP FUNCTION IF EXISTS get_scan_analytics(DATE, DATE);
DROP FUNCTION IF EXISTS admin_get_scan_analytics(DATE, DATE);
DROP FUNCTION IF EXISTS get_my_scan_history(INTEGER);
DROP FUNCTION IF EXISTS admin_get_user_scan_history(UUID, INTEGER);
DROP FUNCTION IF EXISTS admin_get_all_users();
DROP FUNCTION IF EXISTS admin_get_user_details(UUID);
DROP FUNCTION IF EXISTS admin_update_user_subscription(UUID, DATE);
DROP FUNCTION IF EXISTS admin_delete_user(UUID);
DROP FUNCTION IF EXISTS admin_get_recent_scans(INTEGER);
DROP FUNCTION IF EXISTS admin_search_users(TEXT);

-- Also drop any views that might reference scan_time
DROP VIEW IF EXISTS library_user_stats;

SELECT 'All conflicting functions and views dropped successfully' as result;