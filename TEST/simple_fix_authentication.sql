-- Simple Authentication Fix Script
-- Run this in your Supabase SQL Editor to add missing columns

-- Add missing columns to library_users table
ALTER TABLE public.library_users ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE public.library_users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE public.library_users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.library_users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.library_users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin'));
ALTER TABLE public.library_users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected'));
ALTER TABLE public.library_users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;
ALTER TABLE public.library_users ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'expired'));

-- Update existing data
UPDATE public.library_users SET
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_library_users_email ON library_users(email);
CREATE INDEX IF NOT EXISTS idx_library_users_status ON library_users(status);
CREATE INDEX IF NOT EXISTS idx_library_users_role ON library_users(role);
CREATE INDEX IF NOT EXISTS idx_library_users_user_id ON library_users(user_id);

-- Verify the changes
SELECT 'Table structure after fix:' as info;
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'library_users' AND table_schema = 'public'
ORDER BY ordinal_position;

SELECT 'Sample data after fix:' as info;
SELECT id, name, full_name, email, role, status, is_active, subscription_status
FROM public.library_users
LIMIT 3;