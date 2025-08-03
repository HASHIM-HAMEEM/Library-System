# Flutter Mobile App - Database Integration Documentation

## Overview
This documentation covers the database integration for the Flutter mobile application, including user registration, data fetching, and admin approval workflows.

## Database Schema

### Core Tables

#### 1. `auth.users` (Supabase Auth)
- **Purpose**: Handles authentication and user credentials
- **Key Fields**:
  - `id` (UUID): Primary key, auto-generated
  - `email` (String): User's email address
  - `encrypted_password` (String): Hashed password
  - `email_confirmed_at` (Timestamp): Email verification status
  - `created_at` (Timestamp): Account creation time

#### 2. `library_users` (Public Schema)
- **Purpose**: Stores library-specific user information
- **Key Fields**:
  - `id` (UUID): Primary key, references `auth.users.id`
  - `full_name` (String): User's full name
  - `student_id` (String): Unique student identifier
  - `phone_number` (String): Contact number
  - `status` (Enum): `pending`, `approved`, `rejected`
  - `approved_by` (UUID): References admin who approved
  - `approved_at` (Timestamp): Approval timestamp
  - `created_at` (Timestamp): Registration time

#### 3. `qr_codes` (Public Schema)
- **Purpose**: Manages QR codes for library access
- **Key Fields**:
  - `id` (UUID): Primary key
  - `user_id` (UUID): References `library_users.id`
  - `qr_code_data` (String): Encrypted QR code content
  - `is_active` (Boolean): QR code status
  - `expires_at` (Timestamp): Expiration time
  - `created_at` (Timestamp): Creation time

#### 4. `entry_exit_logs` (Public Schema)
- **Purpose**: Tracks library entry/exit activities
- **Key Fields**:
  - `id` (UUID): Primary key
  - `user_id` (UUID): References `library_users.id`
  - `action_type` (Enum): `entry`, `exit`
  - `timestamp` (Timestamp): Action time
  - `scanned_by` (UUID): Admin who scanned

## Flutter Integration

### 1. Supabase Client Setup

```dart
// lib/services/supabase_service.dart
import 'package:supabase_flutter/supabase_flutter.dart';

class SupabaseService {
  static const String supabaseUrl = 'YOUR_SUPABASE_URL';
  static const String supabaseAnonKey = 'YOUR_SUPABASE_ANON_KEY';
  
  static late SupabaseClient client;
  
  static Future<void> initialize() async {
    await Supabase.initialize(
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
    );
    client = Supabase.instance.client;
  }
  
  static SupabaseClient get instance => client;
}
```

### 2. User Registration Flow

#### Step 1: Authentication Registration

```dart
// lib/services/auth_service.dart
class AuthService {
  static final _client = SupabaseService.instance;
  
  static Future<AuthResponse> registerUser({
    required String email,
    required String password,
  }) async {
    try {
      final response = await _client.auth.signUp(
        email: email,
        password: password,
      );
      
      if (response.user != null) {
        print('User registered successfully: ${response.user!.id}');
      }
      
      return response;
    } catch (e) {
      print('Registration error: $e');
      rethrow;
    }
  }
}
```

#### Step 2: Library User Profile Creation

```dart
// lib/services/user_service.dart
class UserService {
  static final _client = SupabaseService.instance;
  
  static Future<Map<String, dynamic>?> createLibraryUser({
    required String userId,
    required String fullName,
    required String studentId,
    required String phoneNumber,
  }) async {
    try {
      final response = await _client
          .from('library_users')
          .insert({
            'id': userId,
            'full_name': fullName,
            'student_id': studentId,
            'phone_number': phoneNumber,
            'status': 'pending', // Default status
          })
          .select()
          .single();
      
      print('Library user created: $response');
      return response;
    } catch (e) {
      print('Error creating library user: $e');
      return null;
    }
  }
}
```

#### Complete Registration Process

```dart
// lib/screens/registration_screen.dart
class RegistrationScreen extends StatefulWidget {
  @override
  _RegistrationScreenState createState() => _RegistrationScreenState();
}

class _RegistrationScreenState extends State<RegistrationScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _fullNameController = TextEditingController();
  final _studentIdController = TextEditingController();
  final _phoneController = TextEditingController();
  
  Future<void> _registerUser() async {
    if (!_formKey.currentState!.validate()) return;
    
    try {
      // Step 1: Register authentication user
      final authResponse = await AuthService.registerUser(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );
      
      if (authResponse.user == null) {
        throw Exception('Failed to create auth user');
      }
      
      // Step 2: Create library user profile
      final libraryUser = await UserService.createLibraryUser(
        userId: authResponse.user!.id,
        fullName: _fullNameController.text.trim(),
        studentId: _studentIdController.text.trim(),
        phoneNumber: _phoneController.text.trim(),
      );
      
      if (libraryUser != null) {
        // Registration successful
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Registration successful! Awaiting admin approval.'),
            backgroundColor: Colors.green,
          ),
        );
        
        // Navigate to pending approval screen
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (context) => PendingApprovalScreen(),
          ),
        );
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text('Registration failed: $e'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }
}
```

### 3. Fetching User Data from Database

#### Get Current User Profile

```dart
// lib/services/user_service.dart (continued)
class UserService {
  static Future<Map<String, dynamic>?> getCurrentUserProfile() async {
    try {
      final user = _client.auth.currentUser;
      if (user == null) return null;
      
      final response = await _client
          .from('library_users')
          .select('*')
          .eq('id', user.id)
          .single();
      
      return response;
    } catch (e) {
      print('Error fetching user profile: $e');
      return null;
    }
  }
  
  static Future<List<Map<String, dynamic>>> getPendingUsers() async {
    try {
      final response = await _client
          .from('library_users')
          .select('*')
          .eq('status', 'pending')
          .order('created_at', ascending: false);
      
      return List<Map<String, dynamic>>.from(response);
    } catch (e) {
      print('Error fetching pending users: $e');
      return [];
    }
  }
  
  static Future<Map<String, dynamic>?> getUserQRCode(String userId) async {
    try {
      final response = await _client
          .from('qr_codes')
          .select('*')
          .eq('user_id', userId)
          .eq('is_active', true)
          .maybeSingle();
      
      return response;
    } catch (e) {
      print('Error fetching QR code: $e');
      return null;
    }
  }
}
```

#### Real-time Data Subscription

```dart
// lib/services/realtime_service.dart
class RealtimeService {
  static final _client = SupabaseService.instance;
  
  static Stream<List<Map<String, dynamic>>> watchUserStatus(String userId) {
    return _client
        .from('library_users')
        .stream(primaryKey: ['id'])
        .eq('id', userId)
        .map((data) => List<Map<String, dynamic>>.from(data));
  }
  
  static Stream<List<Map<String, dynamic>>> watchPendingUsers() {
    return _client
        .from('library_users')
        .stream(primaryKey: ['id'])
        .eq('status', 'pending')
        .order('created_at', ascending: false)
        .map((data) => List<Map<String, dynamic>>.from(data));
  }
}
```

### 4. Admin Approval System

#### Admin Service for User Management

```dart
// lib/services/admin_service.dart
class AdminService {
  static final _client = SupabaseService.instance;
  
  static Future<bool> approveUser({
    required String userId,
    required String adminId,
  }) async {
    try {
      await _client
          .from('library_users')
          .update({
            'status': 'approved',
            'approved_by': adminId,
            'approved_at': DateTime.now().toIso8601String(),
          })
          .eq('id', userId);
      
      // Generate QR code for approved user
      await _generateQRCodeForUser(userId);
      
      return true;
    } catch (e) {
      print('Error approving user: $e');
      return false;
    }
  }
  
  static Future<bool> rejectUser({
    required String userId,
    required String adminId,
  }) async {
    try {
      await _client
          .from('library_users')
          .update({
            'status': 'rejected',
            'approved_by': adminId,
            'approved_at': DateTime.now().toIso8601String(),
          })
          .eq('id', userId);
      
      return true;
    } catch (e) {
      print('Error rejecting user: $e');
      return false;
    }
  }
  
  static Future<void> _generateQRCodeForUser(String userId) async {
    try {
      // Generate unique QR code data
      final qrData = 'LIBRARY_ACCESS_${userId}_${DateTime.now().millisecondsSinceEpoch}';
      
      await _client
          .from('qr_codes')
          .insert({
            'user_id': userId,
            'qr_code_data': qrData,
            'is_active': true,
            'expires_at': DateTime.now().add(Duration(days: 365)).toIso8601String(),
          });
    } catch (e) {
      print('Error generating QR code: $e');
    }
  }
}
```

### 5. User Status Monitoring

#### Pending Approval Screen

```dart
// lib/screens/pending_approval_screen.dart
class PendingApprovalScreen extends StatefulWidget {
  @override
  _PendingApprovalScreenState createState() => _PendingApprovalScreenState();
}

class _PendingApprovalScreenState extends State<PendingApprovalScreen> {
  StreamSubscription? _statusSubscription;
  
  @override
  void initState() {
    super.initState();
    _listenToStatusChanges();
  }
  
  void _listenToStatusChanges() {
    final user = SupabaseService.instance.auth.currentUser;
    if (user == null) return;
    
    _statusSubscription = RealtimeService.watchUserStatus(user.id).listen(
      (data) {
        if (data.isNotEmpty) {
          final userStatus = data.first['status'];
          
          if (userStatus == 'approved') {
            Navigator.pushReplacement(
              context,
              MaterialPageRoute(
                builder: (context) => UserDashboardScreen(),
              ),
            );
          } else if (userStatus == 'rejected') {
            _showRejectionDialog();
          }
        }
      },
    );
  }
  
  void _showRejectionDialog() {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('Application Rejected'),
        content: Text('Your library access application has been rejected. Please contact the administrator for more information.'),
        actions: [
          TextButton(
            onPressed: () {
              Navigator.of(context).pop();
              // Navigate to login or registration screen
            },
            child: Text('OK'),
          ),
        ],
      ),
    );
  }
  
  @override
  void dispose() {
    _statusSubscription?.cancel();
    super.dispose();
  }
}
```

## Security Considerations

### Row Level Security (RLS) Policies

The database uses RLS policies to ensure data security:

1. **library_users table**:
   - Users can only read their own profile
   - Only admins can update user status
   - Admins can read all user profiles

2. **qr_codes table**:
   - Users can only access their own QR codes
   - Admins can read all QR codes

3. **entry_exit_logs table**:
   - Users can read their own logs
   - Admins can read all logs

### Data Validation

```dart
// lib/utils/validators.dart
class Validators {
  static String? validateEmail(String? value) {
    if (value == null || value.isEmpty) {
      return 'Email is required';
    }
    if (!RegExp(r'^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$').hasMatch(value)) {
      return 'Enter a valid email';
    }
    return null;
  }
  
  static String? validateStudentId(String? value) {
    if (value == null || value.isEmpty) {
      return 'Student ID is required';
    }
    if (value.length < 6) {
      return 'Student ID must be at least 6 characters';
    }
    return null;
  }
  
  static String? validatePhoneNumber(String? value) {
    if (value == null || value.isEmpty) {
      return 'Phone number is required';
    }
    if (!RegExp(r'^[\+]?[1-9][\d]{1,14}$').hasMatch(value)) {
      return 'Enter a valid phone number';
    }
    return null;
  }
}
```

## Error Handling

### Custom Exception Classes

```dart
// lib/exceptions/app_exceptions.dart
class AppException implements Exception {
  final String message;
  final String? code;
  
  AppException(this.message, {this.code});
  
  @override
  String toString() => 'AppException: $message';
}

class DatabaseException extends AppException {
  DatabaseException(String message, {String? code}) 
      : super(message, code: code);
}

class AuthException extends AppException {
  AuthException(String message, {String? code}) 
      : super(message, code: code);
}
```

### Error Handling Service

```dart
// lib/services/error_service.dart
class ErrorService {
  static void handleError(dynamic error, {String? context}) {
    String message = 'An unexpected error occurred';
    
    if (error is PostgrestException) {
      message = 'Database error: ${error.message}';
    } else if (error is AuthException) {
      message = 'Authentication error: ${error.message}';
    } else if (error is AppException) {
      message = error.message;
    }
    
    print('Error in $context: $message');
    
    // Log to crash analytics service
    // FirebaseCrashlytics.instance.recordError(error, stackTrace);
  }
}
```

## Testing

### Unit Tests for Services

```dart
// test/services/user_service_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:mockito/mockito.dart';

void main() {
  group('UserService Tests', () {
    test('should create library user successfully', () async {
      // Mock Supabase client
      // Test user creation logic
    });
    
    test('should handle user creation errors', () async {
      // Test error scenarios
    });
  });
}
```

## Deployment Considerations

1. **Environment Configuration**:
   - Use different Supabase projects for development, staging, and production
   - Store sensitive keys in secure environment variables

2. **Database Migrations**:
   - Use Supabase CLI for managing database schema changes
   - Test migrations in staging environment first

3. **Performance Optimization**:
   - Implement proper indexing on frequently queried columns
   - Use pagination for large data sets
   - Cache user profiles locally when appropriate

## Conclusion

This documentation provides a comprehensive guide for integrating Flutter mobile applications with the library management database. The system ensures secure user registration, efficient data fetching, and proper admin approval workflows while maintaining data integrity and security through RLS policies and proper error handling.