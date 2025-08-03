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
  startAfter,
  Timestamp 
} from 'firebase/firestore';
import CryptoJS from 'crypto-js';

interface QRData {
  userId: string;
  fullName: string;
  email: string;
  subscriptionValidUntil: string;
  role: string;
  institutionId?: string;
  profilePicUrl?: string;
  generatedAt: string;
}

interface QRPayload {
  data: string;
  hash: string;
}

export interface ScanLog {
  user_id: string;
  user_name: string;
  user_email: string;
  scan_type: 'entry' | 'exit';
  scan_time: string;
  location: string;
  scanned_by: string;
  status: 'success' | 'failed';
  result: 'granted' | 'denied';
  subscription_valid: boolean;
  qr_data?: string;
  error_message?: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  subscription_valid_until?: string;
  role: string;
  institution_id?: string;
  profile_pic_url?: string;
  status?: string;
  subscription_status?: string;
  subscription_end?: string;
}

class QRCodeService {
  private static readonly ENCRYPTION_KEY = 'LibraryQRKey2024!@#$%^&*()_+{}|:<>?[]\\;\',./~`';

  /**
   * Generate QR code for a user
   */
  static async generateQRCode(userId: string): Promise<{
    success: boolean;
    qrCodeUrl?: string;
    qrData?: string;
    error?: string;
  }> {
    try {
      // Fetch user data
      const userDoc = await getDoc(doc(db, 'user_profiles', userId));
      
      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const userData = userDoc.data();

      // Validate user status
      if (userData.status !== 'verified') {
        throw new Error('User account is not verified');
      }

      if (userData.subscription_status !== 'active') {
        throw new Error('User does not have an active subscription');
      }

      // Check subscription expiry
      if (userData.subscription_end) {
        const subscriptionEnd = new Date(userData.subscription_end);
        if (subscriptionEnd < new Date()) {
          throw new Error('User subscription has expired');
        }
      }

      // Create QR data
      const qrData: QRData = {
        userId,
        fullName: userData.name,
        email: userData.email,
        subscriptionValidUntil: userData.subscription_end || '',
        role: userData.role,
        institutionId: userData.institution_id,
        profilePicUrl: userData.profile_picture_url,
        generatedAt: new Date().toISOString(),
      };

      // Encrypt data
      const encryptedData = this.encryptData(JSON.stringify(qrData));
      
      // Generate hash for verification
      const hash = this.generateHash(encryptedData);
      
      // Create QR payload
      const qrPayload: QRPayload = {
        data: encryptedData,
        hash,
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

      // Update user profile with QR data
      await updateDoc(doc(db, 'user_profiles', userId), {
        qr_data: qrString,
        qr_code_url: qrCodeUrl,
        updated_at: new Date().toISOString(),
      });

      return {
        success: true,
        qrCodeUrl,
        qrData: qrString,
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
   * Validate QR code and return user data
   */
  static async validateQRCode(qrData: string, scannedBy: string): Promise<{
    success: boolean;
    isValid: boolean;
    userData?: any;
    scanData?: QRData;
    error?: string;
  }> {
    try {
      // Parse QR payload
      let qrPayload: QRPayload;
      
      try {
        qrPayload = JSON.parse(qrData);
      } catch {
        throw new Error('Invalid QR code format');
      }

      if (!qrPayload.data || !qrPayload.hash) {
        throw new Error('Invalid QR code structure');
      }

      const encryptedData = qrPayload.data;
      const providedHash = qrPayload.hash;

      // Verify hash
      const calculatedHash = this.generateHash(encryptedData);
      if (calculatedHash !== providedHash) {
        throw new Error('QR code verification failed');
      }

      // Decrypt data
      const decryptedData = this.decryptData(encryptedData);
      let userData: QRData;
      
      try {
        userData = JSON.parse(decryptedData);
      } catch {
        throw new Error('Failed to parse QR code data');
      }

      // Check QR code expiry (5 minutes)
      const generatedAt = new Date(userData.generatedAt);
      const now = new Date();
      const diffMinutes = (now.getTime() - generatedAt.getTime()) / (1000 * 60);
      
      if (diffMinutes > 5) {
        throw new Error('QR code has expired');
      }

      // Validate user in database
      const userDoc = await getDoc(doc(db, 'user_profiles', userData.userId));
      
      if (!userDoc.exists()) {
        throw new Error('User not found in database');
      }

      const dbUserData = userDoc.data();

      // Validate user status
      if (dbUserData.status !== 'verified') {
        throw new Error('User account is not verified');
      }

      if (dbUserData.subscription_status !== 'active') {
        // Check if subscription has expired
        if (dbUserData.subscription_end) {
          const subscriptionEnd = new Date(dbUserData.subscription_end);
          if (subscriptionEnd < now) {
            // Update subscription status to expired
            await updateDoc(doc(db, 'user_profiles', userData.userId), {
              subscription_status: 'expired',
              updated_at: new Date().toISOString(),
            });
          }
        }
        throw new Error('User subscription has expired');
      }

      // Additional validation: check subscription end date
      if (dbUserData.subscription_end) {
        const subscriptionEnd = new Date(dbUserData.subscription_end);
        if (subscriptionEnd < now) {
          throw new Error('User subscription has expired');
        }
      }

      // Log successful scan
      await this.logScan({
        user_id: userData.userId,
        user_name: userData.fullName,
        user_email: userData.email,
        scan_type: 'entry', // Default to entry, can be changed by caller
        scan_time: new Date().toISOString(),
        location: 'Main Library',
        scanned_by: scannedBy,
        status: 'success',
        result: 'granted',
        subscription_valid: true,
        qr_data: qrData,
      });

      return {
        success: true,
        isValid: true,
        userData: {
          id: userData.userId,
          name: userData.fullName,
          email: userData.email,
          role: userData.role,
          status: dbUserData.status,
          subscription_status: dbUserData.subscription_status,
          subscription_end: dbUserData.subscription_end,
          profile_picture_url: userData.profilePicUrl,
        },
        scanData: userData,
      };
    } catch (error: any) {
      console.error('Error validating QR code:', error);

      // Log failed scan attempt
      await this.logFailedScan(qrData, scannedBy, error.message);

      return {
        success: false,
        isValid: false,
        error: error.message,
      };
    }
  }

  /**
   * Log successful scan
   */
  private static async logScan(scanLog: ScanLog): Promise<void> {
    try {
      await addDoc(collection(db, 'scan_logs'), scanLog);
    } catch (error) {
      console.error('Error logging scan:', error);
    }
  }

  /**
   * Log failed scan attempt
   */
  private static async logFailedScan(qrData: string, scannedBy: string, errorMessage: string): Promise<void> {
    try {
      const failedScanLog: Partial<ScanLog> = {
        scan_type: 'entry',
        scan_time: new Date().toISOString(),
        location: 'Main Library',
        scanned_by: scannedBy,
        status: 'failed',
        result: 'denied',
        subscription_valid: false,
        qr_data: qrData.substring(0, 100), // Truncate for storage
        error_message: errorMessage,
      };

      await addDoc(collection(db, 'scan_logs'), failedScanLog);
    } catch (error) {
      console.error('Error logging failed scan:', error);
    }
  }

  /**
   * Update scan log with entry/exit type
   */
  static async updateScanType(scanLogId: string, scanType: 'entry' | 'exit'): Promise<void> {
    try {
      await updateDoc(doc(db, 'scan_logs', scanLogId), {
        scan_type: scanType,
        updated_at: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating scan type:', error);
    }
  }

  /**
   * Check if user can generate QR code
   */
  static async canUserGenerateQR(userId: string): Promise<{ canGenerate: boolean; reason?: string }> {
    try {
      const userDoc = await getDoc(doc(db, 'user_profiles', userId));
      
      if (!userDoc.exists()) {
        return { canGenerate: false, reason: 'User not found' };
      }

      const userData = userDoc.data();

      if (userData.status !== 'verified') {
        return { canGenerate: false, reason: 'Account pending verification' };
      }

      if (userData.subscription_status !== 'active') {
        return { canGenerate: false, reason: 'No active subscription' };
      }

      // Check subscription expiry
      if (userData.subscription_end) {
        const subscriptionEnd = new Date(userData.subscription_end);
        if (subscriptionEnd < new Date()) {
          return { canGenerate: false, reason: 'Subscription has expired' };
        }
      }

      return { canGenerate: true };
    } catch (error) {
      return { canGenerate: false, reason: 'Error checking user status' };
    }
  }

  /**
   * Encrypt data using AES
   */
  private static encryptData(data: string): string {
    // Simple base64 encoding for demo - use proper encryption in production
    // This should match the Flutter app's encryption method
    const combined = data + this.ENCRYPTION_KEY;
    return btoa(combined);
  }

  /**
   * Decrypt data using AES
   */
  private static decryptData(encryptedData: string): string {
    try {
      const decoded = atob(encryptedData);
      return decoded.replace(this.ENCRYPTION_KEY, '');
    } catch (error) {
      throw new Error('Failed to decrypt QR data');
    }
  }

  /**
   * Generate hash for verification
   */
  private static generateHash(data: string): string {
    return CryptoJS.SHA256(data + this.ENCRYPTION_KEY).toString();
  }

  /**
   * Get QR code statistics
   */
  static async getQRStats(): Promise<{
    totalScans: number;
    successfulScans: number;
    failedScans: number;
    todayScans: number;
  }> {
    // Implementation would query scan_logs collection
    // This is a placeholder - implement based on your needs
    return {
      totalScans: 0,
      successfulScans: 0,
      failedScans: 0,
      todayScans: 0,
    };
  }

  // Generate QR code for a user
  async generateQRCode(userId: string): Promise<{ qrCodeUrl: string; qrData: QRData }> {
    try {
      // Get user data
      const userDoc = await getDoc(doc(db, 'user_profiles', userId));

      if (!userDoc.exists()) {
        throw new Error('User not found');
      }

      const user = { id: userDoc.id, ...userDoc.data() } as User;

      // Create QR data object
      const qrData: QRData = {
        userId: user.id,
        fullName: user.name,
        email: user.email,
        subscriptionValidUntil: user.subscription_valid_until || '',
        role: user.role || 'student',
        institutionId: user.institution_id || undefined,
        profilePicUrl: user.profile_pic_url || undefined,
        generatedAt: new Date().toISOString()
      };

      // Remove undefined fields to prevent Firebase errors
      Object.keys(qrData).forEach(key => {
        if (qrData[key as keyof QRData] === undefined) {
          delete qrData[key as keyof QRData];
        }
      });

      // Encrypt the QR data
      const encryptedData = QRCodeService.encryptData(JSON.stringify(qrData));

      // Generate QR code image
      const qrCodeUrl = await QRCode.toDataURL(encryptedData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Store QR code in database
      await setDoc(doc(db, 'qr_codes', userId), {
        user_id: userId,
        qr_data: qrData,
        qr_code_url: qrCodeUrl,
        encrypted_data: encryptedData,
        is_active: true,
        expires_at: Timestamp.fromDate(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)), // 1 year
        generated_by: userId,
        created_at: Timestamp.now(),
        updated_at: Timestamp.now()
      });

      return { qrCodeUrl, qrData };
    } catch (error) {
      console.error('Error generating QR code:', error);
      throw error;
    }
  }

  // Validate and decode QR code
  async validateQRCode(qrCodeData: string): Promise<{ isValid: boolean; userData?: QRData; error?: string }> {
    try {
      // The qrCodeData should be the encrypted string that was embedded in the QR code
      // First, let's try to decrypt it directly
      let decryptedData: string;
      
      try {
        decryptedData = QRCodeService.decryptData(qrCodeData);
      } catch (decryptError) {
        console.error('Decryption failed:', decryptError);
        return { isValid: false, error: 'Invalid QR code format - decryption failed' };
      }

      // Parse the decrypted JSON data
      let qrData: QRData;
      try {
        qrData = JSON.parse(decryptedData);
      } catch (parseError) {
        console.error('JSON parsing failed:', parseError);
        return { isValid: false, error: 'Invalid QR code format - invalid data structure' };
      }

      // Validate required fields
      if (!qrData.userId || !qrData.fullName || !qrData.email) {
        return { isValid: false, error: 'Invalid QR code - missing required fields' };
      }

      // Validate user exists and subscription
      const userDoc = await getDoc(doc(db, 'user_profiles', qrData.userId));

      if (!userDoc.exists()) {
        return { isValid: false, error: 'User not found in database' };
      }

      const user = { id: userDoc.id, ...userDoc.data() } as User;

      // Check subscription validity
      const subscriptionValid = user.subscription_valid_until 
        ? new Date(user.subscription_valid_until) > new Date()
        : false;

      if (!subscriptionValid) {
        return { isValid: false, error: 'Subscription expired', userData: qrData };
      }

      // Check if QR code is not too old (optional security measure)
      const generatedAt = new Date(qrData.generatedAt);
      const now = new Date();
      const daysDiff = (now.getTime() - generatedAt.getTime()) / (1000 * 60 * 60 * 24);
      
      if (daysDiff > 365) { // QR code older than 1 year
        return { isValid: false, error: 'QR code expired', userData: qrData };
      }

      return { isValid: true, userData: qrData };
    } catch (error) {
      console.error('Error validating QR code:', error);
      return { isValid: false, error: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }

  // Log scan entry/exit
  async logScan(
    userId: string, 
    scanType: 'entry' | 'exit', 
    verifiedBy?: string, 
    location: string = 'main_entrance'
  ): Promise<{ success: boolean; logId?: string; error?: string }> {
    try {
      // Check for duplicate scans within 5 minutes
      const fiveMinutesAgo = Timestamp.fromDate(new Date(Date.now() - 5 * 60 * 1000));
      
      const recentScansQuery = query(
        collection(db, 'scan_logs'),
        where('user_id', '==', userId),
        where('scan_type', '==', scanType),
        where('created_at', '>=', fiveMinutesAgo),
        orderBy('created_at', 'desc'),
        limit(1)
      );
      
      const recentScansSnapshot = await getDocs(recentScansQuery);

      if (!recentScansSnapshot.empty) {
        return { success: false, error: 'Duplicate scan detected within 5 minutes' };
      }

      if (scanType === 'entry') {
        // Create new entry log
        const docRef = await addDoc(collection(db, 'scan_logs'), {
          user_id: userId,
          entry_time: new Date().toISOString(),
          scan_type: 'entry',
          verified_by: verifiedBy,
          location,
          status: 'entry',
          created_at: Timestamp.now(),
          updated_at: Timestamp.now()
        });

        return { success: true, logId: docRef.id };
      } else {
        // Find latest entry without exit
        const latestEntryQuery = query(
          collection(db, 'scan_logs'),
          where('user_id', '==', userId),
          where('scan_type', '==', 'entry'),
          where('exit_time', '==', null),
          orderBy('entry_time', 'desc'),
          limit(1)
        );
        
        const latestEntrySnapshot = await getDocs(latestEntryQuery);

        if (!latestEntrySnapshot.empty) {
          // Update existing entry with exit time
          const entryDoc = latestEntrySnapshot.docs[0];
          await updateDoc(doc(db, 'scan_logs', entryDoc.id), {
            exit_time: new Date().toISOString(),
            scan_type: 'exit',
            updated_at: Timestamp.now()
          });

          return { success: true, logId: entryDoc.id };
        } else {
          // Create new exit log if no matching entry
          const docRef = await addDoc(collection(db, 'scan_logs'), {
            user_id: userId,
            exit_time: new Date().toISOString(),
            scan_type: 'exit',
            verified_by: verifiedBy,
            location,
            status: 'exit',
            created_at: Timestamp.now(),
            updated_at: Timestamp.now()
          });

          return { success: true, logId: docRef.id };
        }
      }
    } catch (error) {
      console.error('Error logging scan:', error);
      return { success: false, error: 'Failed to log scan' };
    }
  }


}

export const qrCodeService = new QRCodeService();
export type { QRData, User };