# Supabase User Authentication & Data Storage Documentation

## Overview

This document explains how user login data is stored and created in Supabase for the GStore application. It covers the complete authentication flow, database schema, triggers, and security policies.

## Authentication Flow

### 1. User Registration Process

1. **Frontend Registration**: User submits registration form with email and password
2. **Supabase Auth**: Creates user in `auth.users` table
3. **Database Trigger**: `handle_new_user()` function automatically creates user profile
4. **Profile Creation**: User profile inserted into `public.user_profiles` table

### 2. User Login Process

1. **Frontend Login**: User submits email and password
2. **Supabase Auth**: Validates credentials against `auth.users`
3. **Session Creation**: Returns JWT token and user session
4. **Profile Retrieval**: Frontend fetches user profile from `public.user_profiles`

## Database Schema

### Auth Tables (Managed by Supabase)

#### `auth.users`
- **Purpose**: Core authentication data
- **Key Fields**:
  - `id` (UUID): Primary key, used as foreign key in profile tables
  - `email` (TEXT): User's email address
  - `encrypted_password` (TEXT): Hashed password
  - `email_confirmed_at` (TIMESTAMP): Email verification timestamp
  - `created_at` (TIMESTAMP): Account creation time
  - `raw_user_meta_data` (JSONB): Additional user metadata

### Public Tables (Application Data)

#### `public.user_profiles`
```sql
CREATE TABLE public.user_profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'expired', 'inactive')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Field Descriptions**:
- `id`: Links to `auth.users.id` (UUID)
- `email`: User's email (must match auth.users.email)
- `name`: Display name for the user
- `role`: User role ('student' or 'admin')
- `status`: Account verification status
- `subscription_status`: Subscription state

#### `public.admin_invites`
```sql
CREATE TABLE public.admin_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    invite_code TEXT UNIQUE NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired')),
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days')
);
```

## Database Triggers

### `handle_new_user()` Function

**Purpose**: Automatically creates user profile when new user registers

**Location**: `/supabase/migrations/20240102000000_fix_auth_system.sql`

```sql
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    user_name TEXT;
BEGIN
    -- Extract name from metadata or use email prefix
    user_name := COALESCE(
        NEW.raw_user_meta_data->>'name',
        NEW.raw_user_meta_data->>'full_name',
        split_part(NEW.email, '@', 1)
    );
    
    -- Ensure name is not empty
    IF user_name IS NULL OR trim(user_name) = '' THEN
        user_name := split_part(NEW.email, '@', 1);
    END IF;
    
    -- Insert user profile with conflict handling
    INSERT INTO public.user_profiles (id, email, name)
    VALUES (NEW.id, NEW.email, user_name)
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        name = EXCLUDED.name,
        updated_at = NOW();
    
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error and continue
        RAISE LOG 'Error in handle_new_user: %', SQLERRM;
        RETURN NEW;
END;
$$;
```

**Key Features**:
- **Name Handling**: Extracts name from metadata or uses email prefix
- **Conflict Resolution**: Uses `ON CONFLICT` to handle duplicate inserts
- **Error Handling**: Logs errors but doesn't fail the auth process
- **Security**: Runs with `SECURITY DEFINER` privileges

### Trigger Definition

```sql
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Row Level Security (RLS)

### User Profiles Policies

#### 1. Profile Creation Policy
```sql
CREATE POLICY "Allow profile creation" ON public.user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);
```
- **Purpose**: Allows users to create their own profile
- **Condition**: User can only insert profile with their own `auth.uid()`

#### 2. Profile Reading Policy
```sql
CREATE POLICY "Users can view own profile" ON public.user_profiles
    FOR SELECT USING (auth.uid() = id);
```
- **Purpose**: Users can read their own profile data
- **Condition**: User can only select their own profile

#### 3. Profile Update Policy
```sql
CREATE POLICY "Users can update own profile" ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);
```
- **Purpose**: Users can modify their own profile
- **Condition**: User can only update their own profile

### Admin Policies

#### Admin Access to All Profiles
```sql
CREATE POLICY "Admins can manage all profiles" ON public.user_profiles
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.user_profiles
            WHERE id = auth.uid() AND role = 'admin'
        )
    );
```

## Data Flow Examples

### Example 1: New User Registration

1. **Input**: User registers with email `john@example.com` and password
2. **Auth Creation**: Supabase creates entry in `auth.users`:
   ```json
   {
     "id": "550e8400-e29b-41d4-a716-446655440000",
     "email": "john@example.com",
     "raw_user_meta_data": {"name": "John Doe"}
   }
   ```
3. **Trigger Execution**: `handle_new_user()` creates profile:
   ```sql
   INSERT INTO public.user_profiles (id, email, name)
   VALUES (
     '550e8400-e29b-41d4-a716-446655440000',
     'john@example.com',
     'John Doe'
   );
   ```
4. **Result**: User profile created with default role 'student' and status 'pending'

### Example 2: Admin Invite Process

1. **Admin Creates Invite**:
   ```sql
   INSERT INTO public.admin_invites (email, name, invite_code, created_by)
   VALUES ('admin@example.com', 'Admin User', 'ABC123', current_admin_id);
   ```
2. **User Registers with Invite**: Uses invite code during registration
3. **Profile Creation**: Same trigger process, but role can be set to 'admin'

## Security Considerations

### 1. Password Security
- Passwords are automatically hashed by Supabase Auth
- Never stored in plain text
- Uses bcrypt or similar secure hashing

### 2. Session Management
- JWT tokens for session management
- Configurable expiration times
- Automatic refresh token rotation

### 3. Email Verification
- Optional email confirmation required
- Prevents unauthorized account creation
- Configurable verification templates

### 4. Role-Based Access
- RLS policies enforce role-based permissions
- Admin roles have elevated privileges
- Student roles have restricted access

## Common Issues & Solutions

### Issue 1: Profile Creation Fails
**Symptoms**: User can authenticate but no profile exists
**Causes**:
- Trigger function errors
- RLS policy conflicts
- Name field validation issues

**Solutions**:
- Check trigger function logs
- Verify RLS policies
- Ensure name fallback logic works

### Issue 2: Duplicate Email Errors
**Symptoms**: Registration fails with unique constraint violation
**Causes**:
- Email already exists in user_profiles
- Concurrent registration attempts

**Solutions**:
- Use `ON CONFLICT` clauses
- Implement proper error handling
- Check for existing emails before registration

### Issue 3: Permission Denied Errors
**Symptoms**: Users can't access their own data
**Causes**:
- RLS policies too restrictive
- Missing auth context
- Incorrect policy conditions

**Solutions**:
- Review RLS policy logic
- Ensure `auth.uid()` is available
- Test policies with different user roles

## Monitoring & Debugging

### 1. Check Auth Users
```sql
SELECT id, email, created_at, email_confirmed_at
FROM auth.users
ORDER BY created_at DESC;
```

### 2. Check User Profiles
```sql
SELECT id, email, name, role, status, created_at
FROM public.user_profiles
ORDER BY created_at DESC;
```

### 3. Check Trigger Function
```sql
SELECT proname, prosrc
FROM pg_proc
WHERE proname = 'handle_new_user';
```

### 4. Monitor Failed Registrations
```sql
-- Check for auth users without profiles
SELECT a.id, a.email, a.created_at
FROM auth.users a
LEFT JOIN public.user_profiles p ON a.id = p.id
WHERE p.id IS NULL;
```

## Migration History

### Key Migration Files

1. **`20240101000000_initial_schema.sql`**
   - Initial user_profiles table
   - Basic RLS policies
   - Original trigger function

2. **`20240102000000_fix_auth_system.sql`**
   - Improved trigger function
   - Better error handling
   - Conflict resolution
   - Name fallback logic

3. **`20240103000000_qr_system.sql`**
   - QR code related tables
   - Additional admin policies

4. **`20240104000000_fix_recursion_policies.sql`**
   - Fixed recursive policy issues
   - Optimized RLS performance

## Best Practices

### 1. Always Use Transactions
```sql
BEGIN;
-- Multiple related operations
COMMIT;
```

### 2. Handle Errors Gracefully
```sql
EXCEPTION
    WHEN OTHERS THEN
        RAISE LOG 'Error: %', SQLERRM;
        RETURN NULL;
```

### 3. Test RLS Policies
```sql
-- Test as different users
SET ROLE authenticated;
SET request.jwt.claims TO '{"sub": "user-id"}';
```

### 4. Monitor Performance
- Use EXPLAIN ANALYZE for slow queries
- Monitor trigger execution times
- Check for policy conflicts

## Conclusion

This documentation provides a comprehensive overview of how user authentication and data storage works in the GStore Supabase implementation. The system is designed to be secure, scalable, and maintainable, with proper error handling and monitoring capabilities.

For any issues or questions, refer to the troubleshooting section or check the migration files for implementation details.