# Manual Library System Setup Guide

Since the automated setup requires a service role key, here's how to set up the library system manually:

## Step 1: Run Database Migration

1. Open your Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to your project: `hkpetmoloqeqkexxlfcz`
3. Go to **SQL Editor**
4. Copy and paste the contents of `20240105000000_library_system_migration.sql`
5. Click **Run** to execute the migration

## Step 2: Add RPC Functions

1. In the same SQL Editor
2. Copy and paste the contents of `rpc_functions.sql`
3. Click **Run** to create the RPC functions

## Step 3: Create Admin User

1. Go to **Authentication** > **Users** in Supabase Dashboard
2. Click **Add User**
3. Enter:
   - Email: `admin@library.com`
   - Password: `LibraryAdmin2024!`
   - Email Confirm: ✅ (checked)
4. Click **Create User**
5. Copy the User ID from the created user

## Step 4: Create Admin Meta Record

1. Go back to **SQL Editor**
2. Run this SQL (replace `USER_ID_HERE` with the actual user ID from step 3):

```sql
INSERT INTO admin_meta (id, full_name, role)
VALUES ('USER_ID_HERE', 'Library Administrator', 'admin');
```

## Step 5: Create Test Library User

1. Go to **Authentication** > **Users**
2. Click **Add User**
3. Enter:
   - Email: `testuser@library.com`
   - Password: `TestUser2024!`
   - Email Confirm: ✅ (checked)
4. Click **Create User**

*Note: The library_user profile will be created automatically via the trigger.*

## Step 6: Verify Setup

1. Go to **Table Editor**
2. Check that these tables exist:
   - `library_users`
   - `scan_logs`
   - `admin_meta`
3. Verify the test user appears in `library_users`
4. Verify the admin appears in `admin_meta`

## Step 7: Test RPC Functions

1. Go to **SQL Editor**
2. Test the functions:

```sql
-- Test getting library users (as admin)
SELECT * FROM admin_get_library_users();

-- Test getting user profile
SELECT * FROM get_my_library_profile();
```

## Login Credentials

**Admin:**
- Email: `admin@library.com`
- Password: `LibraryAdmin2024!`

**Test User:**
- Email: `testuser@library.com`
- Password: `TestUser2024!`

## Next Steps

1. ✅ Database schema migrated
2. ✅ RPC functions deployed
3. ✅ Admin user created
4. ✅ Test user created
5. 🔄 Update Flutter app to use RPC functions
6. 🔄 Update Web Admin to use admin RPC functions
7. 🔄 Test QR code scanning
8. 🔄 Set up real-time subscriptions

## Integration Examples

### Flutter App Integration

```dart
// Get user profile and QR code
final response = await supabase.rpc('get_my_library_profile');

// Get scan history
final history = await supabase.rpc('get_my_scan_history');

// Real-time updates
supabase
  .from('scan_logs')
  .stream(primaryKey: ['id'])
  .eq('user_id', userId)
  .listen((data) {
    // Handle real-time scan updates
  });
```

### Web Admin Integration

```javascript
// Get all library users
const { data } = await supabase.rpc('admin_get_library_users');

// Scan QR code
const { data } = await supabase.rpc('admin_scan_qr', {
  qr_data: 'scanned_qr_code_here'
});

// Real-time updates
supabase
  .from('scan_logs')
  .on('INSERT', (payload) => {
    // Handle new scan logs
  })
  .subscribe();
```

The library management system is now ready for use! 🎉