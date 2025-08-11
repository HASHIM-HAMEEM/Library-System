import QRCode from 'qrcode';
import CryptoJS from 'crypto-js';
import { db } from './firebase';
import { doc, updateDoc, collection, query, where, orderBy, limit, getDocs, addDoc, getDoc } from 'firebase/firestore';
import { KeyService } from './keyService';

// QR token interface
export interface QRTokenData {
  userId: string;
  timestamp: number;
  expiresAt: number;
  signature: string;
}

// Generate encrypted QR token for student
export const generateQRToken = async (userId: string): Promise<string> => {
  try {
    const now = Date.now();
    const expiresAt = now + (24 * 60 * 60 * 1000); // 24 hours from now
    
    // Create token data
    const tokenData: QRTokenData = {
      userId,
      timestamp: now,
      expiresAt,
      signature: ''
    };
    
    // Create signature
    const dataToSign = `${userId}:${now}:${expiresAt}`;
    const rawKey = KeyService.getCachedKeySync();
    const signature = CryptoJS.HmacSHA256(dataToSign, rawKey).toString();
    tokenData.signature = signature;
    
    // Encrypt the token using AES-256-CBC with zero IV
    const key = CryptoJS.enc.Utf8.parse(KeyService.getPaddedKey(rawKey));
    const iv = CryptoJS.enc.Utf8.parse('\0'.repeat(16));
    
    const encryptedToken = CryptoJS.AES.encrypt(
      JSON.stringify(tokenData),
      key,
      {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      }
    ).toString();
    
    // Update user's QR token in database
    const userDocRef = doc(db, 'user_profiles', userId);
    await updateDoc(userDocRef, {
      qr_token: encryptedToken,
      qr_token_expires_at: new Date(expiresAt).toISOString(),
      last_qr_generated_at: new Date().toISOString()
    });
    
    return encryptedToken;
  } catch (error) {
    console.error('Error generating QR token:', error);
    throw error;
  }
};

// Generate QR code image from token
export const generateQRCodeImage = async (token: string): Promise<string> => {
  try {
    const qrCodeDataURL = await QRCode.toDataURL(token, {
      width: 300,
      margin: 2,
      color: {
        dark: '#374151', // Deep gray
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    });
    
    return qrCodeDataURL;
  } catch (error) {
    console.error('Error generating QR code image:', error);
    throw error;
  }
};

// Validate QR token (used by admin scanner)
export const validateQRToken = (encryptedToken: string): {
  isValid: boolean;
  userId?: string;
  error?: string;
} => {
  try {
    // Decrypt the token using AES-256-CBC with zero IV
    const rawKey = KeyService.getCachedKeySync();
    const key = CryptoJS.enc.Utf8.parse(KeyService.getPaddedKey(rawKey));
    const iv = CryptoJS.enc.Utf8.parse('\0'.repeat(16));
    
    const decryptedBytes = CryptoJS.AES.decrypt(encryptedToken, key, {
      iv: iv,
      mode: CryptoJS.mode.CBC,
      padding: CryptoJS.pad.Pkcs7
    });
    const decryptedData = decryptedBytes.toString(CryptoJS.enc.Utf8);
    
    if (!decryptedData) {
      return { isValid: false, error: 'Invalid token format' };
    }
    
    const tokenData: QRTokenData = JSON.parse(decryptedData);
    
    // Verify signature
    const dataToSign = `${tokenData.userId}:${tokenData.timestamp}:${tokenData.expiresAt}`;
    const expectedSignature = CryptoJS.HmacSHA256(dataToSign, rawKey).toString();
    
    if (tokenData.signature !== expectedSignature) {
      return { isValid: false, error: 'Invalid token signature' };
    }
    
    // Check expiry
    if (Date.now() > tokenData.expiresAt) {
      return { isValid: false, error: 'Token expired' };
    }
    
    return { isValid: true, userId: tokenData.userId };
  } catch (error) {
    console.error('Error validating QR token:', error);
    return { isValid: false, error: 'Token validation failed' };
  }
};

// Scan QR code and process entry/exit
export const processQRScan = async (
  encryptedToken: string,
  adminId: string,
  scanType: 'entry' | 'exit' = 'entry'
): Promise<{
  success: boolean;
  message: string;
  attendanceId?: string;
}> => {
  try {
    // Validate token locally first
    const tokenValidation = validateQRToken(encryptedToken);
    if (!tokenValidation.isValid) {
      // Log failed scan
      await logQRScan(tokenValidation.userId || '', adminId, 'invalid_token');
      return { success: false, message: tokenValidation.error || 'Invalid token' };
    }
    
    const studentId = tokenValidation.userId!;
    
    // Check subscription status
    const subscriptionQuery = query(
      collection(db, 'subscriptions'),
      where('user_id', '==', studentId),
      where('status', '==', 'active'),
      where('end_date', '>=', new Date().toISOString().split('T')[0]),
      orderBy('end_date', 'desc'),
      limit(1)
    );
    const subscriptionSnapshot = await getDocs(subscriptionQuery);
    
    if (subscriptionSnapshot.empty) {
      await logQRScan(studentId, adminId, 'expired_subscription');
      return { success: false, message: 'Subscription expired or inactive' };
    }
    
    // Process entry/exit
    if (scanType === 'entry') {
      // Check if student is already inside (has entry without exit)
      const activeSessionQuery = query(
        collection(db, 'attendance_logs'),
        where('user_id', '==', studentId),
        where('exit_time', '==', null),
        orderBy('entry_time', 'desc'),
        limit(1)
      );
      const activeSessionSnapshot = await getDocs(activeSessionQuery);
      
      if (!activeSessionSnapshot.empty) {
        return { success: false, message: 'Student already inside. Please scan for exit first.' };
      }
      
      // Create new entry
      const attendanceDocRef = await addDoc(collection(db, 'attendance_logs'), {
        user_id: studentId,
        entry_time: new Date().toISOString(),
        session_date: new Date().toISOString().split('T')[0],
        scanned_by_admin_id: adminId,
        entry_method: 'qr_scan'
      });
      
      await logQRScan(studentId, adminId, 'success');
      return {
        success: true,
        message: 'Entry recorded successfully',
        attendanceId: attendanceDocRef.id
      };
    } else {
      // Handle exit
      const exitSessionQuery = query(
        collection(db, 'attendance_logs'),
        where('user_id', '==', studentId),
        where('exit_time', '==', null),
        orderBy('entry_time', 'desc'),
        limit(1)
      );
      const exitSessionSnapshot = await getDocs(exitSessionQuery);
      
      if (exitSessionSnapshot.empty) {
        return { success: false, message: 'No active session found. Please scan for entry first.' };
      }
      
      const activeSessionDoc = exitSessionSnapshot.docs[0];
      
      // Update with exit time
      await updateDoc(activeSessionDoc.ref, {
        exit_time: new Date().toISOString()
      });
      
      await logQRScan(studentId, adminId, 'success');
      return {
        success: true,
        message: 'Exit recorded successfully',
        attendanceId: activeSessionDoc.id
      };
    }
  } catch (error) {
    console.error('Error processing QR scan:', error);
    return { success: false, message: 'Failed to process scan' };
  }
};

// Log QR scan attempts for security and audit
const logQRScan = async (
  studentId: string,
  adminId: string,
  result: 'success' | 'expired_subscription' | 'invalid_token' | 'expired_token'
) => {
  try {
    await addDoc(collection(db, 'qr_scan_logs'), {
      student_id: studentId,
      admin_id: adminId,
      scan_result: result,
      scan_timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error logging QR scan:', error);
  }
};

// Refresh QR token (generate new one)
export const refreshQRToken = async (userId: string): Promise<string> => {
  return generateQRToken(userId);
};

// Get current QR token for user
export const getCurrentQRToken = async (userId: string): Promise<string | null> => {
  try {
    const userDocRef = doc(db, 'user_profiles', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      console.error('User profile not found');
      return null;
    }

    const profile = userDoc.data();

    // Check if token is expired
    if (!profile.qr_token || !profile.qr_token_expires_at || 
        new Date(profile.qr_token_expires_at) <= new Date()) {
      // Generate new token if expired or missing
      const newToken = await generateQRToken(userId);
      return newToken;
    }

    return profile.qr_token;
  } catch (error) {
    console.error('Error in getCurrentQRToken:', error);
    return null;
  }
};