# Fix Authentication Issue - Service Role Key Required

## 🚨 Root Cause
The authentication error "Database error querying schema" occurs because the **Service Role Key** is missing from your `.env` file. This key is required for admin operations and user authentication.

## 🔧 Solution Steps

### Step 1: Get Your Service Role Key

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `hkpetmoloqeqkexxlfcz`
3. Navigate to **Settings** → **API**
4. Find the **service_role** key (NOT the anon key)
5. Copy the service_role key

### Step 2: Update Your .env File

1. Open your `.env` file
2. Find this line:
   ```
   # SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```
3. Replace it with:
   ```
   SUPABASE_SERVICE_ROLE_KEY=your_actual_service_role_key
   ```
   (Remove the # and paste your actual key)

### Step 3: Create Admin User Properly

After adding the service role key, run this script:

```bash
node TEST/create_admin_simple.js
```

This will:
- Create the admin user in `auth.users`
- Create the admin profile in `admin_meta`
- Set up proper authentication

### Step 4: Restart Your Application

1. Stop your development server (Ctrl+C)
2. Restart it:
   ```bash
   npm run dev
   # or
   yarn dev
   ```

### Step 5: Test Login

Try logging in with:
- **Email**: `scnz141@gmail.com`
- **Password**: `Wehere`

## 🔍 Why This Fixes the Issue

1. **Service Role Key**: Provides admin-level access to Supabase
2. **Proper User Creation**: Creates user in both `auth.users` and `admin_meta`
3. **Authentication Flow**: Enables proper JWT token generation
4. **Schema Access**: Allows the app to query user data correctly

## 🚨 Security Note

⚠️ **IMPORTANT**: The service role key has admin privileges. Keep it secure:
- Never commit it to version control
- Only use it server-side
- Rotate it periodically

## 🔄 Alternative: Manual Creation (If Service Key Not Available)

If you can't get the service role key:

1. Go to Supabase Dashboard → **Authentication** → **Users**
2. Click **Add User**
3. Enter:
   - Email: `scnz141@gmail.com`
   - Password: `Wehere`
   - ✅ Email Confirm
4. Click **Create User**
5. Copy the User ID
6. Go to **SQL Editor** and run:
   ```sql
   INSERT INTO admin_meta (id, full_name, role, created_at)
   VALUES ('USER_ID_HERE', 'Admin User', 'admin', NOW());
   ```
   (Replace `USER_ID_HERE` with the actual user ID)

## ✅ Verification

After completing the steps:

1. Check that login works without errors
2. Verify admin dashboard access
3. Confirm no "Database error querying schema" messages

---

**The authentication issue will be resolved once you add the service role key and create the admin user properly.**