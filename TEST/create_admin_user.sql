-- Create Admin User Script
-- Email: scnz141@gmail.com
-- Password: Wehere

-- First, create the user in Supabase Auth (this would typically be done via Supabase Dashboard or API)
-- For reference, the auth.users table entry would look like:
/*
INSERT INTO auth.users (
  id,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  role,
  aud
) VALUES (
  gen_random_uuid(),
  'scnz141@gmail.com',
  crypt('Wehere', gen_salt('bf')), -- bcrypt hash
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated'
);
*/

-- Create user profile with admin role
-- Note: Replace 'USER_ID_HERE' with the actual UUID from auth.users after creating the user
INSERT INTO user_profiles (
  id,
  email,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
) VALUES (
  'USER_ID_HERE', -- Replace with actual user ID from auth.users
  'scnz141@gmail.com',
  'Admin User',
  'admin',
  true,
  now(),
  now()
);

-- Alternative: If you want to create the user profile for an existing auth user
-- First find the user ID from auth.users
/*
SELECT id FROM auth.users WHERE email = 'scnz141@gmail.com';
*/

-- Then insert the profile using the found ID
/*
INSERT INTO user_profiles (
  id,
  email,
  full_name,
  role,
  is_active,
  created_at,
  updated_at
)
SELECT 
  au.id,
  'scnz141@gmail.com',
  'Admin User',
  'admin',
  true,
  now(),
  now()
FROM auth.users au
WHERE au.email = 'scnz141@gmail.com'
AND NOT EXISTS (
  SELECT 1 FROM user_profiles up WHERE up.id = au.id
);
*/

-- Verify the admin user was created successfully
SELECT 
  up.id,
  up.email,
  up.full_name,
  up.role,
  up.is_active,
  up.created_at
FROM user_profiles up
WHERE up.email = 'scnz141@gmail.com';

-- Grant admin permissions (if using custom permissions table)
-- This is optional depending on your permission system
/*
INSERT INTO admin_permissions (
  user_id,
  permission,
  granted_at
)
SELECT 
  up.id,
  'full_admin_access',
  now()
FROM user_profiles up
WHERE up.email = 'scnz141@gmail.com'
AND up.role = 'admin';
*/

-- Note: To actually create the user in Supabase Auth, you would need to:
-- 1. Use Supabase Dashboard > Authentication > Users > Add User
-- 2. Or use Supabase Admin API
-- 3. Or use the Supabase CLI: supabase auth users create scnz141@gmail.com --password Wehere

-- After creating the auth user, run the user_profiles INSERT statement above with the correct