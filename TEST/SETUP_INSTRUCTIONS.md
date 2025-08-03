# 🚀 Manual Database Setup Instructions

## The Problem
Your login is failing because the required database tables (`library_users`, `admin_meta`, `scan_logs`) don't exist in your Supabase database.

## ✅ UPDATED - Error Fixed
The SQL script has been updated to fix the "column 'scanned_at' does not exist" error. The script now properly handles both `scan_time` and `scanned_at` columns for compatibility.

## The Solution
You need to manually execute the SQL setup in your Supabase dashboard.

## Step-by-Step Instructions

### 1. Open Supabase Dashboard
- Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
- Select your project

### 2. Navigate to SQL Editor
- Click on "SQL Editor" in the left sidebar
- Click "New Query" to create a new SQL query

### 3. Copy the SQL Setup
- Open the file `MANUAL_SETUP.sql` (created in your project root)
- Copy **ALL** the content from that file
- Paste it into the SQL Editor in Supabase

### 4. Execute the SQL
- Click the "Run" button (or press Ctrl/Cmd + Enter)
- Wait for the execution to complete
- You should see a success message: "Library system setup completed successfully!"

### 5. Verify the Setup
After execution, you can verify the tables were created by running this query:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('library_users', 'admin_meta', 'scan_logs');
```

You should see all three tables listed.

### 6. Create Admin Authentication User

**IMPORTANT**: The database tables exist, but you need to create a proper admin user in the authentication system.

1. **Admin User Creation**: 
   - If this is your first setup: Run the `create_admin_auth_user.sql` script in Supabase SQL Editor
   - If you get a "duplicate key" error: Run the `update_admin_meta_only.sql` script instead
2. Open the appropriate file (created in your project root)
3. Copy **ALL** the content from that file
4. Paste it into the SQL Editor and click "Run"
5. You should see "Setup completed successfully!" message

### 7. Test Your Login
- Go back to your application
- Try logging in with: **scnz141@gmail.com** / **Wehere**
- The login should now work successfully

## What This Setup Creates

1. **Tables:**
   - `library_users` - Stores user profiles with QR codes
   - `admin_meta` - Stores admin user metadata
   - `scan_logs` - Stores entry/exit scan logs

2. **Authentication:**
   - Admin user in `auth.users` table with proper password hashing
   - Linked admin profile in `admin_meta` table
   - Credentials: `scnz141@gmail.com` / `Wehere`

3. **Functions:**
   - `create_library_user()` - Creates new library users
   - `log_scan_library()` - Logs QR code scans
   - `create_admin_user()` - Creates admin users
   - `get_user_scan_history()` - Retrieves scan history
   - `update_admin_last_login()` - Updates admin login time

4. **Security:**
   - Row Level Security (RLS) policies
   - Proper indexes for performance
   - Sample test data

## Troubleshooting

If you encounter any errors during execution:

1. **"Database error querying schema":" Run the `create_admin_auth_user.sql` script
2. **"Invalid login credentials":" Make sure you use `scnz141@gmail.com` / `Wehere`
3. **Permission Errors:** Make sure you're logged in as the project owner
4. **Syntax Errors:** Ensure you copied the entire SQL content without any modifications
5. **Existing Tables:** The script handles existing tables safely with `IF NOT EXISTS` clauses

### Common Issues:
- **"Database error querying schema"**: Usually means the admin user doesn't exist in `auth.users` table
- **"Invalid login credentials"**: Check that the email/password match what's in the database
- **"Duplicate key" error**: The user already exists in `auth.users`, use `update_admin_meta_only.sql` instead
- **"Column 'updated_at' does not exist"**: This has been fixed in the latest SQL scripts

## Common Issues

### Issue: "Database error querying schema" / 500 Internal Server Error
**Root Cause**: Missing Service Role Key in .env file

**Solution**:
1. Go to Supabase Dashboard → Settings → API
2. Copy the **service_role** key (not anon key)
3. Add to .env file: `SUPABASE_SERVICE_ROLE_KEY=your_key_here`
4. Run: `node fix_admin_auth.js`
5. Restart your development server

**Quick Fix**: See `FIX_AUTH_ISSUE.md` for detailed instructions

### Issue: "Column 'email' does not exist"
This issue has been fixed in the latest SQL scripts.

### Issue: "Column 'updated_at' does not exist"
This issue has been fixed in the latest SQL scripts.

## After Setup

Once the setup is complete:
- Your login should work
- All user profile functionality should be restored
- QR code generation and scanning should work
- Admin and student roles should function properly

If you still encounter issues after the setup, please check the browser console for any remaining errors.