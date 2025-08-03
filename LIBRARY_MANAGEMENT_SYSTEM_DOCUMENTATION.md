# Library Management System - Comprehensive Documentation

## Table of Contents
1. [System Overview](#system-overview)
2. [Architecture](#architecture)
3. [Data Models](#data-models)
4. [Authentication System](#authentication-system)
5. [Subscription Management](#subscription-management)
6. [QR Code System](#qr-code-system)
7. [Firebase Database Structure](#firebase-database-structure)
8. [User Registration Flow](#user-registration-flow)
9. [Admin Dashboard Features](#admin-dashboard-features)
10. [Security Implementation](#security-implementation)
11. [API Endpoints](#api-endpoints)
12. [Installation & Setup](#installation--setup)
13. [Testing](#testing)
14. [Deployment](#deployment)

---

## System Overview

The Library Management System is a comprehensive solution for managing private library access with QR code scanning, subscription management, and attendance tracking. The system consists of:

- **React Web Admin Dashboard**: For administrators to manage users, scan QR codes, and monitor analytics
- **Flutter Mobile App**: For students to register, login, and access library services
- **Firebase Backend**: Handles authentication, database, and real-time updates

### Key Features
- 🔐 **Secure Authentication**: Firebase Auth with role-based access control
- 📱 **QR Code System**: Generate and scan QR codes for library access
- 📊 **Analytics Dashboard**: Real-time monitoring and reporting
- 👥 **User Management**: Admin verification and student management
- 💳 **Subscription Management**: Multiple subscription plans and tracking
- 🔄 **Real-time Updates**: Live data synchronization across platforms

---

## Architecture

### Tech Stack

#### Frontend (React Admin Dashboard)
- **Framework**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Routing**: React Router DOM
- **QR Code Scanning**: html5-qrcode
- **Charts**: Recharts
- **Icons**: Lucide React
- **Notifications**: Sonner
- **Date Handling**: date-fns

#### Backend
- **Authentication**: Firebase Auth
- **Database**: Firebase Firestore
- **Storage**: Firebase Storage
- **Analytics**: Firebase Analytics
- **Real-time**: Firestore real-time listeners

#### Mobile App (Flutter)
- **Framework**: Flutter
- **State Management**: Provider/Bloc
- **Backend Integration**: Firebase SDK
- **QR Code**: QR code generation and display

### System Architecture Diagram
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Flutter App   │    │  React Admin    │    │   Firebase      │
│   (Students)    │◄──►│   Dashboard     │◄──►│   Backend       │
│                 │    │  (Admins)       │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘
        │                        │                        │
        │                        │                        │
        ▼                        ▼                        ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│ User Registration│    │ QR Code Scanning│    │ Real-time Data  │
│ Profile Management│   │ Analytics       │    │ Authentication  │
│ QR Code Display │    │ User Verification│   │ Security Rules  │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## Data Models

### User Profile Model
```typescript
interface UserProfile {
  id: string;                    // Firebase Auth UID
  email: string;                 // User email address
  name: string;                  // Full name
  phone?: string;                // Phone number (optional)
  role: 'student' | 'admin';     // User role
  status: 'pending' | 'verified' | 'rejected' | 'suspended';
  subscription_status: 'active' | 'expired' | 'inactive';
  subscription_type?: 'daily' | 'weekly' | 'monthly';
  subscription_start?: string;   // ISO date string
  subscription_end?: string;     // ISO date string
  profile_picture_url?: string;  // Profile image URL
  id_proof_url?: string;         // ID verification document
  address?: string;              // Physical address
  created_at: string;            // ISO date string
  updated_at: string;            // ISO date string
  last_login?: string;           // ISO date string
  qr_code_url?: string;          // Generated QR code URL
  qr_data?: string;              // Encrypted QR data
  rejection_reason?: string;     // Admin rejection reason
}
```

### QR Data Model
```typescript
interface QRData {
  userId: string;                // User ID
  fullName: string;              // User full name
  email: string;                 // User email
  subscriptionValidUntil: string; // Subscription expiry
  role: string;                  // User role
  institutionId?: string;        // Institution identifier
  profilePicUrl?: string;        // Profile picture URL
  generatedAt: string;           // QR generation timestamp
}
```

### Scan Log Model
```typescript
interface ScanLog {
  id: string;                    // Unique scan ID
  user_id: string;               // Scanned user ID
  user_name: string;             // User name
  user_email: string;            // User email
  scan_type: 'entry' | 'exit';   // Scan type
  scan_time: string;             // ISO timestamp
  location: string;              // Scan location
  scanned_by: string;            // Admin who scanned
  status: 'success' | 'failed';  // Scan result
  result: 'granted' | 'denied';  // Access result
  subscription_valid: boolean;   // Subscription status
  qr_data?: string;              // Original QR data
}
```

### Admin User Model
```typescript
interface AdminUser {
  id: string;                    // Firebase Auth UID
  email: string;                 // Admin email
  name: string;                  // Admin name
  role: 'admin';                 // Always 'admin'
  status: 'active' | 'inactive' | 'suspended';
  permissions: string[];         // Admin permissions array
  created_at: string;            // ISO date string
  updated_at: string;            // ISO date string
  last_login?: string;           // Last login timestamp
  created_by?: string;           // Admin who created this account
}
```

### Subscription Model
```typescript
interface Subscription {
  id: string;                    // Unique subscription ID
  user_id: string;               // User ID
  plan_type: 'daily' | 'weekly' | 'monthly';
  amount: number;                // Subscription cost
  start_date: string;            // ISO date string
  end_date: string;              // ISO date string
  status: 'active' | 'expired' | 'cancelled';
  payment_method?: string;       // Payment method used
  payment_status: 'pending' | 'completed' | 'failed';
  created_at: string;            // ISO date string
  updated_at: string;            // ISO date string
}
```

---

## Authentication System

### Firebase Authentication Setup

The system uses Firebase Authentication with custom user profiles stored in Firestore.

#### Authentication Flow
1. **User Registration**: Creates Firebase Auth user + Firestore profile
2. **Email Verification**: Optional email verification step
3. **Profile Creation**: Automatic profile document creation
4. **Role Assignment**: Role-based access control (student/admin)
5. **Session Management**: Persistent authentication state

#### Auth Store Implementation
```typescript
// src/stores/authStore.ts
interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{error?: string}>;
  signUp: (email: string, password: string, userData: Partial<UserProfile>) => Promise<{error?: string}>;
  signOut: () => Promise<void>;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  createAdminAccount: (email: string, password: string, name: string) => Promise<{error?: string}>;
}
```

#### Security Features
- **Rate Limiting**: Login attempt restrictions
- **Input Sanitization**: XSS protection
- **CSRF Protection**: Token-based validation
- **Session Validation**: Automatic session checks
- **Security Logging**: Audit trail for security events

#### Firestore Security Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only access their own profile
    match /user_profiles/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Admin access to all documents
    function isAdmin() {
      return request.auth != null &&
             get(/databases/$(database)/documents/user_profiles/$(request.auth.uid)).data.role == 'admin';
    }
    
    match /{document=**} {
      allow read, write: if isAdmin();
    }
  }
}
```

---

## Subscription Management

### Subscription Plans

| Plan Type | Duration | Features |
|-----------|----------|----------|
| Daily     | 1 Day    | Single day access |
| Weekly    | 7 Days   | One week access |
| Monthly   | 30 Days  | Full month access |

### Subscription Lifecycle

1. **Plan Selection**: User chooses subscription plan
2. **Payment Processing**: Payment gateway integration
3. **Activation**: Subscription becomes active
4. **Monitoring**: Real-time status tracking
5. **Renewal**: Automatic or manual renewal
6. **Expiration**: Access revocation on expiry

### Subscription Status Management
```typescript
// Subscription status validation
function isSubscriptionValid(user: UserProfile): boolean {
  if (!user.subscription_end || user.subscription_status !== 'active') {
    return false;
  }
  
  const expiryDate = new Date(user.subscription_end);
  const now = new Date();
  
  return expiryDate > now;
}

// Update subscription status
async function updateSubscriptionStatus(userId: string, status: string) {
  await updateDoc(doc(db, 'user_profiles', userId), {
    subscription_status: status,
    updated_at: new Date().toISOString()
  });
}
```

### Analytics & Reporting
- **Revenue Tracking**: Subscription revenue analytics
- **User Retention**: Subscription renewal rates
- **Plan Performance**: Popular subscription plans
- **Churn Analysis**: User subscription patterns

---

## QR Code System

### QR Code Generation

The system generates encrypted QR codes containing user information and subscription details.

#### QR Code Service
```typescript
// src/lib/qrCodeService.ts
class QRCodeService {
  private static ENCRYPTION_KEY = 'your-secret-encryption-key';
  
  static async generateQRCode(userId: string): Promise<string> {
    // 1. Fetch user data from Firestore
    const userDoc = await getDoc(doc(db, 'user_profiles', userId));
    const userData = userDoc.data() as UserProfile;
    
    // 2. Create QR data object
    const qrData: QRData = {
      userId: userData.id,
      fullName: userData.name,
      email: userData.email,
      subscriptionValidUntil: userData.subscription_end || '',
      role: userData.role,
      generatedAt: new Date().toISOString()
    };
    
    // 3. Encrypt the data
    const encryptedData = this.encryptData(JSON.stringify(qrData));
    
    // 4. Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(encryptedData);
    
    // 5. Update user profile with QR data
    await updateDoc(doc(db, 'user_profiles', userId), {
      qr_code_url: qrCodeUrl,
      qr_data: encryptedData,
      updated_at: new Date().toISOString()
    });
    
    return qrCodeUrl;
  }
  
  static async validateQRCode(qrData: string, scannedBy: string): Promise<QRScanResult> {
    try {
      // 1. Decrypt QR data
      const decryptedData = this.decryptData(qrData);
      const parsedData: QRData = JSON.parse(decryptedData);
      
      // 2. Validate user exists
      const userDoc = await getDoc(doc(db, 'user_profiles', parsedData.userId));
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data() as UserProfile;
      
      // 3. Check subscription validity
      const isValidSubscription = this.isSubscriptionValid(userData);
      
      // 4. Log the scan
      await this.logScan({
        user_id: parsedData.userId,
        user_name: parsedData.fullName,
        user_email: parsedData.email,
        scan_type: 'entry', // or 'exit'
        scanned_by,
        status: isValidSubscription ? 'success' : 'failed',
        result: isValidSubscription ? 'granted' : 'denied',
        subscription_valid: isValidSubscription
      });
      
      return {
        isValid: isValidSubscription,
        userData,
        scanLog: scanLogId
      };
    } catch (error) {
      // Log failed scan attempt
      await this.logFailedScan(qrData, scannedBy, error.message);
      throw error;
    }
  }
  
  private static encryptData(data: string): string {
    return CryptoJS.AES.encrypt(data, this.ENCRYPTION_KEY).toString();
  }
  
  private static decryptData(encryptedData: string): string {
    const bytes = CryptoJS.AES.decrypt(encryptedData, this.ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
  }
}
```

### QR Code Features
- **Encryption**: AES encryption for security
- **Expiration**: Time-based QR code validity
- **Validation**: Real-time subscription checking
- **Logging**: Comprehensive scan audit trail
- **Offline Support**: Cached validation data

### QR Scanner Implementation
```typescript
// QR Scanner Component
const QRScanner: React.FC = () => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<QRScanResult | null>(null);
  
  const handleScan = async (qrData: string) => {
    try {
      setScanning(true);
      const result = await qrCodeService.validateQRCode(qrData, currentAdminId);
      setResult(result);
      
      if (result.isValid) {
        toast.success(`Access granted for ${result.userData.name}`);
      } else {
        toast.error('Access denied - Invalid subscription');
      }
    } catch (error) {
      toast.error('Invalid QR code');
    } finally {
      setScanning(false);
    }
  };
  
  return (
    <div className="qr-scanner">
      <Html5QrcodePlugin
        fps={10}
        qrbox={250}
        disableFlip={false}
        qrCodeSuccessCallback={handleScan}
      />
    </div>
  );
};
```

---

## Firebase Database Structure

### Firestore Collections

#### 1. `user_profiles` Collection
```javascript
// Document ID: Firebase Auth UID
{
  id: "firebase_auth_uid",
  email: "user@example.com",
  name: "John Doe",
  phone: "+1234567890",
  role: "student", // or "admin"
  status: "verified", // pending, verified, rejected, suspended
  subscription_status: "active", // active, expired, inactive
  subscription_type: "monthly", // daily, weekly, monthly
  subscription_start: "2024-01-01T00:00:00.000Z",
  subscription_end: "2024-02-01T00:00:00.000Z",
  profile_picture_url: "https://...",
  id_proof_url: "https://...",
  address: "123 Main St",
  qr_code_url: "data:image/png;base64,...",
  qr_data: "encrypted_qr_data",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z",
  last_login: "2024-01-01T00:00:00.000Z",
  rejection_reason: "Invalid documents"
}
```

#### 2. `scan_logs` Collection
```javascript
// Document ID: Auto-generated
{
  id: "auto_generated_id",
  user_id: "firebase_auth_uid",
  user_name: "John Doe",
  user_email: "user@example.com",
  scan_type: "entry", // entry, exit
  scan_time: "2024-01-01T10:00:00.000Z",
  location: "Main Library",
  scanned_by: "admin_uid",
  status: "success", // success, failed
  result: "granted", // granted, denied
  subscription_valid: true,
  qr_data: "encrypted_qr_data",
  error_message: "Subscription expired"
}
```

#### 3. `subscriptions` Collection
```javascript
// Document ID: Auto-generated
{
  id: "auto_generated_id",
  user_id: "firebase_auth_uid",
  plan_type: "monthly", // daily, weekly, monthly
  amount: 29.99,
  start_date: "2024-01-01T00:00:00.000Z",
  end_date: "2024-02-01T00:00:00.000Z",
  status: "active", // active, expired, cancelled
  payment_method: "credit_card",
  payment_status: "completed", // pending, completed, failed
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z"
}
```

#### 4. `admin_invites` Collection
```javascript
// Document ID: Auto-generated
{
  id: "auto_generated_id",
  invite_code: "unique_invite_code",
  email: "admin@example.com",
  name: "Admin User",
  created_by: "creator_admin_uid",
  status: "pending", // pending, used, expired
  expires_at: "2024-01-08T00:00:00.000Z",
  used_at: "2024-01-02T00:00:00.000Z",
  created_at: "2024-01-01T00:00:00.000Z",
  updated_at: "2024-01-01T00:00:00.000Z"
}
```

### Firestore Indexes
```json
{
  "indexes": [
    {
      "collectionGroup": "user_profiles",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "status", "order": "ASCENDING"},
        {"fieldPath": "name", "order": "ASCENDING"}
      ]
    },
    {
      "collectionGroup": "scan_logs",
      "queryScope": "COLLECTION",
      "fields": [
        {"fieldPath": "user_id", "order": "ASCENDING"},
        {"fieldPath": "scan_time", "order": "DESCENDING"}
      ]
    }
  ]
}
```

### Real-time Subscriptions
```typescript
// Listen to user profile changes
const unsubscribe = onSnapshot(
  doc(db, 'user_profiles', userId),
  (doc) => {
    if (doc.exists()) {
      setUserProfile(doc.data() as UserProfile);
    }
  }
);

// Listen to scan logs
const unsubscribeLogs = onSnapshot(
  query(
    collection(db, 'scan_logs'),
    orderBy('scan_time', 'desc'),
    limit(50)
  ),
  (snapshot) => {
    const logs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as ScanLog[];
    setScanLogs(logs);
  }
);
```

---

## User Registration Flow

### Student Registration (Flutter App)

1. **Account Creation**
   - User provides email, password, name, phone
   - Firebase Auth creates user account
   - User profile document created in Firestore
   - Status set to 'pending'

2. **Profile Completion**
   - Upload profile picture
   - Upload ID proof document
   - Provide additional details (address, etc.)
   - Submit for admin verification

3. **Admin Verification**
   - Admin reviews pending registrations
   - Verifies uploaded documents
   - Approves or rejects registration
   - Updates user status accordingly

4. **QR Code Generation**
   - Upon approval, QR code is generated
   - QR code contains encrypted user data
   - QR code stored in user profile

5. **Subscription Activation**
   - User selects subscription plan
   - Payment processing
   - Subscription activated
   - Library access granted

### Admin Registration

1. **Admin Invitation**
   - Existing admin creates invitation
   - Invitation code generated
   - Email sent to new admin

2. **Account Setup**
   - New admin uses invitation code
   - Creates account with temporary password
   - Profile created with admin role
   - Permissions assigned

3. **Account Activation**
   - Admin logs in and changes password
   - Account status set to 'active'
   - Full admin access granted

---

## Admin Dashboard Features

### Dashboard Overview
- **System Statistics**: Total users, active subscriptions, today's visits
- **Real-time Metrics**: Current users in library, scan activity
- **Quick Actions**: QR scanner, user verification, admin management
- **Recent Activity**: Latest scans, new registrations, system alerts

### User Management
- **Pending Users**: Review and verify new registrations
- **User Search**: Find users by name, email, or ID
- **User Profiles**: View and edit user information
- **Subscription Management**: Update subscription status and plans
- **QR Code Regeneration**: Generate new QR codes for users

### QR Code Scanner
- **Live Scanning**: Real-time QR code scanning interface
- **Scan Results**: Immediate feedback on scan success/failure
- **Entry/Exit Tracking**: Log user entry and exit times
- **Offline Mode**: Cache recent scans for offline operation

### Analytics & Reporting
- **Visit Analytics**: Daily, weekly, monthly visit patterns
- **Subscription Analytics**: Revenue, renewal rates, plan popularity
- **User Analytics**: Registration trends, verification rates
- **Export Features**: CSV export for external analysis

### Admin Management
- **Admin Accounts**: Create and manage admin users
- **Permission Management**: Role-based access control
- **Activity Logs**: Admin action audit trail
- **Security Settings**: Password policies, session management

---

## Security Implementation

### Authentication Security
- **Multi-factor Authentication**: Optional 2FA for admin accounts
- **Password Policies**: Strong password requirements
- **Session Management**: Automatic session timeout
- **Rate Limiting**: Login attempt restrictions

### Data Security
- **Encryption**: AES encryption for sensitive data
- **Input Sanitization**: XSS and injection protection
- **CSRF Protection**: Token-based request validation
- **Audit Logging**: Comprehensive security event logging

### Access Control
- **Role-based Access**: Student and admin role separation
- **Firestore Rules**: Database-level security policies
- **API Security**: Authenticated API endpoints only
- **Data Isolation**: Users can only access their own data

### Security Monitoring
- **Failed Login Tracking**: Monitor suspicious login attempts
- **Security Event Logging**: Log all security-related events
- **Real-time Alerts**: Immediate notification of security issues
- **Regular Security Audits**: Periodic security assessments

---

## API Endpoints

### Authentication Endpoints
```typescript
// Sign in
POST /auth/signin
Body: { email: string, password: string }
Response: { user: User, token: string }

// Sign up
POST /auth/signup
Body: { email: string, password: string, userData: UserProfile }
Response: { user: User, profile: UserProfile }

// Sign out
POST /auth/signout
Response: { success: boolean }
```

### User Management Endpoints
```typescript
// Get user profile
GET /api/users/:userId
Response: { profile: UserProfile }

// Update user profile
PUT /api/users/:userId
Body: { updates: Partial<UserProfile> }
Response: { profile: UserProfile }

// Verify user
POST /api/users/:userId/verify
Body: { status: 'verified' | 'rejected', reason?: string }
Response: { success: boolean }
```

### QR Code Endpoints
```typescript
// Generate QR code
POST /api/qr/generate
Body: { userId: string }
Response: { qrCodeUrl: string, qrData: string }

// Validate QR code
POST /api/qr/validate
Body: { qrData: string, scannedBy: string }
Response: { isValid: boolean, userData: UserProfile }

// Get scan logs
GET /api/qr/logs
Query: { userId?: string, limit?: number, offset?: number }
Response: { logs: ScanLog[], total: number }
```

### Subscription Endpoints
```typescript
// Get user subscriptions
GET /api/subscriptions/:userId
Response: { subscriptions: Subscription[] }

// Create subscription
POST /api/subscriptions
Body: { userId: string, planType: string, amount: number }
Response: { subscription: Subscription }

// Update subscription
PUT /api/subscriptions/:subscriptionId
Body: { updates: Partial<Subscription> }
Response: { subscription: Subscription }
```

---

## Installation & Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or pnpm
- Firebase account and project
- Flutter SDK (for mobile app)

### Firebase Setup

1. **Create Firebase Project**
   ```bash
   # Visit https://console.firebase.google.com/
   # Create new project: "iqralibrary2025"
   ```

2. **Enable Services**
   - Authentication (Email/Password)
   - Firestore Database
   - Storage
   - Analytics

3. **Configure Authentication**
   ```bash
   # Enable Email/Password sign-in method
   # Set up authorized domains
   ```

4. **Set up Firestore**
   ```bash
   # Create database in production mode
   # Deploy security rules from firestore.rules
   # Create indexes from firestore.indexes.json
   ```

### Web Admin Dashboard Setup

1. **Clone Repository**
   ```bash
   git clone <repository-url>
   cd library-management-system
   ```

2. **Install Dependencies**
   ```bash
   npm install
   # or
   pnpm install
   ```

3. **Configure Firebase**
   ```typescript
   // src/lib/firebase.ts
   const firebaseConfig = {
     apiKey: "your-api-key",
     authDomain: "iqralibrary2025.firebaseapp.com",
     projectId: "iqralibrary2025",
     storageBucket: "iqralibrary2025.firebasestorage.app",
     messagingSenderId: "your-sender-id",
     appId: "your-app-id",
     measurementId: "your-measurement-id"
   };
   ```

4. **Create Admin User**
   ```bash
   # Run admin creation script
   node create-admin-user.js
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   # or
   pnpm dev
   ```

6. **Access Dashboard**
   ```
   http://localhost:5173
   ```

### Flutter Mobile App Setup

1. **Install Flutter**
   ```bash
   # Follow Flutter installation guide
   # https://flutter.dev/docs/get-started/install
   ```

2. **Configure Firebase**
   ```bash
   # Add Firebase configuration files
   # android/app/google-services.json
   # ios/Runner/GoogleService-Info.plist
   ```

3. **Install Dependencies**
   ```bash
   flutter pub get
   ```

4. **Run App**
   ```bash
   flutter run
   ```

---

## Testing

### Unit Tests
```bash
# Run unit tests
npm test

# Run with coverage
npm run test:coverage
```

### Integration Tests
```bash
# Run integration tests
npm run test:integration

# Test specific features
npm run test:auth
npm run test:qr
npm run test:admin
```

### End-to-End Tests
```bash
# Run E2E tests
npm run test:e2e

# Test user flows
npm run test:user-registration
npm run test:qr-scanning
npm run test:admin-dashboard
```

### Manual Testing Checklist

#### Authentication Testing
- [ ] Admin login with valid credentials
- [ ] Admin login with invalid credentials
- [ ] Password reset functionality
- [ ] Session timeout handling
- [ ] Role-based access control

#### QR Code Testing
- [ ] QR code generation for verified users
- [ ] QR code scanning with valid subscription
- [ ] QR code scanning with expired subscription
- [ ] Entry/exit logging
- [ ] Scan history tracking

#### User Management Testing
- [ ] View pending user registrations
- [ ] Approve user registration
- [ ] Reject user registration
- [ ] Update user subscription
- [ ] Search and filter users

#### Dashboard Testing
- [ ] Real-time statistics display
- [ ] Analytics charts rendering
- [ ] Export functionality
- [ ] Mobile responsiveness
- [ ] Error handling

---

## Deployment

### Production Environment Setup

1. **Environment Variables**
   ```bash
   # .env.production
   VITE_FIREBASE_API_KEY=your-production-api-key
   VITE_FIREBASE_AUTH_DOMAIN=iqralibrary2025.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=iqralibrary2025
   VITE_FIREBASE_STORAGE_BUCKET=iqralibrary2025.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
   VITE_FIREBASE_APP_ID=your-app-id
   VITE_FIREBASE_MEASUREMENT_ID=your-measurement-id
   ```

2. **Build for Production**
   ```bash
   npm run build
   # or
   pnpm build
   ```

3. **Deploy to Firebase Hosting**
   ```bash
   # Install Firebase CLI
   npm install -g firebase-tools
   
   # Login to Firebase
   firebase login
   
   # Initialize hosting
   firebase init hosting
   
   # Deploy
   firebase deploy
   ```

4. **Deploy to Vercel**
   ```bash
   # Install Vercel CLI
   npm install -g vercel
   
   # Deploy
   vercel --prod
   ```

### Security Considerations for Production

1. **Environment Security**
   - Use environment variables for sensitive data
   - Enable HTTPS only
   - Configure CORS properly
   - Set up security headers

2. **Database Security**
   - Review and tighten Firestore rules
   - Enable audit logging
   - Set up backup strategies
   - Monitor database usage

3. **Authentication Security**
   - Enable multi-factor authentication
   - Set strong password policies
   - Configure session timeouts
   - Monitor failed login attempts

4. **Monitoring & Alerts**
   - Set up error tracking (Sentry)
   - Configure performance monitoring
   - Set up uptime monitoring
   - Create alert policies

### Performance Optimization

1. **Code Splitting**
   ```typescript
   // Lazy load components
   const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
   const QRScanner = lazy(() => import('./components/QRScanner'));
   ```

2. **Image Optimization**
   - Compress profile images
   - Use WebP format when possible
   - Implement lazy loading
   - Use CDN for static assets

3. **Database Optimization**
   - Create appropriate indexes
   - Implement pagination
   - Use real-time listeners efficiently
   - Cache frequently accessed data

4. **Bundle Optimization**
   ```bash
   # Analyze bundle size
   npm run build:analyze
   
   # Optimize dependencies
   npm run build:optimize
   ```

---

## Conclusion

This Library Management System provides a comprehensive solution for managing library access with modern web and mobile technologies. The system is designed with security, scalability, and user experience in mind.

### Key Benefits
- **Secure Access Control**: QR code-based entry system with subscription validation
- **Real-time Monitoring**: Live dashboard with analytics and reporting
- **User-friendly Interface**: Intuitive admin dashboard and mobile app
- **Scalable Architecture**: Firebase backend with real-time capabilities
- **Comprehensive Logging**: Full audit trail for all system activities

### Future Enhancements
- Email notifications for subscription expiry
- SMS alerts for entry/exit
- Advanced reporting and analytics
- Integration with payment gateways
- Automated subscription renewals
- Multi-library support
- API for third-party integrations

For support and additional documentation, please refer to the individual component documentation files in the project repository.