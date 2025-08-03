-- Verification script to check current database state
-- Run this first to understand what exists

-- Check if library_users table exists
SELECT 'Checking if library_users table exists:' as info;
SELECT EXISTS (
  SELECT FROM information_schema.tables 
  WHERE table_schema = 'public' 
  AND table_name = 'library_users'
) as table_exists;

-- Check current structure of library_users table (if it exists)
SELECT 'Current library_users table structure:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'library_users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check if user_id column specifically exists
SELECT 'Checking if user_id column exists:' as info;
SELECT EXISTS (
  SELECT FROM information_schema.columns 
  WHERE table_schema = 'public' 
  AND table_name = 'library_users'
  AND column_name = 'user_id'
) as user_id_column_exists;

-- Show all tables in public schema
SELECT 'All tables in public schema:' as info;
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;