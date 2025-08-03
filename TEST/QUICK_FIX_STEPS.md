# Quick Fix Guide for Common Supabase Issues

## Issue 1: "column user_id does not exist" Error

## Problem
The `fix_authentication_system.sql` script is failing because it expects a `user_id` column in the `library_users` table, but the current table structure only has:
- `id` (UUID PRIMARY KEY)
- `name` (TEXT)
- `subscription_valid_until` (DATE)
- `qr_code` (TEXT)
- `created_at` (TIMESTAMPTZ)
- `updated_at` (TIMESTAMPTZ)

## Solution
Run the simplified fix script first to add the missing columns, then run the full authentication system.

## Steps to Fix

### Step 1: Run the Simple Fix
1. Open your Supabase SQL Editor
2. Copy and paste the contents of `simple_fix_authentication.sql`
3. Execute the script

This will:
- Add all missing columns (`user_id`, `full_name`, `email`, `phone`, `role`, `status`, `is_active`, `subscription_status`)
- Populate `full_name` from existing `name` column
- Set default values for existing users
- Add necessary indexes

### Step 2: Verify the Fix
After running the simple fix, you should see output showing:
- Updated table structure with all new columns
- Sample data with populated fields

### Step 3: Run the Full Authentication System (Optional)
Once the columns exist, you can run the full `fix_authentication_system.sql` script if you need:
- RLS policies
- Trigger functions
- Admin management functions
- Views for user management

## What the Simple Fix Does

1. **Adds Missing Columns**: Safely adds all authentication-related columns
2. **Preserves Existing Data**: Copies `name` to `full_name`, generates email from name
3. **Sets Sensible Defaults**: Existing users become 'verified' and 'active'
4. **Adds Performance Indexes**: For email, status, role, and user_id lookups

## Expected Result
After the fix, your `library_users` table will have:
```
id | name | user_id | full_name | email | phone | role | status | is_active | subscription_status | subscription_valid_until | qr_code | created_at | updated_at
```

## Troubleshooting

### If you get permission errors:
- Make sure you're using the Service Role key in Supabase
- Or run the commands as a database admin

### If columns already exist:
- The script uses `ADD COLUMN IF NOT EXISTS` so it's safe to run multiple times

### If you need to start over:
```sql
-- Only if you need to remove the added columns
ALTER TABLE public.library_users 
DROP COLUMN IF EXISTS user_id,
DROP COLUMN IF EXISTS full_name,
DROP COLUMN IF EXISTS email,
DROP COLUMN IF EXISTS phone,
DROP COLUMN IF EXISTS role,
DROP COLUMN IF EXISTS status,
DROP COLUMN IF EXISTS is_active,
DROP COLUMN IF EXISTS subscription_status;
```

## Issue 2: Email Registration Error - "Email address is invalid"

### Problem
Getting this error when trying to register users:
```
AuthApiException(message: Email address "email@domain.com" is invalid, statusCode: 400, code: email_address_invalid)
```

### Root Cause
Supabase changed their platform in September 2024 to require custom SMTP setup for email signups.

### Quick Solution
1. **For Development/Testing:**
   - Go to Supabase Dashboard → Authentication → Providers → Email
   - Turn OFF "Confirm Email"
   - Save changes
   
2. **For Production (Recommended):**
   - Set up custom SMTP with Resend (free tier: 3,000 emails/month)
   - See detailed guide in `SUPABASE_EMAIL_FIX_GUIDE.md`

### Steps for Resend SMTP Setup
1. Create free account at [resend.com](https://resend.com)
2. Get SMTP credentials from Settings → SMTP
3. In Supabase: Project Settings → Authentication → SMTP Settings
4. Enable Custom SMTP with these settings:
   ```
   Host: smtp.resend.com
   Port: 587
   Username: resend
   Password: [Your Resend API Key]
   ```

## Next Steps
After fixing both issues:
1. Test user registration (should work without email errors)
2. Test the authentication system
3. Create admin users
4. Implement the Flutter integration
5. Test the complete flow