// src/stores/userStore.ts
import { create } from 'zustand';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDocs,
  deleteDoc,
  Timestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'student' | 'admin';
  status: 'pending' | 'verified' | 'rejected' | 'suspended';
  subscription_status: 'active' | 'expired' | 'inactive';
  subscription_type?: 'daily' | 'weekly' | 'monthly';
  subscription_start?: string;
  subscription_end?: string;
  profile_picture_url?: string;
  id_proof_url?: string;
  address?: string;
  qr_code_url?: string;
  qr_data?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  is_active: boolean;
  rejection_reason?: string;
}

interface UserState {
  users: UserProfile[];
  pendingUsers: UserProfile[];
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchUsers: () => void;
  fetchPendingUsers: () => void;
  verifyUser: (userId: string, status: 'verified' | 'rejected', reason?: string) => Promise<void>;
  updateUserSubscription: (userId: string, subscriptionData: {
    subscription_status: string;
    subscription_type?: string;
    subscription_start?: string;
    subscription_end?: string;
  }) => Promise<void>;
  suspendUser: (userId: string, reason?: string) => Promise<void>;
  reactivateUser: (userId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  searchUsers: (searchTerm: string) => UserProfile[];
  getUserById: (userId: string) => UserProfile | undefined;
  updateUserProfile: (userId: string, updates: Partial<UserProfile>) => Promise<void>;
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  pendingUsers: [],
  loading: false,
  error: null,

  fetchUsers: () => {
    set({ loading: true, error: null });
    
    const usersQuery = query(
      collection(db, 'user_profiles'),
      where('role', '==', 'student'),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(usersQuery, 
      (snapshot) => {
        const users = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UserProfile[];
        
        set({ users, loading: false });
      },
      (error) => {
        console.error('Error fetching users:', error);
        set({ error: error.message, loading: false });
        toast.error('Failed to fetch users');
      }
    );

    return unsubscribe;
  },

  fetchPendingUsers: () => {
    const pendingQuery = query(
      collection(db, 'user_profiles'),
      where('status', '==', 'pending'),
      where('role', '==', 'student'),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(pendingQuery,
      (snapshot) => {
        const pendingUsers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UserProfile[];
        
        set({ pendingUsers });
      },
      (error) => {
        console.error('Error fetching pending users:', error);
        toast.error('Failed to fetch pending users');
      }
    );

    return unsubscribe;
  },

  verifyUser: async (userId: string, status: 'verified' | 'rejected', reason?: string) => {
    try {
      set({ loading: true });
      
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'rejected' && reason) {
        updateData.rejection_reason = reason;
      }

      // If verifying user, also set default subscription as inactive
      if (status === 'verified') {
        updateData.subscription_status = 'inactive';
        // Remove rejection reason if previously rejected
        updateData.rejection_reason = null;
      }

      await updateDoc(doc(db, 'user_profiles', userId), updateData);
      
      toast.success(`User ${status} successfully`);
      set({ loading: false });
    } catch (error: any) {
      console.error('Error verifying user:', error);
      set({ error: error.message, loading: false });
      toast.error(`Failed to ${status} user`);
    }
  },

  updateUserSubscription: async (userId: string, subscriptionData) => {
    try {
      set({ loading: true });
      
      const updateData = {
        ...subscriptionData,
        updated_at: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'user_profiles', userId), updateData);
      
      // Also create subscription record
      if (subscriptionData.subscription_status === 'active') {
        const subscriptionRecord = {
          user_id: userId,
          plan_type: subscriptionData.subscription_type,
          start_date: subscriptionData.subscription_start,
          end_date: subscriptionData.subscription_end,
          status: 'active',
          payment_status: 'completed',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        await collection(db, 'subscriptions').add(subscriptionRecord);
      }
      
      toast.success('Subscription updated successfully');
      set({ loading: false });
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to update subscription');
    }
  },

  suspendUser: async (userId: string, reason?: string) => {
    try {
      set({ loading: true });
      
      const updateData: any = {
        status: 'suspended',
        is_active: false,
        updated_at: new Date().toISOString(),
      };

      if (reason) {
        updateData.suspension_reason = reason;
      }

      await updateDoc(doc(db, 'user_profiles', userId), updateData);
      
      toast.success('User suspended successfully');
      set({ loading: false });
    } catch (error: any) {
      console.error('Error suspending user:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to suspend user');
    }
  },

  reactivateUser: async (userId: string) => {
    try {
      set({ loading: true });
      
      await updateDoc(doc(db, 'user_profiles', userId), {
        status: 'verified',
        is_active: true,
        suspension_reason: null,
        updated_at: new Date().toISOString(),
      });
      
      toast.success('User reactivated successfully');
      set({ loading: false });
    } catch (error: any) {
      console.error('Error reactivating user:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to reactivate user');
    }
  },

  deleteUser: async (userId: string) => {
    try {
      set({ loading: true });
      
      // Delete user profile
      await deleteDoc(doc(db, 'user_profiles', userId));
      
      // Delete related scan logs
      const scanLogsQuery = query(
        collection(db, 'scan_logs'),
        where('user_id', '==', userId)
      );
      const scanLogs = await getDocs(scanLogsQuery);
      
      const deletePromises = scanLogs.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      toast.success('User deleted successfully');
      set({ loading: false });
    } catch (error: any) {
      console.error('Error deleting user:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to delete user');
    }
  },

  searchUsers: (searchTerm: string) => {
    const { users } = get();
    if (!searchTerm.trim()) return users;
    
    const term = searchTerm.toLowerCase();
    return users.filter(user => 
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.phone?.toLowerCase().includes(term) ||
      user.id.toLowerCase().includes(term)
    );
  },

  getUserById: (userId: string) => {
    const { users } = get();
    return users.find(user => user.id === userId);
  },

  updateUserProfile: async (userId: string, updates: Partial<UserProfile>) => {
    try {
      set({ loading: true });
      
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'user_profiles', userId), updateData);
      
      toast.success('User profile updated successfully');
      set({ loading: false });
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to update user profile');
    }
  },
}));






2.Updated QR Scanner Component for Web App




// src/components/QRScanner.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner, Html5QrcodeScannerConfig } from 'html5-qrcode';
import { Camera, X, CheckCircle, XCircle, Clock, User } from 'lucide-react';
import { toast } from 'sonner';
import { qrCodeService } from '../lib/qrCodeService';
import { useAuthStore } from '../stores/authStore';
import { useScanLogStore } from '../stores/scanLogStore';

interface ScanResult {
  success: boolean;
  isValid: boolean;
  userData?: any;
  error?: string;
  scanData?: any;
}

interface QRScannerProps {
  onClose: () => void;
  onScanResult?: (result: ScanResult) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onClose, onScanResult }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanner, setScanner] = useState<Html5QrcodeScanner | null>(null);
  const [scanMode, setScanMode] = useState<'entry' | 'exit'>('entry');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const scannerRef = useRef<HTMLDivElement>(null);
  const { userProfile: currentAdmin } = useAuthStore();
  const { addScanLog } = useScanLogStore();

  useEffect(() => {
    initializeScanner();
    return () => {
      if (scanner) {
        scanner.clear();
      }
    };
  }, []);

  const initializeScanner = () => {
    if (scannerRef.current) {
      const config: Html5QrcodeScannerConfig = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        showTorchButtonIfSupported: true,
        showZoomSliderIfSupported: true,
        defaultZoomValueIfSupported: 2,
      };

      const qrScanner = new Html5QrcodeScanner(
        "qr-scanner-container",
        config,
        false
      );

      qrScanner.render(handleScanSuccess, handleScanError);
      setScanner(qrScanner);
      setIsScanning(true);
    }
  };

  const handleScanSuccess = async (decodedText: string, decodedResult: any) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Validate QR code with updated service
      const result = await qrCodeService.validateQRCode(
        decodedText, 
        currentAdmin?.id || 'unknown'
      );

      setScanResult(result);
      
      if (result.success && result.isValid) {
        // Log the scan
        await logScanEntry(result.userData, result.scanData);
        
        toast.success(`Access granted for ${result.userData.name}`, {
          description: `${scanMode.charAt(0).toUpperCase() + scanMode.slice(1)} logged successfully`,
        });
      } else {
        toast.error('Access denied', {
          description: result.error || 'Invalid QR code or expired subscription',
        });
      }

      // Call callback if provided
      if (onScanResult) {
        onScanResult(result);
      }

      // Stop scanning after successful scan
      if (scanner) {
        scanner.pause(true);
        setIsScanning(false);
      }

    } catch (error: any) {
      console.error('QR scan processing error:', error);
      const errorResult: ScanResult = {
        success: false,
        isValid: false,
        error: error.message || 'Failed to process QR code',
      };
      setScanResult(errorResult);
      
      toast.error('Scan failed', {
        description: error.message || 'Failed to process QR code',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScanError = (error: string) => {
    // Only log actual errors, not "No QR code found" messages
    if (!error.includes('No QR code found')) {
      console.warn('QR scan error:', error);
    }
  };

  const logScanEntry = async (userData: any, scanData: any) => {
    try {
      const scanLog = {
        user_id: userData.id,
        user_name: userData.name,
        user_email: userData.email,
        scan_type: scanMode,
        scan_time: new Date().toISOString(),
        location: 'Main Library',
        scanned_by: currentAdmin?.id || 'unknown',
        status: 'success',
        result: userData.subscription_status === 'active' ? 'granted' : 'denied',
        subscription_valid: userData.subscription_status === 'active',
        qr_data: JSON.stringify(scanData),
      };

      await addScanLog(scanLog);
    } catch (error) {
      console.error('Error logging scan:', error);
    }
  };

  const restartScanning = () => {
    setScanResult(null);
    setIsProcessing(false);
    if (scanner) {
      scanner.resume();
      setIsScanning(true);
    }
  };

  const toggleScanMode = () => {
    setScanMode(prev => prev === 'entry' ? 'exit' : 'entry');
    toast.info(`Switched to ${scanMode === 'entry' ? 'exit' : 'entry'} mode`);
  };

  const renderScanResult = () => {
    if (!scanResult) return null;

    const { success, isValid, userData, error } = scanResult;

    return (
      <div className="mt-6 p-4 rounded-lg border">
        <div className="flex items-center gap-3 mb-4">
          {success && isValid ? (
            <CheckCircle className="w-8 h-8 text-green-500" />
          ) : (
            <XCircle className="w-8 h-8 text-red-500" />
          )}
          <div>
            <h3 className="font-semibold">
              {success && isValid ? 'Access Granted' : 'Access Denied'}
            </h3>
            <p className="text-sm text-gray-600">
              {success && isValid ? 'Valid QR code scanned' : (error || 'Invalid QR code')}
            </p>
          </div>
        </div>

        {success && isValid && userData && (
          <div className="bg-gray-50 p-4 rounded-md">
            <div className="flex items-center gap-3 mb-3">
              {userData.profile_picture_url ? (
                <img
                  src={userData.profile_picture_url}
                  alt={userData.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center">
                  <User className="w-6 h-6 text-gray-600" />
                </div>
              )}
              <div>
                <h4 className="font-medium">{userData.name}</h4>
                <p className="text-sm text-gray-600">{userData.email}</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">Role:</span>
                <span className="ml-2 capitalize">{userData.role}</span>
              </div>
              <div>
                <span className="font-medium">Status:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  userData.status === 'verified' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {userData.status}
                </span>
              </div>
              <div>
                <span className="font-medium">Subscription:</span>
                <span className={`ml-2 px-2 py-1 rounded-full text-xs ${
                  userData.subscription_status === 'active' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {userData.subscription_status}
                </span>
              </div>
              {userData.subscription_end && (
                <div>
                  <span className="font-medium">Valid Until:</span>
                  <span className="ml-2">
                    {new Date(userData.subscription_end).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-2 mt-4">
          <button
            onClick={restartScanning}
            className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
          >
            Scan Another
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Camera className="w-6 h-6" />
            QR Code Scanner
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scan Mode Toggle */}
        <div className="flex items-center justify-center mb-4">
          <div className="bg-gray-100 rounded-lg p-1 flex">
            <button
              onClick={() => setScanMode('entry')}
              className={`px-4 py-2 rounded-md transition-colors ${
                scanMode === 'entry'
                  ? 'bg-white shadow-sm text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Entry
            </button>
            <button
              onClick={() => setScanMode('exit')}
              className={`px-4 py-2 rounded-md transition-colors ${
                scanMode === 'exit'
                  ? 'bg-white shadow-sm text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Exit
            </button>
          </div>
        </div>

        {/* Scanner Status */}
        <div className="text-center mb-4">
          {isProcessing ? (
            <div className="flex items-center justify-center gap-2 text-blue-600">
              <Clock className="w-4 h-4 animate-spin" />
              <span>Processing QR code...</span>
            </div>
          ) : isScanning ? (
            <p className="text-gray-600">
              Position QR code within the frame to scan for <strong>{scanMode}</strong>
            </p>
          ) : (
            <p className="text-gray-600">Scanner paused</p>
          )}
        </div>

        {/* Scanner Container */}
        <div className="relative">
          <div 
            id="qr-scanner-container" 
            ref={scannerRef}
            className="w-full"
          />
          
          {isProcessing && (
            <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
              <div className="text-center">
                <Clock className="w-8 h-8 animate-spin text-blue-500 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Processing...</p>
              </div>
            </div>
          )}
        </div>

        {/* Scan Result */}
        {renderScanResult()}

        {/* Instructions */}
        <div className="mt-4 p-3 bg-blue-50 rounded-md">
          <h4 className="font-medium text-blue-900 mb-2">Instructions:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Hold the QR code steady within the frame</li>
            <li>• Ensure good lighting for better scanning</li>
            <li>• Keep the camera 6-12 inches from the QR code</li>
            <li>• Wait for the scan to process completely</li>
          </ul>
        </div>
      </div>
    </div>
  );




3. Updated QR Code Service for Web App

// src/lib/qrCodeService.ts
import { doc, getDoc, updateDoc, collection, addDoc } from 'firebase/firestore';
import { db } from './firebase';
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

interface QRScanResult {
  success: boolean;
  isValid: boolean;
  userData?: any;
  scanData?: QRData;
  error?: string;
}

interface ScanLog {
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

class QRCodeService {
  private static ENCRYPTION_KEY = 'your-secret-encryption-key'; // Same as Flutter app
  
  /**
   * Generate QR code data for a user
   */
  static async generateQRCode(userId: string): Promise<{ success: boolean; qrCodeUrl?: string; error?: string }> {
    try {
      // Fetch user data from Firestore
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
        throw new Error('No active subscription found');
      }

      // Create QR data object
      const qrData: QRData = {
        userId: userData.id || userId,
        fullName: userData.name,
        email: userData.email,
        subscriptionValidUntil: userData.subscription_end || '',
        role: userData.role,
        institutionId: 'iqralibrary2025',
        profilePicUrl: userData.profile_picture_url,
        generatedAt: new Date().toISOString(),
      };

      // Encrypt the data
      const encryptedData = this.encryptData(JSON.stringify(qrData));
      
      // Generate hash for verification
      const dataHash = this.generateHash(encryptedData);

      // Create QR payload
      const qrPayload = {
        data: encryptedData,
        hash: dataHash,
        version: '1.0',
      };

      // Generate QR code URL (you can use a QR library here)
      const qrCodeData = JSON.stringify(qrPayload);
      
      // Update user profile with QR data
      await updateDoc(doc(db, 'user_profiles', userId), {
        qr_data: encryptedData,
        qr_code_url: qrCodeData, // Store the full QR payload
        updated_at: new Date().toISOString(),
      });

      return {
        success: true,
        qrCodeUrl: qrCodeData,
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
   * Validate QR code and return scan result
   */
  static async validateQRCode(qrData: string, scannedBy: string): Promise<QRScanResult> {
    try {
      // Parse QR payload
      let qrPayload;
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
}

export const qrCodeService = QRCodeService;



4. Updated Scan Log Store for Web App


// src/stores/scanLogStore.ts
import { create } from 'zustand';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  addDoc, 
  where,
  startAfter,
  getDocs
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

export interface ScanLog {
  id: string;
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

interface ScanLogState {
  scanLogs: ScanLog[];
  todayLogs: ScanLog[];
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  lastDoc: any;
  
  // Stats
  totalScans: number;
  successfulScans: number;
  failedScans: number;
  todayScans: number;
  
  // Actions
  fetchScanLogs: (limitCount?: number) => void;
  fetchMoreLogs: () => void;
  fetchTodayLogs: () => void;
  addScanLog: (scanLog: Omit<ScanLog, 'id'>) => Promise<void>;
  fetchUserScanLogs: (userId: string) => Promise<ScanLog[]>;
  calculateStats: () => void;
  clearLogs: () => void;
}

export const useScanLogStore = create<ScanLogState>((set, get) => ({
  scanLogs: [],
  todayLogs: [],
  loading: false,
  error: null,
  hasMore: true,
  lastDoc: null,
  totalScans: 0,
  successfulScans: 0,
  failedScans: 0,
  todayScans: 0,

  fetchScanLogs: (limitCount = 50) => {
    set({ loading: true, error: null });
    
    const logsQuery = query(
      collection(db, 'scan_logs'),
      orderBy('scan_time', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(logsQuery,
      (snapshot) => {
        const logs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ScanLog[];
        
        const lastVisible = snapshot.docs[snapshot.docs.length - 1];
        
        set({ 
          scanLogs: logs, 
          loading: false,
          lastDoc: lastVisible,
          hasMore: snapshot.docs.length === limitCount
        });
        
        // Calculate stats
        get().calculateStats();
      },
      (error) => {
        console.error('Error fetching scan logs:', error);
        set({ error: error.message, loading: false });
        toast.error('Failed to fetch scan logs');
      }
    );

    return unsubscribe;
  },

  fetchMoreLogs: async () => {
    const { lastDoc, hasMore } = get();
    
    if (!hasMore || !lastDoc) return;

    set({ loading: true });

    try {
      const moreLogsQuery = query(
        collection(db, 'scan_logs'),
        orderBy('scan_time', 'desc'),
        startAfter(lastDoc),
        limit(25)
      );

      const snapshot = await getDocs(moreLogsQuery);
      const moreLogs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ScanLog[];

      const newLastDoc = snapshot.docs[snapshot.docs.length - 1];

      set((state) => ({
        scanLogs: [...state.scanLogs, ...moreLogs],
        lastDoc: newLastDoc,
        hasMore: snapshot.docs.length === 25,
        loading: false
      }));

    } catch (error: any) {
      console.error('Error adding scan log:', error);
      toast.error('Failed to log scan');
      throw error;
    }
  },

  fetchUserScanLogs: async (userId: string): Promise<ScanLog[]> => {
    try {
      const userLogsQuery = query(
        collection(db, 'scan_logs'),
        where('user_id', '==', userId),
        orderBy('scan_time', 'desc'),
        limit(100)
      );

      const snapshot = await getDocs(userLogsQuery);
      return snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as ScanLog[];

    } catch (error: any) {
      console.error('Error fetching user scan logs:', error);
      toast.error('Failed to fetch user scan logs');
      return [];
    }
  },

  calculateStats: () => {
    const { scanLogs, todayLogs } = get();
    
    const totalScans = scanLogs.length;
    const successfulScans = scanLogs.filter(log => log.status === 'success').length;
    const failedScans = scanLogs.filter(log => log.status === 'failed').length;
    const todayScans = todayLogs.length;

    set({
      totalScans,
      successfulScans,
      failedScans,
      todayScans
    });
  },

  clearLogs: () => {
    set({
      scanLogs: [],
      todayLogs: [],
      totalScans: 0,
      successfulScans: 0,
      failedScans: 0,
      todayScans: 0,
      hasMore: true,
      lastDoc: null,
      error: null
    });
  },
}));: any) {
      console.error('Error fetching more logs:', error);
      set({ error: error.message, loading: false });
      toast.error('Failed to load more logs');
    }
  },

  fetchTodayLogs: () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();

    const todayQuery = query(
      collection(db, 'scan_logs'),
      where('scan_time', '>=', todayISO),
      orderBy('scan_time', 'desc')
    );

    const unsubscribe = onSnapshot(todayQuery,
      (snapshot) => {
        const todayLogs = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as ScanLog[];
        
        set({ todayLogs, todayScans: todayLogs.length });
      },
      (error) => {
        console.error('Error fetching today logs:', error);
        toast.error('Failed to fetch today\'s logs');
      }
    );

    return unsubscribe;
  },

  addScanLog: async (scanLogData: Omit<ScanLog, 'id'>) => {
    try {
      const docRef = await addDoc(collection(db, 'scan_logs'), scanLogData);
      
      // The real-time listener will automatically update the state
      console.log('Scan log added with ID:', docRef.id);
      
    } catch (error




    5. Updated User Verification Component for Web App


    // src/components/UserVerification.tsx
import React, { useState, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Calendar,
  FileText,
  Eye,
  Download
} from 'lucide-react';
import { useUserStore, UserProfile } from '../stores/userStore';
import { toast } from 'sonner';

interface UserVerificationProps {
  onClose?: () => void;
}

export const UserVerification: React.FC<UserVerificationProps> = ({ onClose }) => {
  const { 
    pendingUsers, 
    loading, 
    fetchPendingUsers, 
    verifyUser,
    updateUserSubscription 
  } = useUserStore();
  
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = fetchPendingUsers();
    return () => {
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, [fetchPendingUsers]);

  const handleApprove = async (userId: string) => {
    setProcessingUserId(userId);
    try {
      await verifyUser(userId, 'verified');
      toast.success('User approved successfully');
      setSelectedUser(null);
    } catch (error) {
      toast.error('Failed to approve user');
    } finally {
      setProcessingUserId(null);
    }
  };

  const handleReject = async (userId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessingUserId(userId);
    try {
      await verifyUser(userId, 'rejected', rejectionReason);
      toast.success('User rejected successfully');
      setSelectedUser(null);
      setShowRejectionModal(false);
      setRejectionReason('');
    } catch (error) {
      toast.error('Failed to reject user');
    } finally {
      setProcessingUserId(null);
    }
  };

  const openRejectionModal = (user: UserProfile) => {
    setSelectedUser(user);
    setShowRejectionModal(true);
  };

  const viewDocument = (url: string) => {
    if (url) {
      window.open(url, '_blank');
    } else {
      toast.error('Document not available');
    }
  };

  const renderUserCard = (user: UserProfile) => (
    <div key={user.id} className="bg-white rounded-lg shadow-md border border-gray-200 p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-4">
          {user.profile_picture_url ? (
            <img
              src={user.profile_picture_url}
              alt={user.name}
              className="w-16 h-16 rounded-full object-cover"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-300 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-gray-600" />
            </div>
          )}
          
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{user.name}</h3>
            <div className="flex items-center text-gray-600 text-sm mt-1">
              <Mail className="w-4 h-4 mr-1" />
              {user.email}
            </div>
            {user.phone && (
              <div className="flex items-center text-gray-600 text-sm mt-1">
                <Phone className="w-4 h-4 mr-1" />
                {user.phone}
              </div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-1">
          <Clock className="w-4 h-4 text-yellow-500" />
          <span className="text-sm text-yellow-600 font-medium">Pending</span>
        </div>
      </div>

      {/* User Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="text-sm font-medium text-gray-700">Registration Date</label>
          <div className="flex items-center text-gray-600 text-sm mt-1">
            <Calendar className="w-4 h-4 mr-1" />
            {new Date(user.created_at).toLocaleDateString()}
          </div>
        </div>
        
        {user.address && (
          <div>
            <label className="text-sm font-medium text-gray-700">Address</label>
            <div className="flex items-center text-gray-600 text-sm mt-1">
              <MapPin className="w-4 h-4 mr-1" />
              {user.address}
            </div>
          </div>
        )}
        
        <div>
          <label className="text-sm font-medium text-gray-700">Role</label>
          <div className="text-sm text-gray-600 mt-1 capitalize">{user.role}</div>
        </div>
        
        <div>
          <label className="text-sm font-medium text-gray-700">Account Status</label>
          <div className="text-sm text-gray-600 mt-1 capitalize">{user.status}</div>
        </div>
      </div>

      {/* Document Section */}
      <div className="mb-4">
        <label className="text-sm font-medium text-gray-700 mb-2 block">Documents</label>
        <div className="flex space-x-2">
          {user.profile_picture_url && (
            <button
              onClick={() => viewDocument(user.profile_picture_url!)}
              className="flex items-center px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded-md hover:bg-blue-100 transition-colors"
            >
              <Eye className="w-4 h-4 mr-1" />
              Profile Picture
            </button>
          )}
          
          {user.id_proof_url ? (
            <button
              onClick={() => viewDocument(user.id_proof_url!)}
              className="flex items-center px-3 py-2 text-sm bg-green-50 text-green-700 rounded-md hover:bg-green-100 transition-colors"
            >
              <FileText className="w-4 h-4 mr-1" />
              ID Proof
            </button>
          ) : (
            <span className="flex items-center px-3 py-2 text-sm bg-red-50 text-red-700 rounded-md">
              <XCircle className="w-4 h-4 mr-1" />
              No ID Proof
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex space-x-3">
        <button
          onClick={() => handleApprove(user.id)}
          disabled={processingUserId === user.id}
          className="flex-1 flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {processingUserId === user.id ? (
            <Clock className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <CheckCircle className="w-4 h-4 mr-2" />
          )}
          Approve
        </button>
        
        <button
          onClick={() => openRejectionModal(user)}
          disabled={processingUserId === user.id}
          className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          <XCircle className="w-4 h-4 mr-2" />
          Reject
        </button>
      </div>
    </div>
  );

  const renderRejectionModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Reject User Registration</h3>
        
        {selectedUser && (
          <div className="mb-4 p-3 bg-gray-50 rounded-md">
            <p className="font-medium">{selectedUser.name}</p>
            <p className="text-sm text-gray-600">{selectedUser.email}</p>
          </div>
        )}
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Rejection *
          </label>
          <textarea
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            placeholder="Please provide a clear reason for rejection..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
            rows={4}
          />
        </div>
        
        <div className="flex space-x-3">
          <button
            onClick={() => selectedUser && handleReject(selectedUser.id)}
            disabled={!rejectionReason.trim() || processingUserId === selectedUser?.id}
            className="flex-1 flex items-center justify-center px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {processingUserId === selectedUser?.id ? (
              <Clock className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <XCircle className="w-4 h-4 mr-2" />
            )}
            Confirm Rejection
          </button>
          
          <button
            onClick={() => {
              setShowRejectionModal(false);
              setRejectionReason('');
              setSelectedUser(null);
            }}
            disabled={processingUserId === selectedUser?.id}
            className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Clock className="w-6 h-6 animate-spin text-blue-500 mr-2" />
        <span>Loading pending users...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Verification</h2>
          <p className="text-gray-600 mt-1">Review and approve pending user registrations</p>
        </div>
        
        {pendingUsers.length > 0 && (
          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
            {pendingUsers.length} Pending
          </div>
        )}
      </div>

      {pendingUsers.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow-sm border border-gray-200">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">All Caught Up!</h3>
          <p className="text-gray-600">No pending user verifications at the moment.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {pendingUsers.map(renderUserCard)}
        </div>
      )}

      {showRejectionModal && renderRejectionModal()}
    </div>
  );
};