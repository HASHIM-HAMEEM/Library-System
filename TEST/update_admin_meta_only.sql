-- Update admin_meta for existing auth user
-- This SQL should be executed in Supabase SQL Editor
-- Use this when the auth.users record already exists

-- First, let's verify the existing auth user
SELECT 'Existing auth user:' as info;
SELECT id, email, created_at FROM auth.users WHERE email = 'scnz141@gmail.com';

-- Update or create admin_meta record
DO $$
DECLARE
    admin_user_id UUID;
BEGIN
    -- Get the admin user ID
    SELECT id INTO admin_user_id FROM auth.users WHERE email = 'scnz141@gmail.com';
    
    IF admin_user_id IS NOT NULL THEN
        RAISE NOTICE 'Found admin user ID: %', admin_user_id;
        
        -- Check if admin_meta record already exists for this user_id
        IF NOT EXISTS (SELECT 1 FROM admin_meta WHERE user_id = admin_user_id) THEN
            -- Insert new admin_meta record
            INSERT INTO admin_meta (user_id, name, created_at)
            VALUES (admin_user_id, 'Admin User', NOW());
            RAISE NOTICE 'Created new admin_meta record';
        ELSE
            -- Update existing admin_meta record
            UPDATE admin_meta SET
                name = 'Admin User'
            WHERE user_id = admin_user_id;
            RAISE NOTICE 'Updated existing admin_meta record';
        END IF;
        
        RAISE NOTICE 'Admin setup completed successfully';
    ELSE
        RAISE NOTICE 'Admin user not found in auth.users table';
    END IF;
END $$;

-- Verify the final setup
SELECT 'Verification - auth.users:' as info;
SELECT id, email, created_at FROM auth.users WHERE email = 'scnz141@gmail.com';

SELECT 'Verification - admin_meta:' as info;
SELECT user_id, name, created_at FROM admin_meta 
WHERE user_id = (SELECT id FROM auth.users WHERE email = 'scnz141@gmail.com');

SELECT 'Setup completed successfully!' as result;