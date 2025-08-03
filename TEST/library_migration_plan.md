# Library Management System Migration Plan

## Overview
This document outlines the migration from the current Private Library Access App schema to the Cross-Platform Library Management System as specified in the crossDev requirements.

## Current Schema Analysis

### Existing Tables (Current Implementation)
- `user_profiles` - User metadata with subscription info
- `attendance_logs` - Entry/exit tracking
- `subscriptions` - Subscription management
- `qr_scan_logs` - QR scan audit logs
- `scan_logs` - Entry/exit tracking (from QR system migration)
- `qr_codes` - QR code management
- `admin_invites` - Admin invitation system

### Required Tables (CrossDev Specification)
- `library_users` - Simplified user metadata linked to auth.users
- `scan_logs` - Entry/exit tracking at library entrance
- `admin_meta` - Admin metadata (optional)

## Migration Strategy

### Phase 1: Create New Schema Structure
1. Create `library_users` table as specified
2. Modify existing `scan_logs` to match crossDev requirements
3. Create `admin_meta` table for admin metadata
4. Set up proper RLS policies

### Phase 2: Data Migration
1. Migrate data from `user_profiles` to `library_users`
2. Consolidate scan data into the new `scan_logs` structure
3. Create admin metadata entries

### Phase 3: Integration Setup
1. Create RPC functions for smooth SDK integration
2. Set up Flutter app integration scripts
3. Update Web Admin integration
4. Create testing scripts

## Implementation Files to Create

1. **Migration Files**
   - `20240105000000_library_system_migration.sql`
   - `data_migration_script.sql`

2. **Integration Scripts**
   - `flutter_integration_guide.md`
   - `web_admin_integration.js`
   - `rpc_functions.sql`

3. **Testing & Documentation**
   - `library_system_test.js`
   - `schema_comparison.md`
   - `deployment_checklist.md`

## Key Differences

### Current vs Required Schema

| Current | Required | Action |
|---------|----------|--------|
| `user_profiles` (complex) | `library_users` (simple) | Create new table, migrate data |
| `attendance_logs` + `scan_logs` | `scan_logs` (unified) | Consolidate into single table |
| No admin metadata | `admin_meta` | Create new table |
| Complex RLS policies | Simple RLS policies | Simplify and update |

## Next Steps

1. Create the migration SQL file
2. Implement RPC functions for SDK integration
3. Create data migration scripts
4. Set up testing framework
5. Document integration guides for Flutter and Web Admin

This migration will enable seamless cross-platform integration between Flutter app and Web Admin while maintaining data integrity and security through proper RLS policies.