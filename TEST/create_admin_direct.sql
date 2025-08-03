-- Direct admin user creation script
-- This bypasses migration issues and creates the admin user directly

-- First, ensure we're connected to the right database
\c postgres

-- Create the admin user directly in auth.users
INSERT INTO auth.users (
    id,
    instance_id,
    aud,
    role,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    confirmation_token,
    email_change,
    email_change_token_new,
    recovery_token
) VALUES (
    '11111111-1111-1111-1111-111111111111'::uuid,
    '00000000-0000-0000-0000-000000000000'::uuid,
    'authenticated',
    'authenticated',
    'scnz141@gmail.com',
    crypt('Wehere', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    encrypted_password = EXCLUDED.encrypted_password,
    updated_at = NOW();

-- Create or update the user profile
INSERT INTO public.user_profiles (
    id,
    email,
    role,
    status,
    created_at,
    updated_at
) VALUES (
    '11111111-1111-1111-1111-111111111111'::uuid,
    'scnz141@gmail.com',
    'admin',
    'verified',
    NOW(),
    NOW()
) ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    updated_at = NOW();

-- Verify the creation
SELECT 'Admin user created successfully' as result;
SELECT id, email, role FROM auth.users WHERE email = 'scnz141@gmail.com';
SELECT id, email, role, status FROM public.user_profiles WHERE email = 'scnz141@gmail.com';