# Manual Admin User Creation - Dashboard Method

Since the automated scripts are encountering database errors, let's create the admin user manually through the Supabase Dashboard.

## Step 1: Create Auth User in Supabase Dashboard

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `hkpetmoloqeqkexxlfcz`
3. Navigate to **Authentication** → **Users**
4. Click **Add User**
5. Fill in the details:
   - **Email**: `scnz141@gmail.com`
   - **Password**: `Wehere`
   - **Email Confirm**: ✅ (checked)
   - **Phone Confirm**: ❌ (unchecked)
6. Click **Create User**
7. **Copy the User ID** that appears (you'll need this for the next step)

## Step 2: Create Admin Meta Record

1. Go to **SQL Editor** in Supabase Dashboard
2. Run this SQL query (replace `USER_ID_HERE` with the actual User ID from Step 1):

```sql
-- Replace USER_ID_HERE with the actual user ID from the dashboard
INSERT INTO admin_meta (id, full_name, role, created_at)
VALUES ('USER_ID_HERE', 'Admin User', 'admin', NOW())
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  role = EXCLUDED.role;
```

## Step 3: Verify the Setup

Run this verification query in SQL Editor:

```sql
-- Check if admin user exists in admin_meta
SELECT 
  id,
  full_name,
  role,
  created_at
FROM admin_meta 
WHERE role = 'admin';
```

You should see one record with:
- `full_name`: Admin User
- `role`: admin
- `created_at`: Current timestamp

## Step 4: Test Login

1. Stop your development server (Ctrl+C in terminal)
2. Restart it: `npm run dev`
3. Go to your application login page
4. Try logging in with:
   - **Email**: `scnz141@gmail.com`
   - **Password**: `Wehere`

## Expected Result

✅ **Success**: You should be able to log in without the "Database error querying schema" error

❌ **If still failing**: There might be an issue with the database schema or RLS policies

## Troubleshooting

If login still fails after manual creation:

1. **Check RLS Policies**: Ensure Row Level Security policies allow admin access
2. **Verify Tables**: Make sure `admin_meta` table exists
3. **Check Logs**: Look at browser console for specific error messages

---

**This manual method bypasses the automated script issues and should resolve the authentication problem.**