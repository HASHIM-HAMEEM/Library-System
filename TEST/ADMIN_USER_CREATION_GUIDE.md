# Admin User Creation Guide

This guide provides multiple methods to create an admin user with the following credentials:
- **Email**: scnz141@gmail.com
- **Password**: Wehere
- **Role**: admin

## 🎯 Quick Summary

The admin user profile has been prepared in the database. You now need to create the corresponding authentication user in Supabase.

---

## 📋 Method 1: Using Supabase Dashboard (Recommended)

### Step 1: Access Supabase Dashboard
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `hkpetmoloqeqkexxlfcz`
3. Navigate to **Authentication** > **Users**

### Step 2: Create Admin User
1. Click **"Add User"** button
2. Fill in the form:
   - **Email**: `scnz141@gmail.com`
   - **Password**: `Wehere`
   - **Auto Confirm User**: ✅ (checked)
   - **User ID**: Use the UUID from the database profile (see Method 3 to get it)
3. Click **"Create User"**

### Step 3: Verify Creation
1. The user should appear in the users list
2. Test login on your application

---

## 🖥️ Method 2: Using Supabase CLI

### Prerequisites
- Install Supabase CLI: `npm install -g supabase`
- Login to Supabase: `supabase login`
- Link your project: `supabase link --project-ref hkpetmoloqeqkexxlfcz`

### Create User Command
```bash
# First, get the user ID from the database profile
# Then run this command with the actual UUID:
supabase auth users create scnz141@gmail.com --password Wehere --user-id YOUR_UUID_HERE
```

---

## 🗄️ Method 3: Using SQL (Database Profile Creation)

### Run in Supabase SQL Editor

1. Go to **SQL Editor** in Supabase Dashboard
2. Run the SQL script from `TEST/create_admin_direct.sql`
3. This will:
   - Create the user profile in the database
   - Generate a UUID for the user
   - Provide instructions for creating the auth user

### SQL Script Location
```
TEST/create_admin_direct.sql
```

---

## 🔧 Method 4: Using Node.js Script (Advanced)

### Prerequisites
- Service Role Key from Supabase Dashboard
- Add to `.env` file: `SUPABASE_SERVICE_ROLE_KEY=your_service_role_key`

### Run Script
```bash
node TEST/create_admin_user.js
```

**Note**: This method requires the service role key which has admin privileges.

---

## ✅ Verification Steps

### 1. Check Database Profile
Run this SQL query in Supabase SQL Editor:
```sql
SELECT 
    id,
    name,
    email,
    role,
    status,
    subscription_status,
    created_at
FROM user_profiles 
WHERE email = 'scnz141@gmail.com';
```

### 2. Check Auth User
In Supabase Dashboard > Authentication > Users, look for:
- Email: `scnz141@gmail.com`
- Status: Confirmed
- Last Sign In: Should show after first login

### 3. Test Application Login
1. Go to your application login page
2. Enter credentials:
   - Email: `scnz141@gmail.com`
   - Password: `Wehere`
3. Should successfully log in with admin privileges

---

## 🚨 Troubleshooting

### Issue: "User already exists"
- Check if the user exists in Authentication > Users
- If yes, just verify the password and test login
- If profile doesn't exist, run the SQL script to create it

### Issue: "Row Level Security Policy Violation"
- Use Method 3 (SQL script) which temporarily disables RLS
- Or use Method 1 (Dashboard) which bypasses RLS

### Issue: "Invalid credentials"
- Verify the password is exactly: `Wehere`
- Check if the user is confirmed in the dashboard
- Ensure the user profile exists in the database

### Issue: "Access denied" after login
- Verify the user profile has `role = 'admin'`
- Check if the user ID matches between auth.users and user_profiles

---

## 📁 Files Created

- `TEST/create_admin_user.sql` - SQL commands for reference
- `TEST/create_admin_user.js` - Node.js script (requires service key)
- `TEST/create_admin_profile.js` - Profile creation script
- `TEST/create_admin_direct.sql` - Direct SQL script for Supabase
- `TEST/ADMIN_USER_CREATION_GUIDE.md` - This guide

---

## 🔐 Security Notes

1. **Change Default Password**: After first login, change the password
2. **Service Role Key**: Keep the service role key secure and never commit it
3. **Admin Access**: This user will have full admin privileges
4. **Database Access**: The user can manage all users and system settings

---

## 📞 Next Steps

1. Choose one of the methods above to create the auth user
2. Test the login functionality
3. Change the default password after first login
4. Set up any additional admin configurations needed

The admin user profile is ready in the database. Just create the authentication user using your preferred method above!