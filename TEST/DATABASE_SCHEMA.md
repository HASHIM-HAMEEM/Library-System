# Private Library Access App - Database Schema

This document outlines the complete database schema for the Private Library Access App, designed for seamless integration between the Flutter mobile app, React web app, and Supabase backend.

## 📊 Database Overview

The database is built on PostgreSQL (Supabase) with Row Level Security (RLS) enabled for all tables to ensure data privacy and security.

---

## 🗂️ Core Tables

### 1. **user_profiles** - User information and settings
**Purpose**: Store comprehensive user data including authentication details, subscription status, and profile information.

```sql
CREATE TABLE user_profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address TEXT,
    role VARCHAR(20) DEFAULT 'student' CHECK (role IN ('student', 'admin')),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
    rejection_reason TEXT,
    profile_picture_url TEXT,
    id_proof_url TEXT,
    subscription_status VARCHAR(20) DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'expired', 'inactive')),
    subscription_type VARCHAR(20) CHECK (subscription_type IN ('daily', 'weekly', 'monthly')),
    subscription_start TIMESTAMPTZ,
    subscription_end TIMESTAMPTZ,
    qr_token VARCHAR(255) UNIQUE,
    qr_token_expires_at TIMESTAMPTZ,
    last_qr_generated_at TIMESTAMPTZ,
    institution_id TEXT,
    profile_pic_url TEXT,
    is_active BOOLEAN DEFAULT true,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields for Flutter Integration:**
- `id`: Primary key linked to Supabase auth
- `role`: User type (student/admin)
- `subscription_status`: Current subscription state
- `qr_token`: Secure token for QR code generation
- `profile_picture_url`: User avatar for mobile app

---

### 2. **subscriptions** - Subscription plans and billing
**Purpose**: Manage user subscription plans, billing cycles, and payment tracking.

```sql
CREATE TABLE subscriptions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    plan_type VARCHAR(20) NOT NULL CHECK (plan_type IN ('daily', 'weekly', 'monthly')),
    amount DECIMAL(10,2) NOT NULL,
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'cancelled')),
    payment_method VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields for Flutter Integration:**
- `plan_type`: Subscription duration (daily/weekly/monthly)
- `amount`: Payment amount for billing display
- `status`: Current subscription status
- `end_date`: Expiry date for renewal notifications

---

### 3. **attendance_logs** - Library visit tracking
**Purpose**: Track user entry/exit times and calculate visit duration for analytics.

```sql
CREATE TABLE attendance_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    entry_time TIMESTAMPTZ NOT NULL,
    exit_time TIMESTAMPTZ,
    duration INTEGER, -- Duration in minutes
    scanned_by_admin_id UUID REFERENCES user_profiles(id),
    entry_method VARCHAR(20) DEFAULT 'qr_scan' CHECK (entry_method IN ('qr_scan', 'manual', 'auto_exit')),
    is_synced BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields for Flutter Integration:**
- `entry_time`: Check-in timestamp
- `exit_time`: Check-out timestamp
- `duration`: Visit duration for user statistics
- `entry_method`: How the visit was logged (QR/manual)
- `is_synced`: Offline sync status for mobile app

---

### 4. **qr_codes** - QR code generation history
**Purpose**: Store QR code data, generation history, and security tokens.

```sql
CREATE TABLE qr_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE UNIQUE,
    qr_data JSONB NOT NULL,
    qr_code_url TEXT,
    encrypted_data TEXT,
    is_active BOOLEAN DEFAULT true,
    expires_at TIMESTAMP WITH TIME ZONE,
    generated_by UUID REFERENCES user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Fields for Flutter Integration:**
- `qr_data`: JSON data embedded in QR code
- `qr_code_url`: Generated QR code image URL
- `is_active`: QR code validity status
- `expires_at`: QR code expiration time

---

### 5. **qr_scan_logs** - QR scan audit trail
**Purpose**: Security and audit logging for all QR code scan attempts.

```sql
CREATE TABLE qr_scan_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    scan_timestamp TIMESTAMPTZ DEFAULT NOW(),
    scan_result VARCHAR(20) CHECK (scan_result IN ('success', 'expired_subscription', 'invalid_token', 'expired_token')),
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields for Flutter Integration:**
- `scan_result`: Success/failure status
- `scan_timestamp`: When the scan occurred
- `student_id`: Who was scanned
- `admin_id`: Who performed the scan

---

### 6. **scan_logs** - Detailed entry/exit tracking
**Purpose**: Enhanced visit tracking with location and verification details.

```sql
CREATE TABLE scan_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    entry_time TIMESTAMP WITH TIME ZONE,
    exit_time TIMESTAMP WITH TIME ZONE,
    duration INTERVAL GENERATED ALWAYS AS (exit_time - entry_time) STORED,
    verified_by UUID REFERENCES user_profiles(id),
    status TEXT CHECK (status IN ('entry', 'exit', 'invalid', 'expired')) DEFAULT 'entry',
    scan_type TEXT CHECK (scan_type IN ('entry', 'exit')) DEFAULT 'entry',
    location TEXT DEFAULT 'main_entrance',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Fields for Flutter Integration:**
- `scan_type`: Entry or exit scan
- `location`: Where the scan occurred
- `status`: Scan validation status
- `duration`: Auto-calculated visit duration

---

### 7. **subscription_history** - Subscription billing history
**Purpose**: Track subscription renewals, payments, and billing history.

```sql
CREATE TABLE subscription_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    subscription_type TEXT NOT NULL,
    start_date TIMESTAMP WITH TIME ZONE NOT NULL,
    end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    renewed_by UUID REFERENCES user_profiles(id),
    payment_status TEXT DEFAULT 'pending',
    amount DECIMAL(10,2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Key Fields for Flutter Integration:**
- `payment_status`: Payment completion status
- `subscription_type`: Plan type for history display
- `amount`: Payment amount for receipts

---

### 8. **admin_invites** - Admin invitation system
**Purpose**: Manage admin user invitations and registration codes.

```sql
CREATE TABLE admin_invites (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    invite_code VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_by UUID REFERENCES user_profiles(id) ON DELETE CASCADE,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'used', 'expired')),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Fields for Flutter Integration:**
- `invite_code`: Unique invitation code
- `status`: Invitation status
- `expires_at`: Invitation expiry

---

## 🔧 Database Functions

### QR Token Management
```sql
-- Generate secure QR token
CREATE OR REPLACE FUNCTION generate_qr_token(user_uuid UUID) RETURNS VARCHAR

-- Validate QR token
CREATE OR REPLACE FUNCTION validate_qr_token(token VARCHAR) RETURNS TABLE(...)

-- Generate QR data
CREATE OR REPLACE FUNCTION generate_qr_data(user_uuid UUID) RETURNS JSONB

-- Log scan entry/exit
CREATE OR REPLACE FUNCTION log_scan(...) RETURNS UUID

-- Check subscription validity
CREATE OR REPLACE FUNCTION is_subscription_valid(user_uuid UUID) RETURNS BOOLEAN
```

---

## 🔐 Security Features

### Row Level Security (RLS)
- **Enabled on all tables** for data isolation
- **User-specific policies** - Users can only access their own data
- **Admin override policies** - Admins can access all data
- **Authenticated access only** - No anonymous access

### Security Policies
```sql
-- Example policy for user_profiles
CREATE POLICY "authenticated_access" ON user_profiles
    FOR ALL TO authenticated
    USING (auth.uid() = id OR auth.uid() IN (
        SELECT id FROM user_profiles WHERE role = 'admin' AND id = auth.uid()
    ));
```

---

## 📱 Flutter Integration Guidelines

### 1. **Authentication**
- Use Supabase Auth for user authentication
- Store user session in secure storage
- Implement automatic token refresh

### 2. **Real-time Subscriptions**
```dart
// Listen to user profile changes
supabase
  .from('user_profiles')
  .stream(primaryKey: ['id'])
  .eq('id', userId)
  .listen((data) {
    // Update UI with profile changes
  });
```

### 3. **Offline Support**
- Use `is_synced` field in attendance_logs
- Implement local SQLite cache
- Sync when connection is restored

### 4. **QR Code Generation**
```dart
// Generate QR code for user
final response = await supabase
  .rpc('generate_qr_data', params: {'user_uuid': userId});
```

### 5. **Push Notifications**
- Subscribe to subscription expiry notifications
- Real-time scan result notifications
- Admin approval/rejection notifications

---

## 🔗 API Endpoints for Flutter

### User Management
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile
- `POST /api/upload-avatar` - Upload profile picture

### Subscription Management
- `GET /api/subscriptions` - Get user subscriptions
- `POST /api/subscribe` - Create new subscription
- `GET /api/subscription-history` - Get billing history

### QR Code Operations
- `POST /api/generate-qr` - Generate QR code
- `POST /api/scan-qr` - Process QR scan
- `GET /api/qr-history` - Get QR generation history

### Visit Tracking
- `GET /api/visits` - Get visit history
- `GET /api/visit-stats` - Get visit statistics
- `POST /api/manual-entry` - Manual entry/exit

---

## 📊 Indexes for Performance

```sql
-- User profiles
CREATE INDEX idx_user_profiles_email ON user_profiles(email);
CREATE INDEX idx_user_profiles_role ON user_profiles(role);
CREATE INDEX idx_user_profiles_subscription_status ON user_profiles(subscription_status);

-- Attendance logs
CREATE INDEX idx_attendance_logs_user_id ON attendance_logs(user_id);
CREATE INDEX idx_attendance_logs_entry_time ON attendance_logs(entry_time);

-- QR codes
CREATE INDEX idx_qr_codes_user_id ON qr_codes(user_id);
CREATE INDEX idx_qr_scan_logs_timestamp ON qr_scan_logs(scan_timestamp);
```

---

## 🚀 Getting Started

1. **Set up Supabase project**
2. **Run migrations** in order:
   - `20240101000000_initial_schema.sql`
   - `20240102000000_fix_auth_system.sql`
   - `20240103000000_qr_system.sql`
3. **Configure Flutter app** with Supabase credentials
4. **Implement authentication flow**
5. **Set up real-time subscriptions**
6. **Test QR code generation and scanning**

---

## 📝 Notes

- All timestamps are stored in UTC
- UUIDs are used for all primary keys
- JSONB is used for flexible data storage
- Triggers automatically handle profile creation
- Default admin user: `admin@library.com` / `admin123`

This schema provides a robust foundation for both the Flutter mobile app and React web app to seamlessly integrate with Supabase for the Private Library Access system.