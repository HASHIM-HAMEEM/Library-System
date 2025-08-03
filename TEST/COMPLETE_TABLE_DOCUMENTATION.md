# Detailed Database Table Analysis

**Generated:** 8/1/2025, 12:12:40 PM

## Summary

- **Public Tables:** 8
- **Auth Tables:** 4
- **Total Records:** 3

## Public Schema Tables

### `public.library_users`

- **Status:** ✅ Active
- **Records:** 1
- **Columns:** id, name, subscription_valid_until, qr_code, created_at, updated_at
- **Purpose:** Stores library user profiles and information

### `public.admin_meta`

- **Status:** ✅ Active
- **Records:** 2
- **Columns:** user_id, name, last_login, created_at
- **Purpose:** Contains admin user metadata and permissions

### `public.admin_invites`

- **Status:** ✅ Active
- **Records:** 0
- **Purpose:** Manages admin invitation system

### `public.qr_codes`

- **Status:** ✅ Active
- **Records:** 0
- **Purpose:** Stores generated QR codes for users

### `public.attendance_logs`

- **Status:** ✅ Active
- **Records:** 0
- **Purpose:** Tracks user entry/exit events

### `public.qr_scan_logs`

- **Status:** ✅ Active
- **Records:** 0
- **Purpose:** Logs QR code scanning activities

### `public.scan_logs`

- **Status:** ✅ Active
- **Records:** 0
- **Purpose:** General scanning and verification logs

### `public.subscription_history`

- **Status:** ✅ Active
- **Records:** 0
- **Purpose:** Tracks user subscription changes

## Auth Schema Tables

### `auth.users`

- **Status:** ✅ Active
- **Records:** 1
- **Access:** Auth API access
- **Note:** Accessed via Supabase Auth API

### `auth.identities`

- **Status:** ✅ Active
- **Records:** Unknown
- **Access:** System managed
- **Note:** Managed by Supabase Auth system

### `auth.sessions`

- **Status:** ✅ Active
- **Records:** Unknown
- **Access:** System managed
- **Note:** Managed by Supabase Auth system

### `auth.refresh_tokens`

- **Status:** ✅ Active
- **Records:** Unknown
- **Access:** System managed
- **Note:** Managed by Supabase Auth system

## Database Relationships

Based on constraint analysis from fullDB.sql:

### Core Application Flow

```
User Registration:
auth.users → public.library_users → public.qr_codes

Admin System:
auth.users → public.admin_meta → public.admin_invites

QR Scanning Flow:
public.qr_codes → public.qr_scan_logs
public.library_users → public.attendance_logs
public.admin_meta → (scans) → public.qr_scan_logs
```

### Key Constraints

- **Unique QR Codes:** Each user has exactly one QR code
- **Admin Tracking:** All admin actions are logged with admin_id
- **Referential Integrity:** All foreign keys properly reference parent tables
- **Data Validation:** Check constraints ensure data quality

### Security Features

- **Row Level Security (RLS):** Implemented on public tables
- **Admin Separation:** Admin metadata separate from user data
- **Audit Trail:** Comprehensive logging of all activities
- **Invite System:** Controlled admin onboarding

