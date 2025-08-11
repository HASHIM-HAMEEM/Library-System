import QRCode from 'qrcode';
import { db } from './firebase';
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  setDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  Timestamp,
  deleteDoc 
} from 'firebase/firestore';
import CryptoJS from 'crypto-js';
import KeyService from './keyService';

// QR code validity duration (20 minutes)
const QR_VALIDITY_DURATION = 20 * 60 * 1000; // 20 minutes in milliseconds

interface DynamicQRData {
  userId: string;
  fullName: string;
  email: string;
  subscriptionValidUntil: string;
  role: string;
  institutionId?: string;
  profilePicUrl?: string;
  generatedAt: string;
  expiresAt: string;
  qrId: string; // Unique identifier for this QR code
  version: number; // Version number for tracking QR updates
}

interface DynamicQRPayload {
  data: string;
  hash: string;
  qrId: string;
  version: number;
  expiresAt: string;
}

interface QRCodeRecord {
  id?: string;
  userId: string;
  qrId: string;
  version: number;
  qrData: string;
  qrCodeUrl: string;
  generatedAt: string;
  expiresAt: string;
  isActive: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

class DynamicQRService {
  // Use KeyService as single source of truth for AES keys
  // Fallback to environment variable only if KeyService is unavailable
  private static getRawAESKey(): string {
    try {
      const keyFromService = KeyService.getCachedKeySync();
      if (keyFromService) {
        // Ensure we use the raw string key, not base64 encoded
        return keyFromService.trim();
      }
    } catch (error) {
      console.warn('[DynamicQRService] KeyService getCachedKeySync failed:', error);
      const allowFallback = import.meta.env?.VITE_ALLOW_KEY_FALLBACK === 'true';
      if (allowFallback) {
        const envKey = (import.meta.env.VITE_AES_KEY || 'LibraryQRSecureKey2024!@#$%^&*').trim();
        console.warn('[DynamicQRService] Using env fallback key (dev only) due to centralized key unavailability');
        return envKey;
      }
      throw new Error('[DynamicQRService] Centralized AES key unavailable. Fix App Check/auth to fetch key from KeyService or enable VITE_ALLOW_KEY_FALLBACK=true for local dev.');
    }
    // If we reached here without returning, treat as error since centralized key must be present
    throw new Error('[DynamicQRService] Centralized AES key missing.');
  }

  private static getPaddedAESKey(): string {
    return this.getRawAESKey().padEnd(32, '0').slice(0, 32);
  }

  private static refreshIntervals: Map<string, NodeJS.Timeout> = new Map();

  /**
   * Test encryption/decryption cycle for debugging
   */
  static testEncryptionCycle(): boolean {
    try {
      const testData = JSON.stringify({
        userId: 'test-user-123',
        fullName: 'Test User',
        email: 'test@example.com',
        timestamp: new Date().toISOString()
      });
      
      console.log('[QR Debug] Testing encryption cycle with data:', testData);
      
      // Test encryption
      const encrypted = this.encryptData(testData);
      console.log('[QR Debug] Encryption successful, length:', encrypted.length);
      
      // Test decryption
      const decrypted = this.decryptData(encrypted);
      console.log('[QR Debug] Decryption successful, matches original:', decrypted === testData);
      
      if (decrypted !== testData) {
        console.error('[QR Debug] Encryption cycle failed - data mismatch');
        console.error('[QR Debug] Original:', testData);
        console.error('[QR Debug] Decrypted:', decrypted);
        return false;
      }
      
      console.log('[QR Debug] Encryption cycle test PASSED');
      return true;
    } catch (error) {
      console.error('[QR Debug] Encryption cycle test FAILED:', error);
      return false;
    }
  }

  /**
   * Generate initial QR code for a newly approved user
   */
  static async generateInitialQRCode(userId: string): Promise<{
    success: boolean;
    qrCodeUrl?: string;
    qrData?: string;
    qrId?: string;
    error?: string;
  }> {
    try {
      const result = await this.generateQRCode(userId);
      
      if (result.success) {
        // Start refresh cycle for this user
        this.startQRRefreshCycle(userId);
      }
      
      return result;
    } catch (error: any) {
      console.error('Error generating initial QR code:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Generate QR code for a user
   */
  private static async generateQRCode(userId: string, userData?: any): Promise<{
    success: boolean;
    qrCodeUrl?: string;
    qrData?: string;
    qrId?: string;
    error?: string;
  }> {
    try {
      // If userData not provided, fetch it
      if (!userData) {
        const userDoc = await getDoc(doc(db, 'user_profiles', userId));
        if (!userDoc.exists()) {
          throw new Error('User not found');
        }
        userData = userDoc.data();
      }

      const now = new Date();
      const expiresAt = new Date(now.getTime() + QR_VALIDITY_DURATION);
      const qrId = this.generateQRId();
      
      // Get current version number
      const currentVersion = await this.getCurrentVersion(userId);
      const newVersion = currentVersion + 1;

      // Create QR data - use subscription_end or subscription_valid_until
      const subscriptionEnd = userData.subscription_end || userData.subscription_valid_until || '';
      
      const qrData: DynamicQRData = {
        userId,
        fullName: userData.name,
        email: userData.email,
        subscriptionValidUntil: subscriptionEnd,
        role: userData.role,
        institutionId: userData.institution_id,
        profilePicUrl: userData.profile_picture_url,
        generatedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        qrId,
        version: newVersion,
      };

      // Encrypt data
      const encryptedData = this.encryptData(JSON.stringify(qrData));
      
      // Generate hash for verification
      const hash = this.generateHash(encryptedData);
      
      // Create QR payload
      const qrPayload: DynamicQRPayload = {
        data: encryptedData,
        hash,
        qrId,
        version: newVersion,
        expiresAt: expiresAt.toISOString(),
      };

      const qrString = JSON.stringify(qrPayload);

      // Generate QR code image
      const qrCodeUrl = await QRCode.toDataURL(qrString, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Deactivate previous QR codes
      await this.deactivatePreviousQRCodes(userId);

      // Store QR code record
      const qrRecord: QRCodeRecord = {
        userId,
        qrId,
        version: newVersion,
        qrData: qrString,
        qrCodeUrl,
        generatedAt: now.toISOString(),
        expiresAt: expiresAt.toISOString(),
        isActive: true,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      await addDoc(collection(db, 'qr_codes'), qrRecord);

      // Update user profile with current QR data
      await updateDoc(doc(db, 'user_profiles', userId), {
        qr_data: qrString,
        qr_code_url: qrCodeUrl,
        qr_id: qrId,
        qr_version: newVersion,
        qr_generated_at: now.toISOString(),
        qr_expires_at: expiresAt.toISOString(),
        updated_at: now.toISOString(),
      });

      return {
        success: true,
        qrCodeUrl,
        qrData: qrString,
        qrId,
      };
    } catch (error: any) {
      console.error('Error generating QR code:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Refresh QR code for a user
   */
  static async refreshQRCode(userId: string): Promise<{
    success: boolean;
    qrCodeUrl?: string;
    qrData?: string;
    qrId?: string;
    error?: string;
  }> {
    try {
      return await this.generateQRCode(userId);
    } catch (error: any) {
      console.error('Error refreshing QR code:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Start automatic QR refresh cycle for a user
   */
  static startQRRefreshCycle(userId: string): void {
    // Clear existing interval if any
    this.stopQRRefreshCycle(userId);
    
    // Set up new refresh interval
    const interval = setInterval(async () => {
      try {
        await this.refreshQRCode(userId);
        console.log(`QR code refreshed for user: ${userId}`);
      } catch (error) {
        console.error(`Error refreshing QR code for user ${userId}:`, error);
      }
    }, QR_VALIDITY_DURATION);
    
    this.refreshIntervals.set(userId, interval);
  }

  /**
   * Stop QR refresh cycle for a user
   */
  static stopQRRefreshCycle(userId: string): void {
    const interval = this.refreshIntervals.get(userId);
    if (interval) {
      clearInterval(interval);
      this.refreshIntervals.delete(userId);
    }
  }

  /**
   * Validate QR code - handles both dynamic and static formats
   */
  static async validateQRCode(qrData: string, scannedBy: string): Promise<{
    success: boolean;
    isValid: boolean;
    userData?: any;
    scanData?: DynamicQRData;
    error?: string;
  }> {
    try {
      // Test encryption cycle first to verify it's working
      console.log('[QR Debug] Running encryption cycle test...');
      const encryptionTest = this.testEncryptionCycle();
      if (!encryptionTest) {
        throw new Error('Encryption cycle test failed - system not ready');
      }
      
      console.log('[QR Debug] Starting QR validation:', {
        qrDataLength: qrData.length,
        qrDataPreview: qrData.substring(0, 100) + '...',
        scannedBy,
        rawAesKey: this.getRawAESKey().substring(0, 8) + '...',
        rawKeyLength: this.getRawAESKey().length,
        paddedKeyLength: this.getPaddedAESKey().length
      });
      
      // Validate QR data format before parsing
      console.log('[QR Debug] Raw QR data validation:', {
        dataLength: qrData.length,
        dataType: typeof qrData,
        isEmpty: !qrData,
        startsWithBrace: qrData.trim().startsWith('{'),
        endsWithBrace: qrData.trim().endsWith('}'),
        containsControlChars: /[\x00-\x1F\x7F-\x9F]/.test(qrData),
        firstChars: qrData.substring(0, 50),
        lastChars: qrData.substring(Math.max(0, qrData.length - 50))
      });
      
      // Check for basic QR data issues
      if (!qrData || qrData.length === 0) {
        throw new Error('QR code data is empty');
      }
      
      if (qrData.length < 10) {
        throw new Error('QR code data too short - possibly corrupted');
      }
      
      // Check for control characters that indicate scanning issues
      if (/[\x00-\x1F\x7F-\x9F]/.test(qrData)) {
        console.error('[QR Debug] QR data contains control characters:', {
          hexDump: Array.from(qrData.substring(0, 50)).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' ')
        });
        throw new Error('QR code contains invalid characters - possibly corrupted or incorrectly scanned');
      }
      
      // Parse QR payload - handle both new dynamic format and old static format
      let qrPayload: any;
      
      try {
        qrPayload = JSON.parse(qrData);
        console.log('[QR Debug] Parsed QR payload:', {
          hasData: !!qrPayload.data,
          hasHash: !!qrPayload.hash,
          hasQrId: !!qrPayload.qrId,
          hasExpiresAt: !!qrPayload.expiresAt,
          hasUserId: !!qrPayload.userId,
          hasFullName: !!qrPayload.fullName,
          payloadKeys: Object.keys(qrPayload),
          payloadType: typeof qrPayload
        });
      } catch (parseError) {
        console.error('[QR Debug] QR JSON parse error:', {
          error: parseError.message,
          dataLength: qrData.length,
          dataPreview: qrData.substring(0, 200),
          trimmedData: qrData.trim().substring(0, 100)
        });
        
        // Provide more specific error messages
        if (parseError.message.includes('Unexpected token')) {
          const match = parseError.message.match(/Unexpected token '(.+?)'/); 
          const unexpectedChar = match ? match[1] : 'unknown';
          throw new Error(`Invalid QR code format - contains unexpected character '${unexpectedChar}' at position. This may be a corrupted QR code or wrong QR type.`);
        } else if (parseError.message.includes('Unexpected end')) {
          throw new Error('Invalid QR code format - incomplete JSON data. The QR code appears to be truncated or corrupted.');
        } else {
          throw new Error(`Invalid QR code format - not valid JSON: ${parseError.message}`);
        }
      }

      // Check if this is the new dynamic QR format
      if (qrPayload.data && qrPayload.hash && qrPayload.qrId && qrPayload.expiresAt) {
        console.log('[QR Debug] Detected dynamic QR format');
        return await this.validateDynamicQR(qrPayload, scannedBy);
      }
      
      // Check if this is the old static QR format
      if (qrPayload.userId || qrPayload.fullName) {
        console.log('[QR Debug] Detected static QR format');
        return await this.validateStaticQR(qrPayload, scannedBy);
      }
      
      console.error('[QR Debug] Unknown QR format:', qrPayload);
      throw new Error('Invalid QR code structure - unknown format');
    } catch (error: any) {
      console.error('[QR Debug] QR validation error:', error);
      
      // Output debug values for Flutter comparison when validation fails
      console.log('[QR Debug] Running debug encryption values for Flutter comparison...');
      this.debugEncryptionValues();
      
      await this.logFailedScan(qrData, scannedBy, error.message);
      return {
        success: false,
        isValid: false,
        error: error.message,
      };
    }
  }

  /**
   * Validate dynamic QR code format
   */
  private static async validateDynamicQR(qrPayload: DynamicQRPayload, scannedBy: string): Promise<{
    success: boolean;
    isValid: boolean;
    userData?: any;
    scanData?: DynamicQRData;
    error?: string;
  }> {
    const now = new Date();
    
    // Check if QR code has expired
    const expiresAt = new Date(qrPayload.expiresAt);
    if (now > expiresAt) {
      throw new Error('QR code has expired');
    }

    const encryptedData = qrPayload.data;
    const providedHash = qrPayload.hash;

    // Enhanced hash verification debugging
    const rawKey = this.getRawAESKey();
    console.log('[QR Debug] Hash Verification Details:', {
      encryptedData: encryptedData,
      encryptedDataLength: encryptedData.length,
      providedHash: providedHash,
      rawAesKey: rawKey,
      rawAesKeyLength: rawKey.length,
      hashInput: encryptedData + rawKey,
      hashInputLength: (encryptedData + rawKey).length
    });

    // Verify hash
    const calculatedHash = this.generateHash(encryptedData);
    
    console.log('[QR Debug] Hash Comparison:', {
      providedHash: providedHash,
      calculatedHash: calculatedHash,
      hashesMatch: calculatedHash === providedHash,
      providedHashLength: providedHash.length,
      calculatedHashLength: calculatedHash.length
    });
    
    if (calculatedHash !== providedHash) {
      console.error('[QR Debug] HASH MISMATCH DETECTED!');
      console.error('[QR Debug] Encrypted data:', encryptedData);
      console.error('[QR Debug] Encrypted data length:', encryptedData.length);
      console.error('[QR Debug] Raw AES key:', rawKey);
      console.error('[QR Debug] Raw AES key length:', rawKey.length);
      console.error('[QR Debug] Hash input:', encryptedData + rawKey);
      console.error('[QR Debug] Hash input length:', (encryptedData + rawKey).length);
      console.error('[QR Debug] Expected (from Flutter):', providedHash);
      console.error('[QR Debug] Calculated (by Web):', calculatedHash);
      console.error('[QR Debug] Input for hash calculation:', encryptedData + rawKey);
      throw new Error('QR code verification failed');
    }

    // Decrypt data with enhanced debugging
    let decryptedData: string;
    let userData: DynamicQRData;
    
    console.log('[QR Debug] Pre-decryption analysis:', {
      encryptedDataLength: encryptedData.length,
      encryptedDataPreview: encryptedData.substring(0, 100),
      isValidBase64: /^[A-Za-z0-9+/]*={0,2}$/.test(encryptedData),
      base64Padding: encryptedData.length % 4,
      keyBeingUsed: this.getPaddedAESKey().substring(0, 8) + '...',
      keyLength: this.getPaddedAESKey().length
    });
    
    try {
      console.log('[QR Debug] Attempting to decrypt QR data...');
      decryptedData = this.decryptData(encryptedData);
      
      console.log('[QR Debug] Decryption completed:', {
        success: true,
        dataLength: decryptedData.length,
        dataType: typeof decryptedData,
        isEmpty: !decryptedData,
        containsControlChars: /[\x00-\x1F\x7F-\x9F]/.test(decryptedData),
        startsWithBrace: decryptedData.trim().startsWith('{'),
        dataPreview: decryptedData.substring(0, 100),
        charCodes: Array.from(decryptedData.substring(0, 20)).map(c => c.charCodeAt(0))
      });
      
    } catch (decryptError: any) {
      console.error('[QR Debug] Decryption failed with detailed analysis:', {
        error: decryptError.message,
        encryptedData: encryptedData,
        encryptedLength: encryptedData.length,
        keyUsed: this.getPaddedAESKey(),
        rawKey: this.getRawAESKey(),
        hashMatched: true // We already verified hash above
      });
      
      // Provide specific error messages based on the type of decryption failure
      if (decryptError.message?.includes('Malformed UTF-8')) {
        throw new Error('QR code encoding incompatible - this QR code was generated with a different encoding format. Please regenerate the QR code.');
      } else if (decryptError.message?.includes('key mismatch') || decryptError.message?.includes('encryption key/method mismatch')) {
        throw new Error('QR code decryption failed - encryption parameters mismatch between Flutter and web app. Check AES key, IV, mode, and padding settings.');
      } else if (decryptError.message?.includes('corrupted data')) {
        throw new Error('QR code data corrupted - the QR code appears to be damaged. Please regenerate the QR code.');
      } else if (decryptError.message?.includes('control characters') || decryptError.message?.includes('invalid characters')) {
        throw new Error('QR code decryption failed - data contains invalid characters, likely due to encryption parameter mismatch');
      } else if (decryptError.message?.includes('all encoding methods') || decryptError.message?.includes('Base64 fallback')) {
        throw new Error('QR code format incompatible - unable to decode with any supported encoding method. Flutter app may be using different encryption than expected.');
      } else {
        throw new Error(`QR code decryption failed - ${decryptError.message}. Please regenerate the QR code.`);
      }
    }
    
    // Validate decrypted data before JSON parsing
    console.log('[QR Debug] Validating decrypted data:', {
      dataLength: decryptedData.length,
      dataType: typeof decryptedData,
      isEmpty: !decryptedData,
      startsWithBrace: decryptedData.trim().startsWith('{'),
      endsWithBrace: decryptedData.trim().endsWith('}'),
      containsGarbledChars: /[\x00-\x1F\x7F-\x9F]/.test(decryptedData),
      firstChars: decryptedData.substring(0, 20),
      lastChars: decryptedData.substring(Math.max(0, decryptedData.length - 20))
    });
    
    // Check for common issues with decrypted data
    if (!decryptedData || decryptedData.length === 0) {
      throw new Error('QR code decryption resulted in empty data - possible encryption key mismatch');
    }
    
    // Check for garbled characters that indicate decryption failure
    if (/[\x00-\x1F\x7F-\x9F]/.test(decryptedData)) {
      console.error('[QR Debug] Decrypted data contains control characters:', {
        hexDump: Array.from(decryptedData.substring(0, 50)).map(c => c.charCodeAt(0).toString(16).padStart(2, '0')).join(' '),
        charCodes: Array.from(decryptedData.substring(0, 20)).map(c => c.charCodeAt(0))
      });
      throw new Error('QR code decryption failed - data contains invalid characters. This usually indicates an encryption key mismatch between Flutter and web app.');
    }
    
    // Check if data looks like JSON
    const trimmedData = decryptedData.trim();
    if (!trimmedData.startsWith('{') && !trimmedData.startsWith('[')) {
      console.error('[QR Debug] Decrypted data does not appear to be JSON:', {
        firstChar: trimmedData.charAt(0),
        firstCharCode: trimmedData.charCodeAt(0),
        dataPreview: trimmedData.substring(0, 100)
      });
      throw new Error('QR code decryption produced invalid format - expected JSON data but got: ' + trimmedData.substring(0, 50));
    }
    
    try {
      userData = JSON.parse(decryptedData);
      console.log('[QR Debug] Successfully parsed user data:', {
        userId: userData.userId,
        fullName: userData.fullName,
        email: userData.email,
        hasRequiredFields: !!(userData.userId && userData.fullName && userData.email)
      });
      
      // Validate required fields
      if (!userData.userId || !userData.fullName || !userData.email) {
        throw new Error('QR code data missing required fields (userId, fullName, email)');
      }
      
    } catch (parseError) {
      console.error('[QR Debug] JSON parsing failed:', {
        error: parseError.message,
        dataLength: decryptedData.length,
        dataPreview: decryptedData.substring(0, 200),
        isValidJson: false
      });
      
      // Try to provide more specific error message
      if (parseError.message.includes('Unexpected token')) {
        const match = parseError.message.match(/Unexpected token '(.+?)'/); 
        const unexpectedChar = match ? match[1] : 'unknown';
        throw new Error(`QR code contains invalid JSON - unexpected character '${unexpectedChar}'. This indicates the QR code was not properly encrypted or uses a different encryption method.`);
      } else {
        throw new Error(`QR code data format error: ${parseError.message}. Raw data: ${decryptedData.substring(0, 100)}`);
      }
    }

    // Verify QR code is still active in database
    console.log('[QR Debug] Searching for QR code in Firestore:', {
      qrId: qrPayload.qrId,
      searchingFor: 'qr_codes collection with isActive=true',
      timestamp: new Date().toISOString()
    });
    
    const qrQuery = query(
      collection(db, 'qr_codes'),
      where('qrId', '==', qrPayload.qrId),
      where('isActive', '==', true)
    );
    
    const qrSnapshot = await getDocs(qrQuery);
    
    console.log('[QR Debug] Firestore query results:', {
      qrId: qrPayload.qrId,
      documentsFound: qrSnapshot.size,
      isEmpty: qrSnapshot.empty,
      queryType: 'active QR codes'
    });
    
    if (qrSnapshot.empty) {
      // Additional debugging: Check if QR code exists but is inactive
      console.log('[QR Debug] No active QR found, checking for inactive QR codes...');
      
      const inactiveQrQuery = query(
        collection(db, 'qr_codes'),
        where('qrId', '==', qrPayload.qrId),
        where('isActive', '==', false)
      );
      
      const inactiveSnapshot = await getDocs(inactiveQrQuery);
      
      console.log('[QR Debug] Inactive QR check results:', {
        qrId: qrPayload.qrId,
        inactiveDocumentsFound: inactiveSnapshot.size,
        hasInactiveVersion: !inactiveSnapshot.empty
      });
      
      // Check if ANY QR codes exist for this qrId (regardless of isActive)
      const anyQrQuery = query(
        collection(db, 'qr_codes'),
        where('qrId', '==', qrPayload.qrId)
      );
      
      const anySnapshot = await getDocs(anyQrQuery);
      
      console.log('[QR Debug] Any QR code check results:', {
        qrId: qrPayload.qrId,
        totalDocumentsFound: anySnapshot.size,
        documents: anySnapshot.docs.map(doc => ({
          id: doc.id,
          data: doc.data(),
          isActive: doc.data().isActive,
          expiresAt: doc.data().expiresAt,
          generatedAt: doc.data().generatedAt
        }))
      });
      
      // Check if there are ANY qr_codes documents at all (debugging collection access)
      const allQrQuery = query(collection(db, 'qr_codes'), limit(5));
      const allSnapshot = await getDocs(allQrQuery);
      
      console.log('[QR Debug] Collection access check:', {
        totalQrCodesInCollection: allSnapshot.size,
        canAccessCollection: !allSnapshot.empty,
        sampleDocuments: allSnapshot.docs.map(doc => ({
          id: doc.id,
          qrId: doc.data().qrId,
          isActive: doc.data().isActive,
          userId: doc.data().userId
        }))
      });
      
      if (!inactiveSnapshot.empty) {
        throw new Error('QR code has been deactivated (newer QR code generated)');
      } else if (anySnapshot.empty) {
        throw new Error('QR code not found in database (may not have been generated properly)');
      } else {
        throw new Error('QR code exists but is not active');
      }
    }

    // Verify user still exists and is active
    const userDoc = await getDoc(doc(db, 'user_profiles', userData.userId));
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const currentUserData = userDoc.data();
    
    if (currentUserData.status !== 'verified' || currentUserData.subscription_status !== 'active') {
      throw new Error('User account is not active');
    }

    // Check subscription validity
    const subscriptionEnd = currentUserData.subscription_end || currentUserData.subscription_valid_until;
    if (subscriptionEnd) {
      const subEnd = new Date(subscriptionEnd);
      if (subEnd < now) {
        throw new Error('User subscription has expired');
      }
    }

    // Log successful scan
    await this.logScan({
      user_id: userData.userId,
      user_name: userData.fullName,
      user_email: userData.email,
      scan_type: 'entry',
      scan_time: now.toISOString(),
      location: 'main_entrance',
      scanned_by: scannedBy,
      status: 'success',
      result: 'granted',
      subscription_valid: true,
      qr_data: JSON.stringify(qrPayload),
      qr_id: qrPayload.qrId,
      qr_version: qrPayload.version,
    });

    return {
      success: true,
      isValid: true,
      userData: {
        id: userData.userId,
        name: userData.fullName,
        email: userData.email,
        role: userData.role,
        status: currentUserData.status,
        subscription_status: currentUserData.subscription_status,
        subscription_end: subscriptionEnd,
        profile_picture_url: userData.profilePicUrl,
      },
      scanData: userData,
    };
  }

  /**
   * Validate static QR code format (legacy)
   */
  private static async validateStaticQR(qrPayload: any, scannedBy: string): Promise<{
    success: boolean;
    isValid: boolean;
    userData?: any;
    scanData?: any;
    error?: string;
  }> {
    const now = new Date();
    
    // For old static QR codes, validate user directly
    const userId = qrPayload.userId;
    if (!userId) {
      throw new Error('Invalid QR code: missing user ID');
    }

    const userDoc = await getDoc(doc(db, 'user_profiles', userId));
    
    if (!userDoc.exists()) {
      throw new Error('User not found');
    }

    const userData = userDoc.data();
    
    if (userData.status !== 'verified' || userData.subscription_status !== 'active') {
      throw new Error('User account is not active');
    }

    // Check subscription validity
    const subscriptionEnd = userData.subscription_end || userData.subscription_valid_until;
    if (subscriptionEnd) {
      const subEnd = new Date(subscriptionEnd);
      if (subEnd < now) {
        throw new Error('User subscription has expired');
      }
    }

    // Log successful scan
    await this.logScan({
      user_id: userId,
      user_name: userData.name || qrPayload.fullName,
      user_email: userData.email || qrPayload.email,
      scan_type: 'entry',
      scan_time: now.toISOString(),
      location: 'main_entrance',
      scanned_by: scannedBy,
      status: 'success',
      result: 'granted',
      subscription_valid: true,
      qr_data: JSON.stringify(qrPayload),
    });

    return {
      success: true,
      isValid: true,
      userData: {
        id: userId,
        name: userData.name || qrPayload.fullName,
        email: userData.email || qrPayload.email,
        role: userData.role,
        status: userData.status,
        subscription_status: userData.subscription_status,
        subscription_end: subscriptionEnd,
        profile_picture_url: userData.profile_picture_url,
      },
      scanData: qrPayload,
    };
  }

  /**
   * Get current QR code for a user
   */
  static async getCurrentQRCode(userId: string): Promise<{
    success: boolean;
    qrCodeUrl?: string;
    qrData?: string;
    expiresAt?: string;
    error?: string;
  }> {
    try {
      const userDoc = await getDoc(doc(db, 'user_profiles', userId));
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }
      
      const userData = userDoc.data();
      
      if (!userData.qr_code_url || !userData.qr_data || !userData.qr_expires_at) {
        // Generate new QR code if none exists
        return await this.generateQRCode(userId, userData);
      }
      
      // Check if current QR code is still valid
      const expiresAt = new Date(userData.qr_expires_at);
      const now = new Date();
      
      if (now >= expiresAt) {
        // Generate new QR code if expired
        return await this.generateQRCode(userId, userData);
      }
      
      return {
        success: true,
        qrCodeUrl: userData.qr_code_url,
        qrData: userData.qr_data,
        expiresAt: userData.qr_expires_at,
      };
    } catch (error: any) {
      console.error('Error getting current QR code:', error);
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Deactivate all QR codes for a user
   */
  static async deactivateUserQRCodes(userId: string): Promise<void> {
    try {
      // Stop refresh cycle
      this.stopQRRefreshCycle(userId);
      
      // Deactivate QR codes in database
      await this.deactivatePreviousQRCodes(userId);
      
      // Clear QR data from user profile
      await updateDoc(doc(db, 'user_profiles', userId), {
        qr_data: null,
        qr_code_url: null,
        qr_id: null,
        qr_version: null,
        qr_generated_at: null,
        qr_expires_at: null,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error deactivating user QR codes:', error);
    }
  }

  /**
   * Generate unique QR ID
   */
  private static generateQRId(): string {
    return `qr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get current version number for user's QR codes
   */
  private static async getCurrentVersion(userId: string): Promise<number> {
    try {
      // Use a simpler query without compound index to avoid Firebase index requirement
      const qrQuery = query(
        collection(db, 'qr_codes'),
        where('userId', '==', userId)
      );
      
      const qrSnapshot = await getDocs(qrQuery);
      
      if (qrSnapshot.empty) {
        return 0;
      }
      
      // Sort in memory to avoid compound index requirement
      const qrDocs = qrSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() as any }));
      qrDocs.sort((a, b) => (b.version || 0) - (a.version || 0));
      
      return qrDocs[0]?.version || 0;
    } catch (error) {
      console.error('Error getting current version:', error);
      return 0;
    }
  }

  /**
   * Deactivate previous QR codes for a user
   */
  private static async deactivatePreviousQRCodes(userId: string): Promise<void> {
    try {
      const qrQuery = query(
        collection(db, 'qr_codes'),
        where('userId', '==', userId),
        where('isActive', '==', true)
      );
      
      const qrSnapshot = await getDocs(qrQuery);
      
      const updatePromises = qrSnapshot.docs.map(doc => 
        updateDoc(doc.ref, {
          isActive: false,
          updatedAt: Timestamp.now(),
        })
      );
      
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error deactivating previous QR codes:', error);
    }
  }

  /**
   * Encrypt data using AES-256-CBC with zero IV
   */
  private static encryptData(data: string): string {
    try {
      const rawKey = this.getRawAESKey();
      const paddedKey = this.getPaddedAESKey();
      
      console.log('[QR Debug] Encrypting data:', {
        dataLength: data.length,
        keySource: 'centralized',
        rawKeyLength: rawKey.length,
        paddedKeyLength: paddedKey.length
      });
      
      // Use padded key for AES encryption
      const key = CryptoJS.enc.Utf8.parse(paddedKey);
      // Use 16-byte zero IV as specified
      const iv = CryptoJS.enc.Utf8.parse('\0'.repeat(16));
      
      console.log('[QR Debug] Encryption params:', {
        keyBytes: key.sigBytes,
        ivBytes: iv.sigBytes
      });
      
      const encrypted = CryptoJS.AES.encrypt(data, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      const result = encrypted.toString();
      console.log('[QR Debug] Encryption result:', {
        resultLength: result.length,
        resultPreview: result.substring(0, 50) + '...'
      });
      
      return result;
    } catch (error) {
      console.error('[QR Debug] Encryption error:', error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Validate encrypted data format before decryption
   */
  private static validateEncryptedData(encryptedData: string): { isValid: boolean; issues: string[] } {
    const issues: string[] = [];
    
    // Check if data is empty or too short
    if (!encryptedData || encryptedData.length === 0) {
      issues.push('Empty encrypted data');
    } else if (encryptedData.length < 16) {
      issues.push('Encrypted data too short (minimum 16 characters expected)');
    }
    
    // Check for valid Base64 characters (AES output should be Base64)
    const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
    if (encryptedData && !base64Regex.test(encryptedData)) {
      issues.push('Invalid Base64 format - contains non-Base64 characters');
    }
    
    // Check for proper Base64 padding
    if (encryptedData && encryptedData.length % 4 !== 0) {
      issues.push('Invalid Base64 padding - length not multiple of 4');
    }
    
    console.log('[QR Debug] Encrypted data validation:', {
      dataLength: encryptedData?.length || 0,
      isValidBase64: base64Regex.test(encryptedData || ''),
      hasProperPadding: (encryptedData?.length || 0) % 4 === 0,
      issues
    });
    
    return {
      isValid: issues.length === 0,
      issues
    };
  }
  
  /**
   * Decrypt data using AES-256-CBC with multiple parameter combinations for Flutter compatibility
   */
  private static decryptData(encryptedData: string): string {
    try {
      // Validate encrypted data format first
      const validation = this.validateEncryptedData(encryptedData);
      if (!validation.isValid) {
        console.warn('[QR Debug] Encrypted data validation failed:', validation.issues);
        // Continue with decryption but log the issues
      }
      
      const rawKey = this.getRawAESKey();
      const paddedKey = this.getPaddedAESKey();

      console.log('[QR Debug] Decrypting data:', {
        encryptedLength: encryptedData.length,
        keySource: 'centralized',
        rawKeyLength: rawKey.length,
        paddedKeyLength: paddedKey.length,
        encryptedPreview: encryptedData.substring(0, 50) + '...',
        validationPassed: validation.isValid
      });
      
      // Try different AES parameter combinations for Flutter compatibility
      const decryptionConfigs = [
        {
          name: 'Standard (Padded key + Zero IV)',
          key: CryptoJS.enc.Utf8.parse(paddedKey),          iv: CryptoJS.enc.Utf8.parse('\0'.repeat(16)),
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        },
        {
          name: 'Raw key + Zero IV',
          key: CryptoJS.enc.Utf8.parse(rawKey.padEnd(32, '\0').slice(0, 32)),          iv: CryptoJS.enc.Utf8.parse('\0'.repeat(16)),
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        },
        {
          name: 'Padded key + No IV (ECB mode)',
          key: CryptoJS.enc.Utf8.parse(paddedKey),          iv: null,
          mode: CryptoJS.mode.ECB,
          padding: CryptoJS.pad.Pkcs7
        },
        {
          name: 'Raw key + Random IV from data',
          key: CryptoJS.enc.Utf8.parse(rawKey.padEnd(32, '\0').slice(0, 32)),          iv: null, // Will extract from encrypted data
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        }
      ];
      
      for (const config of decryptionConfigs) {
        try {
          console.log(`[QR Debug] Trying decryption config: ${config.name}`);
          
          let decrypted;
          if (config.name.includes('Random IV')) {
            // Try extracting IV from the beginning of encrypted data
            try {
              const cipherParams = CryptoJS.lib.CipherParams.create({
                ciphertext: CryptoJS.enc.Base64.parse(encryptedData)
              });
              decrypted = CryptoJS.AES.decrypt(cipherParams, config.key, {
                mode: config.mode,
                padding: config.padding
              });
            } catch {
              continue; // Skip this config if it fails
            }
          } else {
            const decryptOptions: any = {
              mode: config.mode,
              padding: config.padding
            };
            if (config.iv) {
              decryptOptions.iv = config.iv;
            }
            
            decrypted = CryptoJS.AES.decrypt(encryptedData, config.key, decryptOptions);
          }
          
          // Try multiple encoding methods for this decryption
          const encodingMethods = [
            { name: 'UTF-8', encoder: CryptoJS.enc.Utf8 },
            { name: 'Latin1', encoder: CryptoJS.enc.Latin1 },
            { name: 'Base64', encoder: CryptoJS.enc.Base64 },
            { name: 'Hex', encoder: CryptoJS.enc.Hex }
          ];
          
          for (const method of encodingMethods) {
            try {
              const testResult = decrypted.toString(method.encoder);
              
              console.log(`[QR Debug] ${config.name} + ${method.name}:`, {
                resultLength: testResult.length,
                isEmpty: !testResult,
                isValidJson: this.isValidJson(testResult),
                containsPrintable: this.containsPrintableChars(testResult),
                resultPreview: testResult.substring(0, 50)
              });
              
              // Check if result is valid
              if (testResult && testResult.length > 0) {
                // For JSON data, verify it's valid JSON
                if (testResult.trim().startsWith('{') || testResult.trim().startsWith('[')) {
                  if (this.isValidJson(testResult)) {
                    console.log(`[QR Debug] SUCCESS with ${config.name} + ${method.name}`);
                    return testResult;
                  }
                } else {
                  // For non-JSON data, accept if it contains printable characters
                  if (this.containsPrintableChars(testResult)) {
                    console.log(`[QR Debug] SUCCESS with ${config.name} + ${method.name}`);
                    return testResult;
                  }
                }
              }
            } catch (encodingError) {
              console.log(`[QR Debug] ${config.name} + ${method.name} failed:`, encodingError.message);
              continue;
            }
          }
        } catch (configError) {
          console.log(`[QR Debug] Config ${config.name} failed:`, configError.message);
          continue;
        }
      }
      
      // Final fallback: Try simple Base64 decoding (as per complete_integration.md)
      console.log('[QR Debug] Trying fallback: Simple Base64 decoding');
      try {
        const base64Decoded = atob(encryptedData);
        console.log('[QR Debug] Base64 fallback result:', {
          resultLength: base64Decoded.length,
          isValidJson: this.isValidJson(base64Decoded),
          containsPrintable: this.containsPrintableChars(base64Decoded),
          resultPreview: base64Decoded.substring(0, 50)
        });
        
        if (base64Decoded && (this.isValidJson(base64Decoded) || this.containsPrintableChars(base64Decoded))) {
          console.log('[QR Debug] SUCCESS with Base64 fallback');
          return base64Decoded;
        }
      } catch (base64Error) {
        console.log('[QR Debug] Base64 fallback failed:', base64Error.message);
      }
      
      throw new Error('Decryption failed with all methods including Base64 fallback - encryption key/method mismatch with Flutter app');
    } catch (error) {
      console.error('[QR Debug] Decryption error:', error);
      throw new Error(`Decryption failed: ${error.message}`);
    }
  }
  
  /**
   * Check if a string is valid JSON
   */
  private static isValidJson(str: string): boolean {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Check if string contains mostly printable characters
   * Enhanced for Flutter compatibility
   */
  private static containsPrintableChars(str: string): boolean {
    if (!str || str.length === 0) return false;
    
    // Check for control characters that indicate decryption failure
    const controlCharCount = str.split('').filter(char => {
      const code = char.charCodeAt(0);
      // Control characters (0-31) except common whitespace (9, 10, 13)
      return (code >= 0 && code <= 31) && ![9, 10, 13].includes(code);
    }).length;
    
    // If more than 10% are control characters, likely decryption failed
    if ((controlCharCount / str.length) > 0.1) {
      console.log('[QR Debug] High control character count detected:', {
        totalLength: str.length,
        controlCharCount,
        percentage: (controlCharCount / str.length * 100).toFixed(2) + '%',
        hexDump: this.getHexDump(str.substring(0, 32))
      });
      return false;
    }
    
    // Count printable characters (ASCII 32-126 plus common Unicode)
    const printableCount = str.split('').filter(char => {
      const code = char.charCodeAt(0);
      return (code >= 32 && code <= 126) || code >= 160;
    }).length;
    
    // Consider valid if at least 70% are printable characters (lowered threshold for Flutter)
    const isValid = (printableCount / str.length) >= 0.7;
    
    if (!isValid) {
      console.log('[QR Debug] Printable character check failed:', {
        totalLength: str.length,
        printableCount,
        percentage: (printableCount / str.length * 100).toFixed(2) + '%',
        preview: str.substring(0, 50)
      });
    }
    
    return isValid;
  }
  
  /**
   * Generate hex dump for debugging binary data
   */
  private static getHexDump(str: string): string {
    return str.split('').map(char => {
      const hex = char.charCodeAt(0).toString(16).padStart(2, '0');
      return hex;
    }).join(' ');
  }

  /**
   * Generate hash for data verification (SHA-256 of ciphertext + RAW_AES_KEY)
   * Uses the raw trimmed key to match Flutter implementation
   */
  private static generateHash(data: string): string {
    // Use KeyService as single source of truth for AES keys
    const rawKey = this.getRawAESKey();
    console.log('[QR Debug] Generating hash with:', {
      dataLength: data.length,
      rawKeyLength: rawKey.length,
      hashInput: `${data.substring(0, 20)}...${rawKey.substring(0, 8)}...`,
      hashInputLength: (data + rawKey).length,
      usingCentralizedKey: true
    });
    return CryptoJS.SHA256(data + rawKey).toString();
  }

  /**
   * Debug encryption values - outputs exact values for Flutter comparison
   */
  static debugEncryptionValues(): void {
    console.log('=== QR ENCRYPTION DEBUG VALUES ===');
    
    // Test with the exact same payload structure Flutter should use
    const testPayload = {
      "test": 123
    };
    
    const testString = JSON.stringify(testPayload);
    console.log('1. Test payload:', testString);
    const rawKey = this.getRawAESKey();
    const paddedKey = this.getPaddedAESKey();
    console.log('2. RAW_AES_KEY (for hashing):', rawKey);
    console.log('3. RAW_AES_KEY length:', rawKey.length);
    console.log('4. PADDED_AES_KEY (for encryption):', paddedKey);
    console.log('5. PADDED_AES_KEY length:', paddedKey.length);
    
    // Encrypt the test data (uses padded key)
    const encrypted = this.encryptData(testString);
    console.log('6. Encrypted data:', encrypted);
    console.log('7. Encrypted data length:', encrypted.length);
    
    // Generate hash (uses raw key - IMPORTANT!)
    const hashInput = encrypted + rawKey;
    console.log('8. Hash input (encrypted + RAW_AES_KEY):', hashInput);
    console.log('9. Hash input length:', hashInput.length);
    
    const hash = this.generateHash(encrypted);
    console.log('10. Generated hash:', hash);
    console.log('11. Generated hash length:', hash.length);
    
    // Test decryption with new encoding fallback system
    try {
      const decrypted = this.decryptData(encrypted);
      console.log('12. Decrypted data:', decrypted);
      console.log('13. Decryption matches original:', decrypted === testString);
    } catch (error) {
      console.error('12. Decryption failed:', error);
    }
    
    console.log('=== FLUTTER SHOULD GENERATE THESE EXACT VALUES ===');
    console.log('Flutter AES_KEY (trimmed):', rawKey);
    console.log('Flutter encrypted data should be:', encrypted);
    console.log('Flutter hash should be:', hash);
    console.log('=== CRITICAL: Flutter must use RAW key for hashing, NOT padded! ===');
    console.log('=== END DEBUG VALUES ===');
  }
  
  /**
   * Test encoding compatibility with various data formats
   */
  static testEncodingCompatibility(): void {
    console.log('=== ENCODING COMPATIBILITY TEST ===');
    
    const testCases = [
      { name: 'Simple JSON', data: '{"test":123}' },
      { name: 'User Data', data: '{"userId":"123","name":"Test User","email":"test@example.com"}' },
      { name: 'Unicode Text', data: 'Hello 世界 🌍' },
      { name: 'Special Characters', data: 'Test!@#$%^&*()_+-=[]{}|;:,.<>?' }
    ];
    
    testCases.forEach((testCase, index) => {
      console.log(`\n--- Test Case ${index + 1}: ${testCase.name} ---`);
      console.log('Original data:', testCase.data);
      
      try {
        // Encrypt the data
        const encrypted = this.encryptData(testCase.data);
        console.log('Encrypted successfully:', encrypted.substring(0, 50) + '...');
        
        // Test decryption with all encoding methods
        const decrypted = this.decryptData(encrypted);
        console.log('Decrypted successfully:', decrypted);
        console.log('Round-trip successful:', decrypted === testCase.data);
        
      } catch (error) {
        console.error('Test failed:', error.message);
      }
    });
    
    console.log('=== END ENCODING COMPATIBILITY TEST ===');
  }

  /**
   * Log successful scan
   */
  private static async logScan(scanLog: any): Promise<void> {
    try {
      await addDoc(collection(db, 'scan_logs'), {
        ...scanLog,
        created_at: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error logging scan:', error);
    }
  }

  /**
   * Log failed scan attempt
   */
  private static async logFailedScan(qrData: string, scannedBy: string, errorMessage: string): Promise<void> {
    try {
      await addDoc(collection(db, 'scan_logs'), {
        qr_data: qrData.substring(0, 100), // Truncate for storage
        scanned_by: scannedBy,
        scan_time: new Date().toISOString(),
        status: 'failed',
        error: errorMessage,
        result: 'denied',
        location: 'main_entrance',
        created_at: Timestamp.now(),
      });
    } catch (error) {
      console.error('Error logging failed scan:', error);
    }
  }

  /**
   * Initialize QR refresh cycles for all active users
   */
  static async initializeQRRefreshCycles(): Promise<void> {
    try {
      const usersQuery = query(
        collection(db, 'user_profiles'),
        where('status', '==', 'verified'),
        where('subscription_status', '==', 'active')
      );
      
      const usersSnapshot = await getDocs(usersQuery);
      
      usersSnapshot.docs.forEach(doc => {
        const userData = doc.data();
        if (userData.qr_code_url) {
          this.startQRRefreshCycle(doc.id);
        }
      });
      
      console.log(`Initialized QR refresh cycles for ${usersSnapshot.size} users`);
    } catch (error) {
      console.error('Error initializing QR refresh cycles:', error);
    }
  }

  /**
   * Clean up expired QR codes
   */
  static async cleanupExpiredQRCodes(): Promise<void> {
    try {
      const now = new Date();
      const qrQuery = query(
        collection(db, 'qr_codes'),
        where('isActive', '==', true)
      );
      
      const qrSnapshot = await getDocs(qrQuery);
      
      const expiredQRs = qrSnapshot.docs.filter(doc => {
        const data = doc.data();
        const expiresAt = new Date(data.expiresAt);
        return expiresAt < now;
      });
      
      const updatePromises = expiredQRs.map(doc => 
        updateDoc(doc.ref, {
          isActive: false,
          updatedAt: Timestamp.now(),
        })
      );
      
      await Promise.all(updatePromises);
      
      console.log(`Cleaned up ${expiredQRs.length} expired QR codes`);
    } catch (error) {
      console.error('Error cleaning up expired QR codes:', error);
    }
  }

  /**
   * Clear KeyService cache and force refresh
   */
  static clearKeyServiceCache(): void {
    console.log('=== CLEARING KEYSERVICE CACHE ===');
    KeyService.clearCache();
    console.log('Cache cleared. Next key access will fetch from Firebase.');
    console.log('=== CACHE CLEARED ===');
  }
}

// Make debug functions available globally for browser console testing
declare global {
  interface Window {
    debugQREncryption: () => void;
    testQREncodingCompatibility: () => void;
    testQRDecryption: (encryptedData: string) => void;
    clearKeyServiceCache: () => void;
  }
}

if (typeof window !== 'undefined') {
  window.debugQREncryption = () => DynamicQRService.debugEncryptionValues();
  window.testQREncodingCompatibility = () => DynamicQRService.testEncodingCompatibility();
  window.clearKeyServiceCache = () => DynamicQRService.clearKeyServiceCache();
  window.testQRDecryption = (encryptedData: string) => {
    try {
      console.log('=== TESTING QR DECRYPTION ===');
      console.log('Input encrypted data:', encryptedData);
      const result = DynamicQRService['decryptData'](encryptedData);
      console.log('Decryption successful:', result);
      console.log('=== END TEST ===');
      return result;
    } catch (error) {
      console.error('Decryption test failed:', error);
      console.log('=== END TEST ===');
      throw error;
    }
  };
}

export default DynamicQRService;
export type { DynamicQRData, DynamicQRPayload, QRCodeRecord };