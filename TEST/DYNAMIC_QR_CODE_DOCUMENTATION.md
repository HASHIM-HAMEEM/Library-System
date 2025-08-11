# Dynamic QR Code System Documentation

## Overview

The Dynamic QR Code System is a secure, time-based authentication mechanism that generates unique QR codes for approved users. These QR codes are automatically refreshed every 20 minutes and are used for library access control.

## Key Features

- **Automatic Generation**: QR codes are generated automatically when a user is approved
- **Dynamic Refresh**: QR codes change every 20 minutes for enhanced security
- **Firebase Storage**: All QR data is stored securely in Firebase Firestore
- **Encryption**: QR data is encrypted using AES encryption
- **Validation**: Real-time validation with subscription and expiry checks
- **Audit Trail**: Comprehensive logging of all scan attempts

## System Architecture

### Components

1. **DynamicQRService** - Core service for QR code management
2. **AuthStore** - User authentication and approval integration
3. **QRScanner** - QR code scanning component
4. **Firebase Collections** - Data storage and management

### Data Flow

```
User Approval → QR Generation → Firebase Storage → QR Refresh Cycle → Scanner Validation
```

## Technical Implementation

### 1. QR Code Generation Process

#### When QR Codes are Generated
- **Trigger**: Automatically when a user status changes to 'verified' (approved)
- **Location**: Admin dashboard user approval process
- **Service**: `DynamicQRService.generateInitialQRCode()`

#### QR Code Data Structure
```typescript
interface DynamicQRData {
  userId: string;              // Unique user identifier
  fullName: string;            // User's full name
  email: string;               // User's email address
  subscriptionValidUntil: string; // Subscription expiry date
  role: string;                // User role (student, faculty, etc.)
  institutionId?: string;      // Institution identifier
  profilePicUrl?: string;      // Profile picture URL
  generatedAt: string;         // QR generation timestamp
  expiresAt: string;           // QR expiry timestamp (20 minutes)
  qrId: string;                // Unique QR identifier
  version: number;             // Version number for tracking
}
```

#### QR Code Payload Structure
```typescript
interface DynamicQRPayload {
  data: string;        // Encrypted QR data
  hash: string;        // Security hash for verification
  qrId: string;        // Unique QR identifier
  version: number;     // Version number
  expiresAt: string;   // Expiry timestamp
}
```

### 2. QR Code Refresh Mechanism

#### Automatic Refresh Cycle
- **Frequency**: Every 20 minutes
- **Method**: `DynamicQRService.startQRRefreshCycle(userId)`
- **Trigger**: Started automatically after initial QR generation
- **Process**:
  1. Generate new QR data with updated timestamps
  2. Increment version number
  3. Deactivate previous QR codes
  4. Store new QR code in Firebase
  5. Schedule next refresh

#### Refresh Implementation
```typescript
static startQRRefreshCycle(userId: string): void {
  // Clear any existing interval
  if (this.refreshIntervals.has(userId)) {
    clearInterval(this.refreshIntervals.get(userId)!);
  }

  // Set up new refresh interval (20 minutes)
  const interval = setInterval(async () => {
    try {
      await this.refreshQRCode(userId);
    } catch (error) {
      console.error(`Failed to refresh QR code for user ${userId}:`, error);
    }
  }, QR_VALIDITY_DURATION); // 20 minutes

  this.refreshIntervals.set(userId, interval);
}
```

### 3. Firebase Storage Structure

#### Collections Used

##### `qr_codes` Collection
```javascript
{
  id: "auto-generated-id",
  userId: "user-id",
  qrId: "unique-qr-identifier",
  version: 1,
  qrData: "encrypted-qr-payload",
  qrCodeUrl: "data:image/png;base64,...",
  generatedAt: "2024-01-01T10:00:00Z",
  expiresAt: "2024-01-01T10:20:00Z",
  isActive: true,
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

##### `user_profiles` Collection (Updated Fields)
```javascript
{
  // ... existing user fields
  qr_data: "encrypted-qr-payload",
  qr_code_url: "data:image/png;base64,...",
  qr_generated_at: "2024-01-01T10:00:00Z",
  qr_expires_at: "2024-01-01T10:20:00Z",
  qr_version: 1
}
```

##### `scan_logs` Collection
```javascript
{
  id: "auto-generated-id",
  user_id: "user-id",
  user_name: "User Name",
  user_email: "user@example.com",
  scan_type: "entry" | "exit",
  scan_time: "2024-01-01T10:05:00Z",
  location: "main_entrance",
  scanned_by: "admin-id",
  status: "success" | "failed",
  result: "granted" | "denied",
  subscription_valid: true,
  qr_data: "encrypted-qr-payload",
  error_message?: "Error description",
  created_at: Timestamp
}
```

### 4. QR Code Validation Process

#### Validation Steps
1. **Parse QR Payload**: Extract encrypted data and metadata
2. **Verify Hash**: Ensure data integrity
3. **Decrypt Data**: Decrypt the QR payload
4. **Check Expiry**: Verify QR code hasn't expired (20 minutes)
5. **Validate User**: Check user exists and is active
6. **Check Subscription**: Verify subscription is valid
7. **Log Scan**: Record scan attempt in audit trail

#### Validation Implementation
```typescript
static async validateQRCode(qrData: string, scannedBy: string): Promise<{
  success: boolean;
  isValid: boolean;
  userData?: any;
  scanData?: DynamicQRData;
  error?: string;
}> {
  try {
    // Parse and validate QR payload
    const qrPayload: DynamicQRPayload = JSON.parse(qrData);
    
    // Verify hash for data integrity
    const calculatedHash = this.generateHash(qrPayload.data);
    if (calculatedHash !== qrPayload.hash) {
      throw new Error('QR code verification failed');
    }
    
    // Decrypt and parse QR data
    const decryptedData = this.decryptData(qrPayload.data);
    const userData: DynamicQRData = JSON.parse(decryptedData);
    
    // Check QR code expiry (20 minutes)
    const now = new Date();
    const expiresAt = new Date(userData.expiresAt);
    if (now > expiresAt) {
      throw new Error('QR code has expired');
    }
    
    // Validate user and subscription...
    // Return validation result
  } catch (error) {
    // Handle validation errors
  }
}
```

## Integration Points

### 1. User Approval Process

#### In `authStore.ts`
```typescript
const verifyUser = async (userId: string, status: 'verified' | 'rejected', adminId: string) => {
  // ... existing verification logic
  
  if (status === 'verified') {
    // Generate initial QR code for approved user
    try {
      const qrResult = await DynamicQRService.generateInitialQRCode(userId);
      if (!qrResult.success) {
        console.error('Failed to generate QR code:', qrResult.error);
      }
    } catch (error) {
      console.error('Error generating QR code:', error);
    }
  } else {
    // Deactivate QR codes for rejected users
    await DynamicQRService.deactivateUserQRCodes(userId);
  }
};
```

#### In `PendingUsersScreen.tsx`
```typescript
const handleApproveUser = async (userId: string) => {
  try {
    // Approve user
    await verifyUser(userId, 'verified', currentAdmin?.id || '');
    
    // Generate QR code
    const qrResult = await DynamicQRService.generateInitialQRCode(userId);
    if (qrResult.success) {
      toast.success('User approved and QR code generated successfully!');
    } else {
      toast.warning('User approved but QR code generation failed');
    }
  } catch (error) {
    toast.error('Failed to approve user');
  }
};
```

### 2. QR Scanner Integration

#### In `QRScanner.tsx`
```typescript
const handleScanSuccess = async (decodedText: string) => {
  try {
    // Validate QR code using dynamic service
    const validation = await DynamicQRService.validateQRCode(
      decodedText, 
      currentAdmin?.id || 'unknown'
    );
    
    if (validation.success && validation.isValid) {
      // Grant access
      toast.success(`Access granted for ${validation.userData.name}`);
    } else {
      // Deny access
      toast.error(validation.error || 'Access denied');
    }
  } catch (error) {
    toast.error('Invalid QR code');
  }
};
```

## Security Features

### 1. Encryption
- **Algorithm**: AES encryption using CryptoJS
- **Key**: Static encryption key (should be environment variable in production)
- **Data**: All QR payload data is encrypted before storage

### 2. Hash Verification
- **Purpose**: Ensure data integrity and prevent tampering
- **Algorithm**: SHA-256 hash of encrypted data
- **Validation**: Hash is verified during QR code validation

### 3. Time-Based Expiry
- **Duration**: 20 minutes validity period
- **Enforcement**: Strict expiry checking during validation
- **Automatic Refresh**: New QR codes generated before expiry

### 4. Version Control
- **Purpose**: Track QR code versions and prevent replay attacks
- **Implementation**: Incremental version numbers
- **Validation**: Only latest version accepted

## Error Handling

### Common Error Scenarios

1. **QR Code Expired**
   - **Error**: "QR code has expired"
   - **Solution**: User needs to refresh their QR code

2. **Invalid QR Format**
   - **Error**: "Invalid QR code format"
   - **Solution**: Ensure QR code is generated by the system

3. **User Not Found**
   - **Error**: "User not found in database"
   - **Solution**: Verify user exists and is approved

4. **Subscription Expired**
   - **Error**: "Subscription expired"
   - **Solution**: User needs to renew subscription

5. **Decryption Failed**
   - **Error**: "QR code verification failed"
   - **Solution**: QR code may be corrupted or tampered with

### Error Logging
```typescript
private static async logFailedScan(qrData: string, scannedBy: string, errorMessage: string): Promise<void> {
  try {
    await addDoc(collection(db, 'scan_logs'), {
      user_id: 'unknown',
      user_name: 'Unknown',
      user_email: 'unknown',
      scan_type: 'entry',
      scan_time: new Date().toISOString(),
      location: 'unknown',
      scanned_by: scannedBy,
      status: 'failed',
      result: 'denied',
      subscription_valid: false,
      qr_data: qrData.substring(0, 100), // Log first 100 chars for debugging
      error_message: errorMessage,
      created_at: Timestamp.now()
    });
  } catch (error) {
    console.error('Failed to log scan error:', error);
  }
}
```

## Monitoring and Maintenance

### 1. QR Code Cleanup
```typescript
static async cleanupExpiredQRCodes(): Promise<void> {
  try {
    const now = new Date();
    const expiredQuery = query(
      collection(db, 'qr_codes'),
      where('expiresAt', '<', now.toISOString()),
      where('isActive', '==', true)
    );
    
    const expiredDocs = await getDocs(expiredQuery);
    
    for (const docSnapshot of expiredDocs.docs) {
      await updateDoc(doc(db, 'qr_codes', docSnapshot.id), {
        isActive: false,
        updatedAt: Timestamp.now()
      });
    }
  } catch (error) {
    console.error('Error cleaning up expired QR codes:', error);
  }
}
```

### 2. Refresh Cycle Management
```typescript
static async initializeQRRefreshCycles(): Promise<void> {
  try {
    // Get all active users with QR codes
    const activeUsersQuery = query(
      collection(db, 'user_profiles'),
      where('status', '==', 'verified'),
      where('is_active', '==', true)
    );
    
    const activeUsers = await getDocs(activeUsersQuery);
    
    // Start refresh cycles for all active users
    for (const userDoc of activeUsers.docs) {
      const userData = userDoc.data();
      if (userData.qr_data) {
        this.startQRRefreshCycle(userDoc.id);
      }
    }
  } catch (error) {
    console.error('Error initializing QR refresh cycles:', error);
  }
}
```

## Usage Examples

### 1. Generate QR Code for New User
```typescript
// When approving a user
const approveUser = async (userId: string) => {
  try {
    // Update user status
    await updateUserStatus(userId, 'verified');
    
    // Generate QR code
    const qrResult = await DynamicQRService.generateInitialQRCode(userId);
    
    if (qrResult.success) {
      console.log('QR code generated:', qrResult.qrCodeUrl);
      // QR refresh cycle starts automatically
    } else {
      console.error('QR generation failed:', qrResult.error);
    }
  } catch (error) {
    console.error('Error approving user:', error);
  }
};
```

### 2. Scan QR Code
```typescript
// In QR scanner component
const scanQRCode = async (qrData: string) => {
  try {
    const result = await DynamicQRService.validateQRCode(
      qrData, 
      currentAdminId
    );
    
    if (result.success && result.isValid) {
      // Grant access
      showSuccessMessage(`Welcome ${result.userData.name}!`);
      logEntry(result.userData);
    } else {
      // Deny access
      showErrorMessage(result.error || 'Access denied');
    }
  } catch (error) {
    showErrorMessage('Invalid QR code');
  }
};
```

### 3. Manual QR Refresh
```typescript
// For manual QR refresh (if needed)
const refreshUserQR = async (userId: string) => {
  try {
    const result = await DynamicQRService.refreshQRCode(userId);
    
    if (result.success) {
      console.log('QR code refreshed successfully');
      return result.qrCodeUrl;
    } else {
      console.error('QR refresh failed:', result.error);
      return null;
    }
  } catch (error) {
    console.error('Error refreshing QR:', error);
    return null;
  }
};
```

## Best Practices

### 1. Security
- Store encryption keys in environment variables
- Implement rate limiting for QR validation
- Regular cleanup of expired QR codes
- Monitor for suspicious scan patterns

### 2. Performance
- Cache user data for faster validation
- Batch QR code operations when possible
- Implement proper error handling and retries
- Monitor Firebase usage and costs

### 3. User Experience
- Provide clear error messages
- Show QR expiry time to users
- Implement offline fallback mechanisms
- Regular testing of QR scanner functionality

### 4. Maintenance
- Regular cleanup of expired data
- Monitor QR refresh cycles
- Backup QR code data
- Performance monitoring and optimization

## Troubleshooting

### Common Issues

1. **QR Code Not Generating**
   - Check user approval status
   - Verify Firebase permissions
   - Check encryption key configuration

2. **QR Scanner Not Working**
   - Verify camera permissions
   - Check QR code format
   - Ensure proper lighting

3. **Validation Failures**
   - Check QR code expiry
   - Verify user subscription status
   - Check Firebase connectivity

4. **Refresh Cycle Issues**
   - Monitor refresh intervals
   - Check for memory leaks
   - Verify Firebase write permissions

### Debug Tools

```typescript
// Enable debug logging
const DEBUG_MODE = process.env.NODE_ENV === 'development';

if (DEBUG_MODE) {
  console.log('QR Debug Info:', {
    qrId: qrData.qrId,
    version: qrData.version,
    expiresAt: qrData.expiresAt,
    userId: qrData.userId
  });
}
```

## Conclusion

The Dynamic QR Code System provides a secure, automated solution for library access control. With automatic generation upon user approval, 20-minute refresh cycles, and comprehensive validation, it ensures both security and user convenience. The system is designed to be maintainable, scalable, and secure, with proper error handling and monitoring capabilities.

For any issues or questions, refer to the troubleshooting section or contact the development team.