# Authentication System Testing Checklist

Use this checklist to verify that your authentication system is working correctly after implementing the fixes.

## 🗄️ Database Setup Verification

### 1. Run SQL Script
- [ ] Execute `fix_authentication_system.sql` in Supabase SQL Editor
- [ ] Verify no errors in execution
- [ ] Check that all verification queries at the end show expected results

### 2. Table Structure Verification
```sql
-- Check library_users table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'library_users' AND table_schema = 'public'
ORDER BY ordinal_position;
```
**Expected**: Should show all new columns (email, phone, role, status, is_active, subscription_status)

### 3. RLS Policies Verification
```sql
-- Check RLS policies
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'library_users';
```
**Expected**: Should show 5 policies for library_users

### 4. Functions Verification
```sql
-- Check functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public' 
AND routine_name IN ('handle_new_user', 'approve_user', 'reject_user', 'get_user_profile');
```
**Expected**: Should show 4 functions

### 5. Trigger Verification
```sql
-- Check trigger exists
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
```
**Expected**: Should show the trigger on auth.users table

## 📱 Flutter Implementation Testing

### 1. Dependencies Setup
- [ ] Add required dependencies to `pubspec.yaml`:
  ```yaml
  dependencies:
    flutter:
      sdk: flutter
    supabase_flutter: ^2.0.0
    provider: ^6.0.0
  ```
- [ ] Run `flutter pub get`
- [ ] Update Supabase configuration in `main.dart`

### 2. Code Implementation
- [ ] Create `models/library_user.dart`
- [ ] Create `services/supabase_service.dart`
- [ ] Create `providers/auth_provider.dart`
- [ ] Create `screens/login_screen.dart`
- [ ] Create `screens/register_screen.dart`
- [ ] Create `screens/admin/pending_users_screen.dart`
- [ ] Update `main.dart` with providers and routing

### 3. Build Verification
- [ ] Run `flutter analyze` (should show no errors)
- [ ] Run `flutter build` (should compile successfully)
- [ ] Test app launches without crashes

## 🧪 Functional Testing

### 1. User Registration Flow
- [ ] **Test 1**: Register new user
  - Fill registration form with valid data
  - Submit registration
  - **Expected**: Success message, redirected to pending approval screen
  - **Verify in DB**: New record in `auth.users` and `library_users` with status='pending'

- [ ] **Test 2**: Registration validation
  - Try invalid email format
  - Try password less than 6 characters
  - Try mismatched passwords
  - **Expected**: Appropriate validation errors shown

- [ ] **Test 3**: Duplicate email registration
  - Try registering with existing email
  - **Expected**: Error message about email already exists

### 2. Admin Approval Flow
- [ ] **Test 4**: Create admin user (manually in database)
  ```sql
  -- Create admin user for testing
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at)
  VALUES (gen_random_uuid(), 'admin@test.com', crypt('password123', gen_salt('bf')), now(), now(), now());
  
  -- Get the user ID and create admin profile
  INSERT INTO public.library_users (user_id, full_name, email, role, status, is_active)
  SELECT id, 'Admin User', 'admin@test.com', 'admin', 'verified', true
  FROM auth.users WHERE email = 'admin@test.com';
  ```

- [ ] **Test 5**: Admin login
  - Login with admin credentials
  - **Expected**: Successful login, access to admin features

- [ ] **Test 6**: View pending users
  - Navigate to pending users screen
  - **Expected**: List of pending users displayed

- [ ] **Test 7**: Approve user
  - Click approve on a pending user
  - **Expected**: User status changes to 'verified', user can now login
  - **Verify in DB**: `status='verified'` and `is_active=true`

- [ ] **Test 8**: Reject user
  - Click reject on a pending user
  - Provide rejection reason
  - **Expected**: User status changes to 'rejected'
  - **Verify in DB**: `status='rejected'` and `is_active=false`

### 3. User Login Flow
- [ ] **Test 9**: Approved user login
  - Login with approved user credentials
  - **Expected**: Successful login, access to main app

- [ ] **Test 10**: Pending user login attempt
  - Login with pending user credentials
  - **Expected**: Pending approval message shown

- [ ] **Test 11**: Rejected user login attempt
  - Login with rejected user credentials
  - **Expected**: Account rejected message shown

- [ ] **Test 12**: Invalid credentials
  - Try login with wrong password
  - Try login with non-existent email
  - **Expected**: Appropriate error messages

### 4. Security Testing
- [ ] **Test 13**: RLS enforcement
  - Verify users can only see their own profile data
  - Verify non-admin users cannot access admin functions
  - **Test in Supabase**: Try direct API calls with different user tokens

- [ ] **Test 14**: Trigger function
  - Register a new user
  - **Verify**: Profile automatically created in `library_users`
  - **Verify**: Default values set correctly (role='student', status='pending')

## 🔧 Troubleshooting Common Issues

### Database Issues
- **Issue**: "relation 'library_users' does not exist"
  - **Solution**: Ensure SQL script ran successfully
  - **Check**: Verify table exists in Supabase dashboard

- **Issue**: "permission denied for table library_users"
  - **Solution**: Check RLS policies are created correctly
  - **Check**: Verify policies in Supabase dashboard

- **Issue**: Trigger not working
  - **Solution**: Check trigger function exists and is enabled
  - **Test**: Register user and check if profile is created

### Flutter Issues
- **Issue**: "Supabase not initialized"
  - **Solution**: Ensure `Supabase.initialize()` is called in `main()`
  - **Check**: Verify URL and anon key are correct

- **Issue**: "Provider not found"
  - **Solution**: Ensure `AuthProvider` is wrapped in `ChangeNotifierProvider`
  - **Check**: Verify provider setup in `main.dart`

- **Issue**: Navigation errors
  - **Solution**: Check route names match in `MaterialApp.routes`
  - **Check**: Verify screen imports are correct

### Authentication Issues
- **Issue**: Users can't login after approval
  - **Solution**: Check user status is 'verified' and is_active is true
  - **Test**: Query database directly to verify user state

- **Issue**: Admin functions not working
  - **Solution**: Verify admin user has role='admin' in database
  - **Check**: Test admin functions in Supabase SQL editor

## 📊 Success Criteria

✅ **Complete Success**: All tests pass
- Users can register and receive pending status
- Admins can approve/reject users
- Approved users can login and access app
- Pending/rejected users see appropriate messages
- Security policies work correctly

⚠️ **Partial Success**: Most tests pass with minor issues
- Core functionality works
- Some edge cases may need refinement

❌ **Needs Work**: Multiple test failures
- Review implementation steps
- Check database setup
- Verify Flutter code matches examples

## 📝 Test Results Log

```
Date: ___________
Tester: ___________

Database Setup:
□ SQL Script: ___________
□ Table Structure: ___________
□ RLS Policies: ___________
□ Functions: ___________
□ Triggers: ___________

Flutter Implementation:
□ Dependencies: ___________
□ Code Files: ___________
□ Build Success: ___________

Functional Tests:
□ Registration: ___________
□ Admin Approval: ___________
□ User Login: ___________
□ Security: ___________

Overall Status: ___________
Notes: ___________
```

---

**Remember**: Test thoroughly in a development environment before deploying to production!