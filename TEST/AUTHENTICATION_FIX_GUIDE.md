# Authentication System Fix Guide

## Overview

This guide provides step-by-step instructions to fix the authentication system without changing the database structure. The current issue is that the documentation and code reference a `user_profiles` table that doesn't exist, while the actual database uses `library_users`.

## 🚨 Current Issues

1. **Table Mismatch**: Code references `user_profiles` but database has `library_users`
2. **Schema Mismatch**: Missing fields for user management workflow
3. **RLS Policies**: Reference wrong table name
4. **Trigger Functions**: Try to insert into non-existent table
5. **Flutter Code**: Will fail on authentication calls

## 🔧 Fix Strategy

We'll adapt the authentication system to work with the existing `library_users` table structure:

**Current `library_users` schema:**
```sql
CREATE TABLE public.library_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID, -- Reference to auth.users.id
  full_name TEXT NOT NULL,
  subscription_valid_until DATE,
  qr_code TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 📋 Step-by-Step Fixes

### Step 1: Update Database Schema (Minimal Changes)

Add missing fields to `library_users` table to support authentication workflow:

```sql
-- Add authentication-related fields to existing library_users table
ALTER TABLE public.library_users 
ADD COLUMN IF NOT EXISTS email TEXT,
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student' CHECK (role IN ('student', 'admin')),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'verified' CHECK (status IN ('pending', 'verified', 'rejected')),
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'expired', 'inactive'));

-- Add unique constraint on email
ALTER TABLE public.library_users ADD CONSTRAINT library_users_email_unique UNIQUE (email);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_library_users_email ON library_users(email);
CREATE INDEX IF NOT EXISTS idx_library_users_status ON library_users(status);
CREATE INDEX IF NOT EXISTS idx_library_users_role ON library_users(role);
```

### Step 2: Fix RLS Policies

Update all RLS policies to reference `library_users` instead of `user_profiles`:

```sql
-- Enable RLS on library_users
ALTER TABLE public.library_users ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON public.library_users;
DROP POLICY IF EXISTS "Users can update own profile" ON public.library_users;
DROP POLICY IF EXISTS "Allow profile creation" ON public.library_users;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.library_users;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.library_users;

-- Create new RLS policies for library_users
CREATE POLICY "Users can view own profile" ON public.library_users
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.library_users
    FOR UPDATE USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "Allow profile creation" ON public.library_users
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can insert profiles" ON public.library_users
    FOR INSERT WITH CHECK (auth.role() = 'service_role');

CREATE POLICY "Admins can manage all profiles" ON public.library_users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.library_users
            WHERE user_id = auth.uid() AND role = 'admin'
        )
    );
```

### Step 3: Fix Trigger Functions

Update trigger function to work with `library_users` table:

```sql
-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create new trigger function for library_users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.library_users (
    user_id,
    full_name,
    email,
    role,
    status,
    is_active,
    subscription_status
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    'student',
    'pending',
    false,
    'inactive'
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log error but don't fail the auth user creation
    RAISE WARNING 'Failed to create library_users profile: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

### Step 4: Create Admin Management Functions

Create functions to manage user approval workflow:

```sql
-- Function to approve a user
CREATE OR REPLACE FUNCTION public.approve_user(user_id UUID, admin_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the admin exists and has admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.library_users 
    WHERE user_id = admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can approve users';
  END IF;

  -- Update user status
  UPDATE public.library_users
  SET 
    status = 'verified',
    is_active = true,
    updated_at = NOW()
  WHERE user_id = approve_user.user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to reject a user
CREATE OR REPLACE FUNCTION public.reject_user(user_id UUID, reason TEXT, admin_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the admin exists and has admin role
  IF NOT EXISTS (
    SELECT 1 FROM public.library_users 
    WHERE user_id = admin_id AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can reject users';
  END IF;

  -- Update user status
  UPDATE public.library_users
  SET 
    status = 'rejected',
    is_active = false,
    updated_at = NOW()
  WHERE user_id = reject_user.user_id;

  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create view for pending users (admin use)
CREATE OR REPLACE VIEW public.pending_users AS
SELECT 
  id,
  user_id,
  full_name,
  email,
  phone,
  status,
  created_at
FROM public.library_users
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### Step 5: Update Flutter Service Code

Update your Flutter `SupabaseService` to use `library_users` instead of `user_profiles`:

```dart
// supabase_service.dart
class SupabaseService {
  static const String _tableName = 'library_users'; // Changed from 'user_profiles'
  
  // Sign up method
  static Future<AuthResponse> signUp({
    required String email,
    required String password,
    required String name,
    String? phone,
  }) async {
    try {
      final response = await Supabase.instance.client.auth.signUp(
        email: email,
        password: password,
        data: {
          'name': name,
          'phone': phone,
        },
      );
      return response;
    } catch (e) {
      throw Exception('Sign up failed: $e');
    }
  }

  // Get user profile method
  static Future<Map<String, dynamic>?> getUserProfile() async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) return null;

      final response = await Supabase.instance.client
          .from(_tableName)
          .select()
          .eq('user_id', user.id) // Changed from 'id' to 'user_id'
          .single();

      return response;
    } catch (e) {
      throw Exception('Failed to get user profile: $e');
    }
  }

  // Update user profile method
  static Future<void> updateUserProfile(Map<String, dynamic> updates) async {
    try {
      final user = Supabase.instance.client.auth.currentUser;
      if (user == null) throw Exception('No authenticated user');

      await Supabase.instance.client
          .from(_tableName)
          .update({
            ...updates,
            'updated_at': DateTime.now().toIso8601String(),
          })
          .eq('user_id', user.id); // Changed from 'id' to 'user_id'
    } catch (e) {
      throw Exception('Failed to update profile: $e');
    }
  }

  // Check user status for login
  static Future<bool> isUserApproved() async {
    try {
      final profile = await getUserProfile();
      if (profile == null) return false;
      
      return profile['status'] == 'verified' && profile['is_active'] == true;
    } catch (e) {
      return false;
    }
  }

  // Admin functions
  static Future<List<Map<String, dynamic>>> getPendingUsers() async {
    try {
      final response = await Supabase.instance.client
          .from('pending_users')
          .select();
      
      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      throw Exception('Failed to get pending users: $e');
    }
  }

  static Future<void> approveUser(String userId) async {
    try {
      final currentUser = Supabase.instance.client.auth.currentUser;
      if (currentUser == null) throw Exception('No authenticated user');

      await Supabase.instance.client.rpc('approve_user', {
        'user_id': userId,
        'admin_id': currentUser.id,
      });
    } catch (e) {
      throw Exception('Failed to approve user: $e');
    }
  }

  static Future<void> rejectUser(String userId, String reason) async {
    try {
      final currentUser = Supabase.instance.client.auth.currentUser;
      if (currentUser == null) throw Exception('No authenticated user');

      await Supabase.instance.client.rpc('reject_user', {
        'user_id': userId,
        'reason': reason,
        'admin_id': currentUser.id,
      });
    } catch (e) {
      throw Exception('Failed to reject user: $e');
    }
  }
}
```

### Step 6: Update Flutter Data Models

Create/update your user model to match the `library_users` structure:

```dart
// models/library_user.dart
class LibraryUser {
  final String id;
  final String userId;
  final String fullName;
  final String? email;
  final String? phone;
  final String role;
  final String status;
  final bool isActive;
  final String subscriptionStatus;
  final DateTime? subscriptionValidUntil;
  final String? qrCode;
  final DateTime createdAt;
  final DateTime updatedAt;

  LibraryUser({
    required this.id,
    required this.userId,
    required this.fullName,
    this.email,
    this.phone,
    required this.role,
    required this.status,
    required this.isActive,
    required this.subscriptionStatus,
    this.subscriptionValidUntil,
    this.qrCode,
    required this.createdAt,
    required this.updatedAt,
  });

  factory LibraryUser.fromJson(Map<String, dynamic> json) {
    return LibraryUser(
      id: json['id'],
      userId: json['user_id'],
      fullName: json['full_name'],
      email: json['email'],
      phone: json['phone'],
      role: json['role'] ?? 'student',
      status: json['status'] ?? 'pending',
      isActive: json['is_active'] ?? false,
      subscriptionStatus: json['subscription_status'] ?? 'inactive',
      subscriptionValidUntil: json['subscription_valid_until'] != null
          ? DateTime.parse(json['subscription_valid_until'])
          : null,
      qrCode: json['qr_code'],
      createdAt: DateTime.parse(json['created_at']),
      updatedAt: DateTime.parse(json['updated_at']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'user_id': userId,
      'full_name': fullName,
      'email': email,
      'phone': phone,
      'role': role,
      'status': status,
      'is_active': isActive,
      'subscription_status': subscriptionStatus,
      'subscription_valid_until': subscriptionValidUntil?.toIso8601String(),
      'qr_code': qrCode,
      'created_at': createdAt.toIso8601String(),
      'updated_at': updatedAt.toIso8601String(),
    };
  }

  bool get isApproved => status == 'verified' && isActive;
  bool get isPending => status == 'pending';
  bool get isRejected => status == 'rejected';
  bool get isAdmin => role == 'admin';
  bool get isStudent => role == 'student';
}
```

### Step 7: Update Authentication Flow

Update your authentication provider to handle the new flow:

```dart
// providers/auth_provider.dart
class AuthProvider extends ChangeNotifier {
  LibraryUser? _currentUser;
  bool _isLoading = false;
  String? _errorMessage;

  LibraryUser? get currentUser => _currentUser;
  bool get isLoading => _isLoading;
  String? get errorMessage => _errorMessage;
  bool get isLoggedIn => _currentUser != null;
  bool get isAdmin => _currentUser?.isAdmin ?? false;

  // Registration method
  Future<bool> register({
    required String email,
    required String password,
    required String name,
    String? phone,
  }) async {
    _setLoading(true);
    _clearError();

    try {
      // Sign up with Supabase Auth
      final response = await SupabaseService.signUp(
        email: email,
        password: password,
        name: name,
        phone: phone,
      );

      if (response.user != null) {
        // Wait a moment for trigger to create profile
        await Future.delayed(Duration(seconds: 2));
        
        // Sign out immediately (user needs approval)
        await Supabase.instance.client.auth.signOut();
        
        _setLoading(false);
        return true;
      }
      
      throw Exception('Registration failed');
    } catch (e) {
      _setError('Registration failed: $e');
      _setLoading(false);
      return false;
    }
  }

  // Login method
  Future<bool> login(String email, String password) async {
    _setLoading(true);
    _clearError();

    try {
      // Sign in with Supabase Auth
      final response = await Supabase.instance.client.auth.signInWithPassword(
        email: email,
        password: password,
      );

      if (response.user != null) {
        // Get user profile
        final profileData = await SupabaseService.getUserProfile();
        
        if (profileData != null) {
          final user = LibraryUser.fromJson(profileData);
          
          // Check if user is approved
          if (!user.isApproved) {
            await Supabase.instance.client.auth.signOut();
            
            if (user.isPending) {
              _setError('Your account is pending admin approval.');
            } else if (user.isRejected) {
              _setError('Your account has been rejected.');
            } else {
              _setError('Your account is not active.');
            }
            
            _setLoading(false);
            return false;
          }
          
          _currentUser = user;
          _setLoading(false);
          notifyListeners();
          return true;
        }
      }
      
      throw Exception('Login failed');
    } catch (e) {
      _setError('Login failed: $e');
      _setLoading(false);
      return false;
    }
  }

  // Logout method
  Future<void> logout() async {
    await Supabase.instance.client.auth.signOut();
    _currentUser = null;
    _clearError();
    notifyListeners();
  }

  // Check authentication status on app start
  Future<void> checkAuthStatus() async {
    _setLoading(true);
    
    try {
      final session = Supabase.instance.client.auth.currentSession;
      
      if (session != null) {
        final profileData = await SupabaseService.getUserProfile();
        
        if (profileData != null) {
          final user = LibraryUser.fromJson(profileData);
          
          if (user.isApproved) {
            _currentUser = user;
          } else {
            await Supabase.instance.client.auth.signOut();
          }
        }
      }
    } catch (e) {
      await Supabase.instance.client.auth.signOut();
    }
    
    _setLoading(false);
    notifyListeners();
  }

  void _setLoading(bool loading) {
    _isLoading = loading;
    notifyListeners();
  }

  void _setError(String error) {
    _errorMessage = error;
    notifyListeners();
  }

  void _clearError() {
    _errorMessage = null;
    notifyListeners();
  }
}
```

## 🧪 Testing the Fixes

### 1. Test Database Changes

```sql
-- Test that the new fields were added
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'library_users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Test RLS policies
SELECT tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'library_users';

-- Test trigger function
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'handle_new_user';
```

### 2. Test Registration Flow

1. Register a new user through your Flutter app
2. Check that a record is created in `library_users` with `status = 'pending'`
3. Verify the user is signed out after registration

### 3. Test Admin Approval

1. Create an admin user manually:
```sql
-- Create admin user in library_users
INSERT INTO public.library_users (
  user_id, full_name, email, role, status, is_active
) VALUES (
  'YOUR_AUTH_USER_ID', 'Admin User', 'admin@library.com', 'admin', 'verified', true
);
```

2. Test approval functions:
```sql
-- Test approve function
SELECT public.approve_user('PENDING_USER_ID', 'ADMIN_USER_ID');
```

### 4. Test Login Flow

1. Try logging in with pending user (should fail)
2. Approve the user
3. Try logging in again (should succeed)

## 🚀 Deployment Steps

1. **Apply database changes** in your Supabase SQL Editor
2. **Update Flutter code** with the new service methods
3. **Test thoroughly** in development
4. **Deploy to production** when all tests pass

## 📝 Summary of Changes

✅ **Database**: Added missing fields to `library_users`  
✅ **RLS Policies**: Updated to reference `library_users`  
✅ **Trigger Functions**: Fixed to work with `library_users`  
✅ **Admin Functions**: Created approval/rejection workflow  
✅ **Flutter Code**: Updated to use correct table and fields  
✅ **Data Models**: Created proper `LibraryUser` model  
✅ **Authentication Flow**: Fixed login/registration logic  

## ⚠️ Important Notes

1. **Backup your database** before applying changes
2. **Test in development** before deploying to production
3. **Update all references** to `user_profiles` in your codebase
4. **Create at least one admin user** manually for testing
5. **Monitor logs** for any authentication errors

This approach maintains your existing database structure while adding the necessary functionality for a complete authentication system.