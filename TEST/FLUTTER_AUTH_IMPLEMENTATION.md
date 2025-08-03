# Flutter Authentication Implementation Guide

This guide shows how to implement the Flutter authentication system that works with the fixed database structure.

## 1. Data Models

### lib/models/library_user.dart
```dart
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
      role: json['role'],
      status: json['status'],
      isActive: json['is_active'],
      subscriptionStatus: json['subscription_status'],
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

  bool get isPending => status == 'pending';
  bool get isVerified => status == 'verified';
  bool get isRejected => status == 'rejected';
  bool get isAdmin => role == 'admin';
  bool get isStudent => role == 'student';
}
```

## 2. Supabase Service

### lib/services/supabase_service.dart
```dart
import 'package:supabase_flutter/supabase_flutter.dart';
import '../models/library_user.dart';

class SupabaseService {
  static final SupabaseClient _client = Supabase.instance.client;
  
  // Get current user
  static User? get currentUser => _client.auth.currentUser;
  
  // Get auth state stream
  static Stream<AuthState> get authStateChanges => _client.auth.onAuthStateChange;

  // Sign up new user
  static Future<AuthResponse> signUp({
    required String email,
    required String password,
    required String fullName,
    String? phone,
  }) async {
    try {
      final response = await _client.auth.signUp(
        email: email,
        password: password,
        data: {
          'name': fullName,
          'phone': phone,
        },
      );
      
      return response;
    } catch (e) {
      rethrow;
    }
  }

  // Sign in user
  static Future<AuthResponse> signIn({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _client.auth.signInWithPassword(
        email: email,
        password: password,
      );
      
      return response;
    } catch (e) {
      rethrow;
    }
  }

  // Sign out
  static Future<void> signOut() async {
    await _client.auth.signOut();
  }

  // Get user profile
  static Future<LibraryUser?> getUserProfile([String? userId]) async {
    try {
      final targetUserId = userId ?? currentUser?.id;
      if (targetUserId == null) return null;

      final response = await _client
          .from('library_users')
          .select()
          .eq('user_id', targetUserId)
          .single();

      return LibraryUser.fromJson(response);
    } catch (e) {
      print('Error getting user profile: $e');
      return null;
    }
  }

  // Update user profile
  static Future<bool> updateUserProfile({
    required String userId,
    String? fullName,
    String? phone,
  }) async {
    try {
      final updates = <String, dynamic>{};
      if (fullName != null) updates['full_name'] = fullName;
      if (phone != null) updates['phone'] = phone;
      updates['updated_at'] = DateTime.now().toIso8601String();

      await _client
          .from('library_users')
          .update(updates)
          .eq('user_id', userId);

      return true;
    } catch (e) {
      print('Error updating user profile: $e');
      return false;
    }
  }

  // Check if user is approved
  static Future<bool> isUserApproved([String? userId]) async {
    try {
      final profile = await getUserProfile(userId);
      return profile?.isVerified == true && profile?.isActive == true;
    } catch (e) {
      return false;
    }
  }

  // Admin functions
  static Future<List<LibraryUser>> getPendingUsers() async {
    try {
      final response = await _client
          .from('pending_users')
          .select();

      return response.map<LibraryUser>((json) => LibraryUser.fromJson(json)).toList();
    } catch (e) {
      print('Error getting pending users: $e');
      return [];
    }
  }

  static Future<bool> approveUser(String userId) async {
    try {
      final currentUserId = currentUser?.id;
      if (currentUserId == null) return false;

      await _client.rpc('approve_user', params: {
        'user_id': userId,
        'admin_id': currentUserId,
      });

      return true;
    } catch (e) {
      print('Error approving user: $e');
      return false;
    }
  }

  static Future<bool> rejectUser(String userId, String reason) async {
    try {
      final currentUserId = currentUser?.id;
      if (currentUserId == null) return false;

      await _client.rpc('reject_user', params: {
        'user_id': userId,
        'reason': reason,
        'admin_id': currentUserId,
      });

      return true;
    } catch (e) {
      print('Error rejecting user: $e');
      return false;
    }
  }

  static Future<List<LibraryUser>> getAllUsers() async {
    try {
      final response = await _client
          .from('all_users_admin')
          .select();

      return response.map<LibraryUser>((json) => LibraryUser.fromJson(json)).toList();
    } catch (e) {
      print('Error getting all users: $e');
      return [];
    }
  }
}
```

## 3. Authentication Provider

### lib/providers/auth_provider.dart
```dart
import 'package:flutter/material.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import '../services/supabase_service.dart';
import '../models/library_user.dart';

enum AuthStatus {
  initial,
  loading,
  authenticated,
  unauthenticated,
  pending,
  rejected,
}

class AuthProvider extends ChangeNotifier {
  AuthStatus _status = AuthStatus.initial;
  LibraryUser? _user;
  String? _errorMessage;

  AuthStatus get status => _status;
  LibraryUser? get user => _user;
  String? get errorMessage => _errorMessage;
  bool get isAuthenticated => _status == AuthStatus.authenticated;
  bool get isPending => _status == AuthStatus.pending;
  bool get isRejected => _status == AuthStatus.rejected;

  AuthProvider() {
    _initializeAuth();
  }

  void _initializeAuth() {
    SupabaseService.authStateChanges.listen((AuthState state) {
      _handleAuthStateChange(state);
    });
    
    // Check initial auth state
    _checkInitialAuthState();
  }

  Future<void> _checkInitialAuthState() async {
    final user = SupabaseService.currentUser;
    if (user != null) {
      await _loadUserProfile(user.id);
    } else {
      _setStatus(AuthStatus.unauthenticated);
    }
  }

  void _handleAuthStateChange(AuthState state) async {
    if (state.event == AuthChangeEvent.signedIn && state.session?.user != null) {
      await _loadUserProfile(state.session!.user.id);
    } else if (state.event == AuthChangeEvent.signedOut) {
      _user = null;
      _setStatus(AuthStatus.unauthenticated);
    }
  }

  Future<void> _loadUserProfile(String userId) async {
    try {
      final profile = await SupabaseService.getUserProfile(userId);
      
      if (profile == null) {
        _setStatus(AuthStatus.unauthenticated);
        return;
      }

      _user = profile;
      
      if (profile.isPending) {
        _setStatus(AuthStatus.pending);
      } else if (profile.isRejected) {
        _setStatus(AuthStatus.rejected);
      } else if (profile.isVerified && profile.isActive) {
        _setStatus(AuthStatus.authenticated);
      } else {
        _setStatus(AuthStatus.unauthenticated);
      }
    } catch (e) {
      _setError('Failed to load user profile: $e');
      _setStatus(AuthStatus.unauthenticated);
    }
  }

  Future<bool> signUp({
    required String email,
    required String password,
    required String fullName,
    String? phone,
  }) async {
    try {
      _setStatus(AuthStatus.loading);
      _clearError();

      final response = await SupabaseService.signUp(
        email: email,
        password: password,
        fullName: fullName,
        phone: phone,
      );

      if (response.user != null) {
        // Sign out immediately after registration since user needs approval
        await SupabaseService.signOut();
        _setStatus(AuthStatus.pending);
        return true;
      } else {
        _setError('Registration failed');
        _setStatus(AuthStatus.unauthenticated);
        return false;
      }
    } catch (e) {
      _setError('Registration failed: $e');
      _setStatus(AuthStatus.unauthenticated);
      return false;
    }
  }

  Future<bool> signIn({
    required String email,
    required String password,
  }) async {
    try {
      _setStatus(AuthStatus.loading);
      _clearError();

      final response = await SupabaseService.signIn(
        email: email,
        password: password,
      );

      if (response.user != null) {
        // Profile will be loaded automatically by auth state change
        return true;
      } else {
        _setError('Login failed');
        _setStatus(AuthStatus.unauthenticated);
        return false;
      }
    } catch (e) {
      _setError('Login failed: $e');
      _setStatus(AuthStatus.unauthenticated);
      return false;
    }
  }

  Future<void> signOut() async {
    try {
      await SupabaseService.signOut();
      _user = null;
      _setStatus(AuthStatus.unauthenticated);
    } catch (e) {
      _setError('Sign out failed: $e');
    }
  }

  Future<bool> updateProfile({
    String? fullName,
    String? phone,
  }) async {
    try {
      if (_user == null) return false;

      final success = await SupabaseService.updateUserProfile(
        userId: _user!.userId,
        fullName: fullName,
        phone: phone,
      );

      if (success) {
        await _loadUserProfile(_user!.userId);
      }

      return success;
    } catch (e) {
      _setError('Profile update failed: $e');
      return false;
    }
  }

  void _setStatus(AuthStatus status) {
    _status = status;
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

## 4. Registration Screen

### lib/screens/register_screen.dart
```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class RegisterScreen extends StatefulWidget {
  @override
  _RegisterScreenState createState() => _RegisterScreenState();
}

class _RegisterScreenState extends State<RegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();
  final _fullNameController = TextEditingController();
  final _phoneController = TextEditingController();
  bool _obscurePassword = true;
  bool _obscureConfirmPassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    _confirmPasswordController.dispose();
    _fullNameController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Register'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
      ),
      body: Consumer<AuthProvider>(
        builder: (context, authProvider, child) {
          if (authProvider.status == AuthStatus.loading) {
            return Center(child: CircularProgressIndicator());
          }

          if (authProvider.status == AuthStatus.pending) {
            return _buildPendingApprovalWidget();
          }

          return _buildRegistrationForm(authProvider);
        },
      ),
    );
  }

  Widget _buildPendingApprovalWidget() {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.hourglass_empty,
              size: 80,
              color: Colors.orange,
            ),
            SizedBox(height: 24),
            Text(
              'Registration Successful!',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.green,
              ),
            ),
            SizedBox(height: 16),
            Text(
              'Your account is pending approval by an administrator. You will be notified once your account is approved.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16),
            ),
            SizedBox(height: 32),
            ElevatedButton(
              onPressed: () {
                Navigator.of(context).pushReplacementNamed('/login');
              },
              child: Text('Go to Login'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRegistrationForm(AuthProvider authProvider) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(24.0),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(height: 32),
            Text(
              'Create Account',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 32),
            
            // Full Name Field
            TextFormField(
              controller: _fullNameController,
              decoration: InputDecoration(
                labelText: 'Full Name',
                prefixIcon: Icon(Icons.person),
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Please enter your full name';
                }
                return null;
              },
            ),
            SizedBox(height: 16),
            
            // Email Field
            TextFormField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                labelText: 'Email',
                prefixIcon: Icon(Icons.email),
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Please enter your email';
                }
                if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                  return 'Please enter a valid email';
                }
                return null;
              },
            ),
            SizedBox(height: 16),
            
            // Phone Field
            TextFormField(
              controller: _phoneController,
              keyboardType: TextInputType.phone,
              decoration: InputDecoration(
                labelText: 'Phone Number (Optional)',
                prefixIcon: Icon(Icons.phone),
                border: OutlineInputBorder(),
              ),
            ),
            SizedBox(height: 16),
            
            // Password Field
            TextFormField(
              controller: _passwordController,
              obscureText: _obscurePassword,
              decoration: InputDecoration(
                labelText: 'Password',
                prefixIcon: Icon(Icons.lock),
                suffixIcon: IconButton(
                  icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off),
                  onPressed: () {
                    setState(() {
                      _obscurePassword = !_obscurePassword;
                    });
                  },
                ),
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter a password';
                }
                if (value.length < 6) {
                  return 'Password must be at least 6 characters';
                }
                return null;
              },
            ),
            SizedBox(height: 16),
            
            // Confirm Password Field
            TextFormField(
              controller: _confirmPasswordController,
              obscureText: _obscureConfirmPassword,
              decoration: InputDecoration(
                labelText: 'Confirm Password',
                prefixIcon: Icon(Icons.lock_outline),
                suffixIcon: IconButton(
                  icon: Icon(_obscureConfirmPassword ? Icons.visibility : Icons.visibility_off),
                  onPressed: () {
                    setState(() {
                      _obscureConfirmPassword = !_obscureConfirmPassword;
                    });
                  },
                ),
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value != _passwordController.text) {
                  return 'Passwords do not match';
                }
                return null;
              },
            ),
            SizedBox(height: 24),
            
            // Error Message
            if (authProvider.errorMessage != null)
              Container(
                padding: EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade100,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade300),
                ),
                child: Text(
                  authProvider.errorMessage!,
                  style: TextStyle(color: Colors.red.shade700),
                ),
              ),
            if (authProvider.errorMessage != null) SizedBox(height: 16),
            
            // Register Button
            ElevatedButton(
              onPressed: _handleRegister,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
                padding: EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: Text(
                'Register',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
            SizedBox(height: 16),
            
            // Login Link
            TextButton(
              onPressed: () {
                Navigator.of(context).pushReplacementNamed('/login');
              },
              child: Text('Already have an account? Login'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleRegister() async {
    if (!_formKey.currentState!.validate()) return;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    
    final success = await authProvider.signUp(
      email: _emailController.text.trim(),
      password: _passwordController.text,
      fullName: _fullNameController.text.trim(),
      phone: _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
    );

    if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.errorMessage ?? 'Registration failed'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}
```

## 5. Login Screen

### lib/screens/login_screen.dart
```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../providers/auth_provider.dart';

class LoginScreen extends StatefulWidget {
  @override
  _LoginScreenState createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  bool _obscurePassword = true;

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Login'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
      ),
      body: Consumer<AuthProvider>(
        builder: (context, authProvider, child) {
          if (authProvider.status == AuthStatus.loading) {
            return Center(child: CircularProgressIndicator());
          }

          if (authProvider.status == AuthStatus.pending) {
            return _buildPendingWidget();
          }

          if (authProvider.status == AuthStatus.rejected) {
            return _buildRejectedWidget();
          }

          return _buildLoginForm(authProvider);
        },
      ),
    );
  }

  Widget _buildPendingWidget() {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.hourglass_empty,
              size: 80,
              color: Colors.orange,
            ),
            SizedBox(height: 24),
            Text(
              'Account Pending Approval',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.orange,
              ),
            ),
            SizedBox(height: 16),
            Text(
              'Your account is still pending approval by an administrator. Please wait for approval before accessing the app.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16),
            ),
            SizedBox(height: 32),
            ElevatedButton(
              onPressed: () {
                Provider.of<AuthProvider>(context, listen: false).signOut();
              },
              child: Text('Back to Login'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildRejectedWidget() {
    return Center(
      child: Padding(
        padding: EdgeInsets.all(24.0),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.cancel,
              size: 80,
              color: Colors.red,
            ),
            SizedBox(height: 24),
            Text(
              'Account Rejected',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
                color: Colors.red,
              ),
            ),
            SizedBox(height: 16),
            Text(
              'Your account has been rejected by an administrator. Please contact support for more information.',
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 16),
            ),
            SizedBox(height: 32),
            ElevatedButton(
              onPressed: () {
                Provider.of<AuthProvider>(context, listen: false).signOut();
              },
              child: Text('Back to Login'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildLoginForm(AuthProvider authProvider) {
    return SingleChildScrollView(
      padding: EdgeInsets.all(24.0),
      child: Form(
        key: _formKey,
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            SizedBox(height: 64),
            
            // App Logo/Title
            Icon(
              Icons.library_books,
              size: 80,
              color: Colors.blue,
            ),
            SizedBox(height: 16),
            Text(
              'Library Management',
              style: TextStyle(
                fontSize: 28,
                fontWeight: FontWeight.bold,
                color: Colors.blue,
              ),
              textAlign: TextAlign.center,
            ),
            SizedBox(height: 48),
            
            // Email Field
            TextFormField(
              controller: _emailController,
              keyboardType: TextInputType.emailAddress,
              decoration: InputDecoration(
                labelText: 'Email',
                prefixIcon: Icon(Icons.email),
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.trim().isEmpty) {
                  return 'Please enter your email';
                }
                if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
                  return 'Please enter a valid email';
                }
                return null;
              },
            ),
            SizedBox(height: 16),
            
            // Password Field
            TextFormField(
              controller: _passwordController,
              obscureText: _obscurePassword,
              decoration: InputDecoration(
                labelText: 'Password',
                prefixIcon: Icon(Icons.lock),
                suffixIcon: IconButton(
                  icon: Icon(_obscurePassword ? Icons.visibility : Icons.visibility_off),
                  onPressed: () {
                    setState(() {
                      _obscurePassword = !_obscurePassword;
                    });
                  },
                ),
                border: OutlineInputBorder(),
              ),
              validator: (value) {
                if (value == null || value.isEmpty) {
                  return 'Please enter your password';
                }
                return null;
              },
            ),
            SizedBox(height: 24),
            
            // Error Message
            if (authProvider.errorMessage != null)
              Container(
                padding: EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.red.shade100,
                  borderRadius: BorderRadius.circular(8),
                  border: Border.all(color: Colors.red.shade300),
                ),
                child: Text(
                  authProvider.errorMessage!,
                  style: TextStyle(color: Colors.red.shade700),
                ),
              ),
            if (authProvider.errorMessage != null) SizedBox(height: 16),
            
            // Login Button
            ElevatedButton(
              onPressed: _handleLogin,
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.blue,
                foregroundColor: Colors.white,
                padding: EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: Text(
                'Login',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
            ),
            SizedBox(height: 16),
            
            // Register Link
            TextButton(
              onPressed: () {
                Navigator.of(context).pushReplacementNamed('/register');
              },
              child: Text('Don\'t have an account? Register'),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _handleLogin() async {
    if (!_formKey.currentState!.validate()) return;

    final authProvider = Provider.of<AuthProvider>(context, listen: false);
    
    final success = await authProvider.signIn(
      email: _emailController.text.trim(),
      password: _passwordController.text,
    );

    if (success && mounted) {
      Navigator.of(context).pushReplacementNamed('/home');
    } else if (!success && mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(authProvider.errorMessage ?? 'Login failed'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}
```

## 6. Admin Approval Screen

### lib/screens/admin/pending_users_screen.dart
```dart
import 'package:flutter/material.dart';
import '../../services/supabase_service.dart';
import '../../models/library_user.dart';

class PendingUsersScreen extends StatefulWidget {
  @override
  _PendingUsersScreenState createState() => _PendingUsersScreenState();
}

class _PendingUsersScreenState extends State<PendingUsersScreen> {
  List<LibraryUser> _pendingUsers = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadPendingUsers();
  }

  Future<void> _loadPendingUsers() async {
    setState(() {
      _isLoading = true;
    });

    try {
      final users = await SupabaseService.getPendingUsers();
      setState(() {
        _pendingUsers = users;
        _isLoading = false;
      });
    } catch (e) {
      setState(() {
        _isLoading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error loading pending users: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Pending Users'),
        backgroundColor: Colors.orange,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: Icon(Icons.refresh),
            onPressed: _loadPendingUsers,
          ),
        ],
      ),
      body: _isLoading
          ? Center(child: CircularProgressIndicator())
          : _pendingUsers.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(
                        Icons.check_circle,
                        size: 80,
                        color: Colors.green,
                      ),
                      SizedBox(height: 16),
                      Text(
                        'No Pending Users',
                        style: TextStyle(
                          fontSize: 24,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      SizedBox(height: 8),
                      Text(
                        'All users have been processed',
                        style: TextStyle(
                          fontSize: 16,
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: EdgeInsets.all(16),
                  itemCount: _pendingUsers.length,
                  itemBuilder: (context, index) {
                    final user = _pendingUsers[index];
                    return _buildUserCard(user);
                  },
                ),
    );
  }

  Widget _buildUserCard(LibraryUser user) {
    return Card(
      margin: EdgeInsets.only(bottom: 16),
      elevation: 4,
      child: Padding(
        padding: EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                CircleAvatar(
                  backgroundColor: Colors.orange,
                  child: Text(
                    user.fullName.isNotEmpty ? user.fullName[0].toUpperCase() : 'U',
                    style: TextStyle(
                      color: Colors.white,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user.fullName,
                        style: TextStyle(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      Text(
                        user.email ?? 'No email',
                        style: TextStyle(
                          color: Colors.grey[600],
                        ),
                      ),
                    ],
                  ),
                ),
                Container(
                  padding: EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.orange.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    'PENDING',
                    style: TextStyle(
                      color: Colors.orange.shade700,
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                ),
              ],
            ),
            SizedBox(height: 12),
            if (user.phone != null && user.phone!.isNotEmpty)
              Row(
                children: [
                  Icon(Icons.phone, size: 16, color: Colors.grey[600]),
                  SizedBox(width: 8),
                  Text(
                    user.phone!,
                    style: TextStyle(color: Colors.grey[600]),
                  ),
                ],
              ),
            SizedBox(height: 8),
            Row(
              children: [
                Icon(Icons.calendar_today, size: 16, color: Colors.grey[600]),
                SizedBox(width: 8),
                Text(
                  'Registered: ${_formatDate(user.createdAt)}',
                  style: TextStyle(color: Colors.grey[600]),
                ),
              ],
            ),
            SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _approveUser(user),
                    icon: Icon(Icons.check),
                    label: Text('Approve'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
                SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _rejectUser(user),
                    icon: Icon(Icons.close),
                    label: Text('Reject'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.red,
                      foregroundColor: Colors.white,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _approveUser(LibraryUser user) async {
    try {
      final success = await SupabaseService.approveUser(user.userId);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('User ${user.fullName} approved successfully'),
            backgroundColor: Colors.green,
          ),
        );
        _loadPendingUsers(); // Refresh the list
      } else {
        throw Exception('Failed to approve user');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error approving user: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _rejectUser(LibraryUser user) async {
    final reason = await _showRejectDialog();
    if (reason == null) return;

    try {
      final success = await SupabaseService.rejectUser(user.userId, reason);
      if (success) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('User ${user.fullName} rejected'),
            backgroundColor: Colors.orange,
          ),
        );
        _loadPendingUsers(); // Refresh the list
      } else {
        throw Exception('Failed to reject user');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Error rejecting user: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<String?> _showRejectDialog() async {
    final controller = TextEditingController();
    return showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Reject User'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text('Please provide a reason for rejecting this user:'),
            SizedBox(height: 16),
            TextField(
              controller: controller,
              decoration: InputDecoration(
                hintText: 'Reason for rejection',
                border: OutlineInputBorder(),
              ),
              maxLines: 3,
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: Text('Cancel'),
          ),
          ElevatedButton(
            onPressed: () {
              final reason = controller.text.trim();
              if (reason.isNotEmpty) {
                Navigator.of(context).pop(reason);
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: Colors.red,
              foregroundColor: Colors.white,
            ),
            child: Text('Reject'),
          ),
        ],
      ),
    );
  }

  String _formatDate(DateTime date) {
    return '${date.day}/${date.month}/${date.year}';
  }
}
```

## 7. Main App Setup

### lib/main.dart
```dart
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:supabase_flutter/supabase_flutter.dart';
import 'providers/auth_provider.dart';
import 'screens/login_screen.dart';
import 'screens/register_screen.dart';
import 'screens/home_screen.dart';
import 'screens/admin/pending_users_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  await Supabase.initialize(
    url: 'YOUR_SUPABASE_URL',
    anonKey: 'YOUR_SUPABASE_ANON_KEY',
  );
  
  runApp(MyApp());
}

class MyApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
      ],
      child: MaterialApp(
        title: 'Library Management',
        theme: ThemeData(
          primarySwatch: Colors.blue,
          visualDensity: VisualDensity.adaptivePlatformDensity,
        ),
        home: AuthWrapper(),
        routes: {
          '/login': (context) => LoginScreen(),
          '/register': (context) => RegisterScreen(),
          '/home': (context) => HomeScreen(),
          '/admin/pending': (context) => PendingUsersScreen(),
        },
      ),
    );
  }
}

class AuthWrapper extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Consumer<AuthProvider>(
      builder: (context, authProvider, child) {
        switch (authProvider.status) {
          case AuthStatus.initial:
          case AuthStatus.loading:
            return Scaffold(
              body: Center(
                child: CircularProgressIndicator(),
              ),
            );
          case AuthStatus.authenticated:
            return HomeScreen();
          case AuthStatus.pending:
          case AuthStatus.rejected:
          case AuthStatus.unauthenticated:
          default:
            return LoginScreen();
        }
      },
    );
  }
}
```

## Implementation Steps

1. **Run the SQL script**: Execute `fix_authentication_system.sql` in your Supabase SQL Editor
2. **Update pubspec.yaml**: Add required dependencies
3. **Create the data models**: Implement `LibraryUser` model
4. **Create services**: Implement `SupabaseService` with all authentication methods
5. **Create providers**: Implement `AuthProvider` for state management
6. **Create screens**: Implement login, register, and admin screens
7. **Update main.dart**: Set up providers and routing
8. **Test the flow**: Test registration, admin approval, and login

## Key Features

- ✅ User registration with pending approval
- ✅ Admin approval/rejection workflow
- ✅ Secure authentication with RLS
- ✅ Role-based access control
- ✅ Error handling and user feedback
- ✅ Responsive UI design
- ✅ State management with Provider

This implementation provides a complete, working authentication system that matches your existing database structure!