-- Create admin user in Supabase Auth system
-- This script should be run in Supabase SQL Editor

-- First, let's create the admin user in auth.users (this is in the auth schema, not public)
-- We need to use Supabase's built-in functions for this

-- Create a function to safely create admin user
CREATE OR REPLACE FUNCTION create_admin_user()
RETURNS TEXT AS $$
DECLARE
    admin_user_id UUID;
    admin_email TEXT := 'scnz141@gmail.com';
    admin_password TEXT := 'Wehere';
BEGIN
    -- Check if admin user already exists in auth.users
    SELECT id INTO admin_user_id 
    FROM auth.users 
    WHERE email = admin_email;
    
    IF admin_user_id IS NULL THEN
        -- Create new admin user using Supabase's auth functions
        -- Note: This requires admin privileges in Supabase
        INSERT INTO auth.users (
            instance_id,
            id,
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
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            admin_email,
            crypt(admin_password, gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        )
        RETURNING id INTO admin_user_id;
        
        RAISE NOTICE 'Created new admin user with ID: %', admin_user_id;
    ELSE
        RAISE NOTICE 'Admin user already exists with ID: %', admin_user_id;
    END IF;
    
    -- Now handle admin_meta table
    IF NOT EXISTS (SELECT 1 FROM admin_meta WHERE user_id = admin_user_id) THEN
        -- Insert new admin_meta record
        INSERT INTO admin_meta (user_id, name, created_at)
        VALUES (admin_user_id, 'Admin User', NOW());
        RAISE NOTICE 'Created admin_meta record';
    ELSE
        -- Update existing admin_meta record
        UPDATE admin_meta SET
            name = 'Admin User'
        WHERE user_id = admin_user_id;
        RAISE NOTICE 'Updated admin_meta record';
    END IF;
    
    RETURN 'Admin user setup completed successfully';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Execute the function
SELECT create_admin_user();

-- Clean up the function
DROP FUNCTION create_admin_user();

-- Verification queries
SELECT 'Auth Users:' as info;
SELECT id, email, created_at, email_confirmed_at 
FROM auth.users 
WHERE email = 'scnz141@gmail.com';

SELECT 'Admin Meta:' as info;
SELECT * FROM admin_meta;