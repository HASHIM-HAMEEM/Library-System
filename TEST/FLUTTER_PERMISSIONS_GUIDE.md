# Flutter App Permissions Guide

## Required Permissions for Library Management System

This document outlines all permissions required for the Flutter mobile app to function properly with the Firebase backend.

## 🔐 Firebase Authentication Permissions

### Required Setup:
```dart
// Add to pubspec.yaml
dependencies:
  firebase_auth: ^4.15.3
  firebase_core: ^2.24.2
  firebase_app_check: ^0.2.1+8
```

### Authentication Flow:
1. **User Authentication**: Users must be signed in to access any Firebase services
2. **Token Validation**: Firebase ID tokens are required for all API calls
3. **Session Management**: Automatic token refresh and session persistence

## 🛡️ App Check Configuration

### Development Setup:
```dart
import 'package:firebase_app_check/firebase_app_check.dart';

// Add after Firebase.initializeApp()
await FirebaseAppCheck.instance.activate(
  androidProvider: AndroidProvider.debug,
  appleProvider: AppleProvider.debug,
  webProvider: WebProvider.debug,
);
```

### Production Setup:
```dart
await FirebaseAppCheck.instance.activate(
  androidProvider: AndroidProvider.playIntegrity,
  appleProvider: AppleProvider.appAttest,
  webProvider: WebProvider.reCaptchaV3('your-site-key'),
);
```

## 📱 Android Permissions (android/app/src/main/AndroidManifest.xml)

### Required Permissions:
```xml
<!-- Internet access for Firebase -->
<uses-permission android:name="android.permission.INTERNET" />

<!-- Network state for connectivity checks -->
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

<!-- Camera for QR code scanning -->
<uses-permission android:name="android.permission.CAMERA" />

<!-- Vibration for scan feedback -->
<uses-permission android:name="android.permission.VIBRATE" />

<!-- Wake lock for keeping screen on during scanning -->
<uses-permission android:name="android.permission.WAKE_LOCK" />

<!-- Storage for caching (optional) -->
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
```

### Camera Features:
```xml
<!-- Camera features -->
<uses-feature android:name="android.hardware.camera" android:required="true" />
<uses-feature android:name="android.hardware.camera.autofocus" android:required="false" />
<uses-feature android:name="android.hardware.camera.flash" android:required="false" />
```

## 🍎 iOS Permissions (ios/Runner/Info.plist)

### Required Permissions:
```xml
<!-- Camera usage for QR scanning -->
<key>NSCameraUsageDescription</key>
<string>This app needs camera access to scan QR codes for library entry</string>

<!-- Photo library access (if saving QR codes) -->
<key>NSPhotoLibraryUsageDescription</key>
<string>This app needs photo library access to save QR codes</string>

<!-- Network usage -->
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <true/>
</dict>
```

## 🔥 Firebase Permissions

### Firestore Security Rules:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // User profiles - users can only access their own
    match /user_profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Admin function
    function isAdmin() {
      return request.auth != null &&
             get(/databases/$(database)/documents/user_profiles/$(request.auth.uid)).data.role == 'admin';
    }
    
    // QR codes - authenticated users can read, create own
    match /qr_codes/{qrId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update, delete: if request.auth != null && (request.auth.uid == resource.data.userId || isAdmin());
    }
    
    // Scan logs - authenticated users can read/write
    match /scan_logs/{logId} {
      allow read, write: if request.auth != null;
    }
    
    // Entry/exit logs - authenticated users can read/write
    match /entry_exit_logs/{logId} {
      allow read, write: if request.auth != null;
    }
    
    // Subscriptions - users can read own, admins can manage all
    match /subscriptions/{subId} {
      allow read: if request.auth != null && (request.auth.uid == resource.data.user_id || isAdmin());
      allow write: if isAdmin();
    }
    
    // Admin access to all documents
    match /{document=**} {
      allow read, write: if isAdmin();
    }
  }
}
```

### Firebase Functions Permissions:
```typescript
// functions/src/index.ts
export const getQrEncryptionKey = functions
  .region('us-central1')
  .https.onCall(async (data, context) => {
    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to get encryption key'
      );
    }
    
    // Function implementation...
  });
```

## 📋 Required User Roles

### User Role Hierarchy:
1. **Regular User**:
   - Can generate personal QR codes
   - Can scan QR codes for entry/exit
   - Can view own scan history
   - Can update own profile

2. **Admin User**:
   - All regular user permissions
   - Can view dashboard statistics
   - Can manage all users
   - Can view all scan logs
   - Can invite new admins
   - Can access admin panels

### Role Assignment:
```dart
// User profile structure in Firestore
{
  "uid": "user_firebase_uid",
  "email": "user@example.com",
  "name": "User Name",
  "role": "admin" | "user",
  "isActive": true,
  "createdAt": Timestamp,
  "lastLogin": Timestamp
}
```

## 🔧 Implementation Checklist

### Flutter App Setup:
- [ ] Add Firebase dependencies to pubspec.yaml
- [ ] Configure Firebase for Android and iOS
- [ ] Set up App Check with appropriate providers
- [ ] Implement authentication flow
- [ ] Add camera permissions for QR scanning
- [ ] Configure network permissions

### Firebase Backend Setup:
- [ ] Deploy Firebase Functions to us-central1 region
- [ ] Configure Firestore security rules
- [ ] Set up App Check enforcement
- [ ] Create admin user accounts
- [ ] Test authentication flow

### Permission Testing:
- [ ] Test QR code generation for authenticated users
- [ ] Test QR code scanning functionality
- [ ] Test admin dashboard access
- [ ] Test user management features
- [ ] Verify Firestore read/write permissions
- [ ] Test Firebase Functions calls

## 🚨 Common Permission Issues

### 1. UNAUTHENTICATED Error:
**Cause**: User not signed in or App Check token missing
**Solution**: Ensure user authentication before API calls

### 2. PERMISSION_DENIED Error:
**Cause**: Firestore security rules blocking access
**Solution**: Update rules or verify user role

### 3. ERR_FAILED Function Calls:
**Cause**: Functions not deployed or CORS issues
**Solution**: Deploy functions and configure CORS

### 4. Camera Access Denied:
**Cause**: Missing camera permissions
**Solution**: Add camera permissions to manifest/Info.plist

## 📞 Support

For permission-related issues:
1. Check Firebase Console for function deployment status
2. Verify Firestore rules in Firebase Console
3. Test authentication flow in development
4. Check device permissions in app settings

---

**Last Updated**: January 2025
**Version**: 1.0.0