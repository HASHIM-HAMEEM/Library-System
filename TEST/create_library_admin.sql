-- Create Library Admin User SQL Script
-- Run this directly in Supabase SQL Editor
-- This creates an admin user for the library management system
-- Email: scnz141@gmail.com
-- Password: Wehere

-- Step 1: Check if admin already exists in admin_meta
SELECT 
    id,
    full_name,
    last_login,
    created_at
FROM admin_meta 
WHERE id IN (
    SELECT id FROM auth.users WHERE email = 'scnz141@gmail.com'
);

-- Step 2: Create the admin user
-- Note: This creates the admin metadata entry
-- The auth user must be created separately in Supabase Dashboard

DO $$
DECLARE
    admin_user_id UUID;
    existing_auth_user_count INTEGER;
    existing_admin_count INTEGER;
BEGIN
    -- Check if auth user already exists
    SELECT COUNT(*) INTO existing_auth_user_count
    FROM auth.users
    WHERE email = 'scnz141@gmail.com';
    
    IF existing_auth_user_count > 0 THEN
        -- Get existing user ID
        SELECT id INTO admin_user_id
        FROM auth.users
        WHERE email = 'scnz141@gmail.com'
        LIMIT 1;
        
        RAISE NOTICE 'Found existing auth user with ID: %', admin_user_id;
        
        -- Update user metadata to include admin role
        UPDATE auth.users
        SET 
            raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role": "admin"}'::jsonb,
            raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"name": "Library Admin", "full_name": "Library Admin"}'::jsonb,
            updated_at = NOW()
        WHERE id = admin_user_id;
        
        RAISE NOTICE 'Updated user metadata with admin role';
    ELSE
        -- Generate new UUID for admin user
        admin_user_id := gen_random_uuid();
        RAISE NOTICE 'Generated new admin user ID: %', admin_user_id;
        RAISE NOTICE '';
        RAISE NOTICE '⚠️  IMPORTANT: You must create the auth user manually!';
        RAISE NOTICE 'Go to Supabase Dashboard > Authentication > Users > Add User';
        RAISE NOTICE 'Use these exact details:';
        RAISE NOTICE '  📧 Email: scnz141@gmail.com';
        RAISE NOTICE '  🔑 Password: Wehere';
        RAISE NOTICE '  🆔 User ID: %', admin_user_id;
        RAISE NOTICE '  ✅ Email Confirm: true';
        RAISE NOTICE '';
    END IF;
    
    -- Check if admin metadata already exists
    SELECT COUNT(*) INTO existing_admin_count
    FROM admin_meta
    WHERE id = admin_user_id;
    
    IF existing_admin_count = 0 THEN
        -- Create admin metadata
        INSERT INTO admin_meta (
            id,
            full_name,
            last_login,
            created_at,
            updated_at
        ) VALUES (
            admin_user_id,
            'Library Admin',
            NOW(),
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created admin metadata for user: %', admin_user_id;
    ELSE
        -- Update existing admin metadata
        UPDATE admin_meta 
        SET 
            full_name = 'Library Admin',
            last_login = NOW(),
            updated_at = NOW()
        WHERE id = admin_user_id;
        
        RAISE NOTICE 'Updated existing admin metadata for user: %', admin_user_id;
    END IF;
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ Admin setup completed!';
    RAISE NOTICE 'Admin can now:';
    RAISE NOTICE '  • Access the admin dashboard';
    RAISE NOTICE '  • Manage library users';
    RAISE NOTICE '  • View scan logs and analytics';
    RAISE NOTICE '  • Generate QR codes for users';
    
END $$;

-- Step 3: Verify the admin was created/updated
SELECT 
    am.id,
    am.full_name,
    am.last_login,
    am.created_at,
    au.email,
    au.raw_app_meta_data->>'role' as role,
    au.email_confirmed_at IS NOT NULL as email_confirmed
FROM admin_meta am
LEFT JOIN auth.users au ON am.id = au.id
WHERE au.email = 'scnz141@gmail.com' OR am.id IN (
    SELECT id FROM auth.users WHERE email = 'scnz141@gmail.com'
);

-- Step 4: Show final instructions
SELECT 
    '🎉 Admin User Setup Instructions' as title,
    'If auth user does not exist yet:' as step_1,
    '1. Go to Supabase Dashboard > Authentication > Users' as instruction_1,
    '2. Click "Add User"' as instruction_2,
    '3. Email: scnz141@gmail.com' as instruction_3,
    '4. Password: Wehere' as instruction_4,
    '5. Check "Email Confirm"' as instruction_5,
    '6. Use the User ID shown above' as instruction_6,
    'The admin metadata is already created and ready!'