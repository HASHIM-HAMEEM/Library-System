-- Data Migration Script
-- Migrates existing data from current schema to new library management system
-- Run this AFTER the main migration (20240105000000_library_system_migration.sql)

-- Disable RLS temporarily for data migration
ALTER TABLE library_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE admin_meta DISABLE ROW LEVEL SECURITY;

-- Migrate data from user_profiles to library_users
INSERT INTO library_users (id, full_name, subscription_valid_until, qr_code, created_at)
SELECT 
  up.id,
  up.name as full_name,
  up.subscription_end::DATE as subscription_valid_until,
  COALESCE(
    up.qr_token,
    encode(digest(up.id::text || extract(epoch from now())::text || random()::text, 'sha256'), 'hex')
  ) as qr_code,
  up.created_at
FROM user_profiles up
WHERE up.role = 'student' OR up.role IS NULL
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  subscription_valid_until = EXCLUDED.subscription_valid_until,
  qr_code = COALESCE(library_users.qr_code, EXCLUDED.qr_code);

-- Migrate admin users to admin_meta
INSERT INTO admin_meta (id, full_name, last_login, created_at, updated_at)
SELECT 
  up.id,
  up.name as full_name,
  up.updated_at as last_login,
  up.created_at,
  up.updated_at
FROM user_profiles up
WHERE up.role = 'admin'
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  last_login = EXCLUDED.last_login;

-- Migrate attendance_logs to scan_logs
-- Convert entry_time to entry scan
INSERT INTO scan_logs (user_id, scan_time, scan_type, scanned_by, location, created_at)
SELECT 
  al.user_id,
  al.entry_time as scan_time,
  'entry' as scan_type,
  COALESCE(
    (SELECT name FROM user_profiles WHERE id = al.scanned_by_admin_id),
    'admin_panel'
  ) as scanned_by,
  'main_entrance' as location,
  al.created_at
FROM attendance_logs al
WHERE al.user_id IN (SELECT id FROM library_users)
AND al.entry_time IS NOT NULL;

-- Convert exit_time to exit scan (where exit_time exists)
INSERT INTO scan_logs (user_id, scan_time, scan_type, scanned_by, location, created_at)
SELECT 
  al.user_id,
  al.exit_time as scan_time,
  'exit' as scan_type,
  COALESCE(
    (SELECT name FROM user_profiles WHERE id = al.scanned_by_admin_id),
    'admin_panel'
  ) as scanned_by,
  'main_entrance' as location,
  al.updated_at
FROM attendance_logs al
WHERE al.user_id IN (SELECT id FROM library_users)
AND al.exit_time IS NOT NULL;

-- Migrate existing scan_logs table data (if it exists and has different structure)
INSERT INTO scan_logs (user_id, scan_time, scan_type, scanned_by, location, notes, created_at)
SELECT 
  sl.user_id,
  COALESCE(sl.entry_time, sl.created_at) as scan_time,
  CASE 
    WHEN sl.scan_type = 'entry' THEN 'entry'
    WHEN sl.scan_type = 'exit' THEN 'exit'
    WHEN sl.entry_time IS NOT NULL AND sl.exit_time IS NULL THEN 'entry'
    WHEN sl.exit_time IS NOT NULL THEN 'exit'
    ELSE 'entry'
  END as scan_type,
  COALESCE(
    (SELECT name FROM user_profiles WHERE id = sl.verified_by),
    'admin_panel'
  ) as scanned_by,
  COALESCE(sl.location, 'main_entrance') as location,
  sl.notes,
  sl.created_at
FROM scan_logs sl
WHERE sl.user_id IN (SELECT id FROM library_users)
ON CONFLICT DO NOTHING;

-- Update QR codes for users who don't have them
UPDATE library_users 
SET qr_code = encode(digest(id::text || extract(epoch from now())::text || random()::text, 'sha256'), 'hex')
WHERE qr_code IS NULL;

-- Ensure all QR codes are unique
WITH duplicate_qr AS (
  SELECT id, qr_code, 
    ROW_NUMBER() OVER (PARTITION BY qr_code ORDER BY created_at) as rn
  FROM library_users
  WHERE qr_code IS NOT NULL
)
UPDATE library_users 
SET qr_code = encode(digest(id::text || extract(epoch from now())::text || random()::text, 'sha256'), 'hex')
WHERE id IN (
  SELECT id FROM duplicate_qr WHERE rn > 1
);

-- Re-enable RLS
ALTER TABLE library_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_meta ENABLE ROW LEVEL SECURITY;

-- Create summary of migrated data
CREATE OR REPLACE VIEW migration_summary AS
SELECT 
  'library_users' as table_name,
  COUNT(*) as record_count,
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record
FROM library_users
UNION ALL
SELECT 
  'scan_logs' as table_name,
  COUNT(*) as record_count,
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record
FROM scan_logs
UNION ALL
SELECT 
  'admin_meta' as table_name,
  COUNT(*) as record_count,
  MIN(created_at) as earliest_record,
  MAX(created_at) as latest_record
FROM admin_meta;

-- Validation queries
-- Check for users without QR codes
SELECT 'Users without QR codes' as check_name, COUNT(*) as count
FROM library_users WHERE qr_code IS NULL
UNION ALL
-- Check for duplicate QR codes
SELECT 'Duplicate QR codes' as check_name, COUNT(*) - COUNT(DISTINCT qr_code) as count
FROM library_users WHERE qr_code IS NOT NULL
UNION ALL
-- Check for orphaned scan logs
SELECT 'Orphaned scan logs' as check_name, COUNT(*) as count
FROM scan_logs sl
LEFT JOIN library_users lu ON sl.user_id = lu.id
WHERE lu.id IS NULL;

-- Create backup tables for rollback (optional)
CREATE TABLE IF NOT EXISTS migration_backup_user_profiles AS
SELECT * FROM user_profiles;

CREATE TABLE IF NOT EXISTS migration_backup_attendance_logs AS
SELECT * FROM attendance_logs;

-- Log migration completion
INSERT INTO scan_logs (user_id, scan_time, scan_type, scanned_by, location, notes)
SELECT 
  (SELECT id FROM admin_meta LIMIT 1),
  NOW(),
  'entry',
  'system_migration',
  'data_migration',
  'Data migration completed successfully'
WHERE EXISTS (SELECT 1 FROM admin_meta);

COMMENT ON VIEW migration_summary IS 'Summary of data migration results';
COMMENT ON TABLE migration_backup_user_profiles IS 'Backup of user_profiles before migration';
COMMENT ON TABLE migration_backup_attendance_logs IS 'Backup of attendance_logs before migration';