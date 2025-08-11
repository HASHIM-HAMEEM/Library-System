import { auth, forceRefreshAppCheckToken, logAppCheckStatus, isAppCheckWorking, getStoredDebugToken, getAppCheckToken } from './firebase';
import CryptoJS from 'crypto-js';

/**
 * Service for secure encryption key management
 * Handles retrieval, caching, and rotation of encryption keys
 * for QR code generation and verification
 */
export class KeyService {
  // Default fallback key (used only if server key retrieval fails)
  private static readonly FALLBACK_KEY = 'LibraryQRSecureKey2024!@#$%^&*';
  
  // Cache for the current encryption key
  private static currentKey: string | null = null;
  
  // Key expiration timestamp
  private static keyExpiresAt: number = 0;
  
  // Grace period for offline usage (in milliseconds)
  private static readonly KEY_GRACE_PERIOD = 24 * 60 * 60 * 1000; // 24 hours
  
  // Key refresh interval to ensure we have a valid key (in milliseconds)
  private static readonly KEY_REFRESH_INTERVAL = 60 * 60 * 1000; // 1 hour
  
  // Refresh timer reference
  private static refreshTimer: NodeJS.Timeout | null = null;

  /**
   * Initialize the key service and start refresh cycle
   */
  static async initialize(): Promise<boolean> {
    try {
      console.log('[KeyService] Initializing key service...');
      
      // Check if user is authenticated before trying to fetch key
      if (!auth.currentUser) {
        console.log('[KeyService] No authenticated user, waiting for authentication...');
        
        // Set up auth state listener for when user logs in
        auth.onAuthStateChanged(async (user) => {
          if (user && !this.currentKey) {
            console.log('[KeyService] User authenticated, fetching initial key...');
            const success = await this.refreshKey();
            
            // Start refresh cycle if successful and not already running
            if (success && !this.refreshTimer) {
              this.refreshTimer = setInterval(
                () => this.refreshKey(), 
                this.KEY_REFRESH_INTERVAL
              );
              console.log('[KeyService] Refresh cycle started');
            }
          }
        });
        
        // Return true to indicate initialization setup is complete
        // The actual key fetching will happen when user authenticates
        return true;
      }
      
      // User is already authenticated, fetch the initial key
      console.log('[KeyService] User already authenticated, fetching initial key...');
      const success = await this.refreshKey();
      
      // Start refresh cycle
      if (success && !this.refreshTimer) {
        this.refreshTimer = setInterval(
          () => this.refreshKey(), 
          this.KEY_REFRESH_INTERVAL
        );
        console.log('[KeyService] Refresh cycle started');
      }
      
      return success;
    } catch (error) {
      console.error('[KeyService] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Synchronous accessor for the cached key
   * Useful for legacy synchronous encryption paths where refactoring to async is costly.
   * Will throw if no valid centralized key is available, unless VITE_ALLOW_KEY_FALLBACK === 'true'.
   */
  static getCachedKeySync(): string {
    console.log('[KeyService] getCachedKeySync called');
    console.log('[KeyService] Current cached key:', this.currentKey);
    console.log('[KeyService] Key expires at:', new Date(this.keyExpiresAt));
    console.log('[KeyService] Current time:', new Date());
    console.log('[KeyService] Key is valid:', this.currentKey && Date.now() < this.keyExpiresAt);
    
    if (this.currentKey && Date.now() < this.keyExpiresAt) {
      console.log('[KeyService] Returning cached key:', this.currentKey);
      return this.currentKey;
    }
    const allowFallback = import.meta.env?.VITE_ALLOW_KEY_FALLBACK === 'true';
    if (allowFallback) {
      console.warn('[KeyService] Using fallback key (dev only). Centralized key unavailable.');
      return this.FALLBACK_KEY;
    }
    throw new Error('[KeyService] Centralized AES key unavailable. Likely App Check is blocking key retrieval. Fix App Check or set VITE_ALLOW_KEY_FALLBACK=true for local dev.');
  }

  /**
   * Clear the cached key and force a refresh on next access
   */
  static clearCache(): void {
    console.log('[KeyService] Clearing cache - old key:', this.currentKey);
    this.currentKey = null;
    this.keyExpiresAt = 0;
    console.log('[KeyService] Cache cleared');
  }

  /**
   * Get the current encryption key
   * Will try to refresh if expired
   */
  static async getKey(): Promise<string> {
    try {
      // Check if we have a cached key that's still valid
      if (this.currentKey && Date.now() < this.keyExpiresAt) {
        return this.currentKey;
      }
      
      // Try to refresh the key
      const success = await this.refreshKey();
      
      if (!success) {
        const allowFallback = import.meta.env?.VITE_ALLOW_KEY_FALLBACK === 'true';
        if (allowFallback) {
          console.warn('[KeyService] Using fallback key (dev only) due to retrieval failure');
          return this.FALLBACK_KEY;
        }
        throw new Error('[KeyService] Centralized AES key retrieval failed. Fix App Check/auth or enable VITE_ALLOW_KEY_FALLBACK=true for local dev.');
      }
      
      return this.currentKey!;
    } catch (error) {
      console.error('[KeyService] Error getting key:', error);
      
      // If we had a previously valid key but within grace period, use it
      if (this.currentKey && Date.now() < (this.keyExpiresAt + this.KEY_GRACE_PERIOD)) {
        console.warn('[KeyService] Using cached key within grace period');
        return this.currentKey;
      }

      const allowFallback = import.meta.env?.VITE_ALLOW_KEY_FALLBACK === 'true';
      if (allowFallback) {
        console.warn('[KeyService] Using fallback key (dev only) after error getting key');
        return this.FALLBACK_KEY;
      }
      throw new Error('[KeyService] Centralized AES key unavailable after error. Fix App Check/auth or enable VITE_ALLOW_KEY_FALLBACK=true for local dev.');
    }
  }

  /**
   * Refresh the encryption key from the server
   * @param retryWithTokenRefresh Whether to retry with a fresh App Check token
   * @returns Promise<boolean> indicating success
   */
  private static async refreshKey(retryWithTokenRefresh: boolean = false): Promise<boolean> {
    try {
      console.log('[KeyService] Refreshing encryption key');
      
      // Check App Check status first
      const appCheckWorking = await isAppCheckWorking();
      const debugToken = getStoredDebugToken();
      
      console.log('🔍 App Check status:', appCheckWorking ? '✅ Working' : '❌ Not working');
      if (debugToken) {
        console.log('🔍 Debug token stored:', debugToken.substring(0, 20) + '...');
      }
      
      // Check if user is authenticated
      if (!auth.currentUser) {
        console.warn('[KeyService] User not authenticated, waiting for auth state...');
        // Wait for authentication state to be available
        await new Promise<void>((resolve, reject) => {
          const unsubscribe = auth.onAuthStateChanged((user) => {
            unsubscribe();
            if (user) {
              console.log('[KeyService] User authenticated:', user.uid);
              resolve();
            } else {
              reject(new Error('User not authenticated'));
            }
          });
          
          // Timeout after 15 seconds (increased from 10)
          setTimeout(() => {
            unsubscribe();
            reject(new Error('Authentication timeout'));
          }, 15000);
        });
      } else {
        console.log('[KeyService] User already authenticated:', auth.currentUser.uid);
      }
      
      // If this is a retry, force refresh the App Check token
      if (retryWithTokenRefresh) {
        console.log('🔄 Retrying with fresh App Check token...');
        try {
          await forceRefreshAppCheckToken();
          console.log('✅ App Check token refreshed for retry');
        } catch (tokenError: any) {
          console.error('❌ Failed to refresh App Check token:', tokenError);
          
          // Provide specific guidance for App Check issues
          if (tokenError.code === 'app-check/fetch-status-error') {
            console.log('🔧 App Check debug token may not be registered.');
            console.log('📋 To fix: Go to Firebase Console > App Check > Debug tokens');
            if (debugToken) {
              console.log('🎯 Add this token:', debugToken);
            }
          }
          // Continue anyway, maybe the old token will work
        }
      }
      
      // Log App Check status for debugging
      await logAppCheckStatus();
      
      console.log('[KeyService] Calling getQrEncryptionKey HTTP endpoint...');
      
      // Get the user's ID token for authentication
      const idToken = await auth.currentUser!.getIdToken();
      
      // Get App Check token (optional)
      let appCheckToken: string | null = null;
      try {
        appCheckToken = await getAppCheckToken();
        if (appCheckToken) {
          console.log('✅ App Check token obtained for request');
        }
      } catch (error) {
        console.warn('⚠️ Could not get App Check token, continuing without it:', error);
      }
      
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      };
      
      // Add App Check token if available
      if (appCheckToken) {
        headers['X-Firebase-AppCheck'] = appCheckToken;
      }
      
      // Make HTTP request to the function
      const functionUrl = 'https://us-central1-iqralibrary2025.cloudfunctions.net/getQrEncryptionKeyHttp';
      
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('HTTP request timeout')), 30000);
      });
      
      const response = await Promise.race([
        fetch(functionUrl, {
          method: 'POST',
          headers: headers,
          body: JSON.stringify({})
        }),
        timeoutPromise
      ]) as Response;
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json() as { key: string; expiresAt: number };
      
      console.log('[KeyService] Raw response from Firebase function:', data);
      console.log('[KeyService] Key from Firebase function:', data.key);
      console.log('[KeyService] Key type:', typeof data.key);
      console.log('[KeyService] Key length:', data.key?.length);
      
      if (!data || !data.key) {
        throw new Error('Invalid response from key server');
      }
      
      // Store the key and expiration
      this.currentKey = data.key.trim(); // Trim to remove any whitespace
      this.keyExpiresAt = data.expiresAt || (Date.now() + this.KEY_REFRESH_INTERVAL);
      
      console.log('[KeyService] Stored key after trim:', this.currentKey);
      console.log('[KeyService] Expected static key:', this.FALLBACK_KEY);
      console.log('[KeyService] Keys match:', this.currentKey === this.FALLBACK_KEY);
      console.log('[KeyService] Key refreshed successfully, expires at:', new Date(this.keyExpiresAt));
      return true;
    } catch (error: any) {
      console.error('[KeyService] Failed to refresh key:', error);
      
      // Enhanced error logging
      if (error.code) {
        console.log('[KeyService] Error code:', error.code);
      }
      if (error.message) {
        console.log('[KeyService] Error message:', error.message);
      }
      
      // Check for specific error types
      if (error.message?.includes('net::ERR_FAILED')) {
        console.log('🔧 Network error detected - this is likely an App Check token issue');
        console.log('📋 The debug token needs to be registered in Firebase Console');
        const debugToken = getStoredDebugToken();
        if (debugToken) {
          console.log('🎯 Debug token to register:', debugToken);
        }
      }
      
      // Enhanced App Check error handling
      if (error.code === 'functions/internal') {
        console.log('⚙️ Internal server error - this may be related to App Check token issues');
        console.log('💡 Try registering the App Check debug token in Firebase Console');
        const debugToken = getStoredDebugToken();
        if (debugToken) {
          console.log(`💡 Debug token to register: ${debugToken}`);
        }
      } else if (error.message?.includes('Failed to fetch') || error.message?.includes('ERR_FAILED')) {
        console.log('🌐 Network error - check internet connection and Firebase configuration');
        console.log('💡 This might be related to App Check token validation failure');
      }
      
      // If we get an App Check related error and haven't tried refreshing the token yet
      if (!retryWithTokenRefresh && this.isAppCheckError(error)) {
        console.log('🔄 App Check error detected, retrying with token refresh...');
        return this.refreshKey(true);
      }
      
      // Provide comprehensive troubleshooting for persistent failures
      if (retryWithTokenRefresh) {
        console.log('🔧 Troubleshooting checklist:');
        console.log('   1. ✓ Check if user is properly authenticated');
        console.log('   2. ❓ Verify App Check debug token is registered in Firebase Console');
        const debugToken = getStoredDebugToken();
        if (debugToken) {
          console.log(`      → Debug token to register: ${debugToken}`);
        }
        console.log('   3. ❓ Check Firebase Functions logs for server-side errors');
        console.log('   4. ❓ Ensure CORS is properly configured for your domain');
        console.log('   5. ❓ Wait 15 minutes after registering debug token for changes to propagate');
      }
      
      return false;
    }
  }

  /**
   * Check if error is related to App Check
   */
  private static isAppCheckError(error: any): boolean {
    const errorMessage = error?.message?.toLowerCase() || '';
    const errorCode = error?.code?.toLowerCase() || '';
    
    return (
      errorMessage.includes('app check') ||
      errorMessage.includes('unauthenticated') ||
      errorMessage.includes('invalid token') ||
      errorMessage.includes('net::err_failed') ||
      errorMessage.includes('internal') ||
      errorMessage.includes('cors') ||
      errorCode.includes('app-check') ||
      errorCode.includes('unauthenticated') ||
      errorCode.includes('internal')
    );
  }

  /**
   * Clear the refresh timer (cleanup)
   */
  static cleanup(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Generate a padded key suitable for AES encryption
   * @param key The raw key to pad
   * @returns A 32-byte padded key
   */
  static getPaddedKey(key: string): string {
    return key.padEnd(32, '0').slice(0, 32);
  }

  /**
   * Encrypt data using the secure key
   * @param data The data to encrypt
   * @returns Encrypted string
   */
  static async encrypt(data: string): Promise<string> {
    try {
      const key = await this.getKey();
      const paddedKey = this.getPaddedKey(key);
      
      // Use padded key for AES encryption
      const keyObj = CryptoJS.enc.Utf8.parse(paddedKey);
      // Use 16-byte zero IV as specified
      const iv = CryptoJS.enc.Utf8.parse('\0'.repeat(16));
      
      const encrypted = CryptoJS.AES.encrypt(data, keyObj, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      return encrypted.toString();
    } catch (error) {
      console.error('[KeyService] Encryption error:', error);
      throw new Error(`Encryption failed: ${error.message}`);
    }
  }

  /**
   * Generate hash for data verification (SHA-256 of ciphertext + raw key)
   * @param data The data to hash
   * @returns SHA-256 hash string
   */
  static async generateHash(data: string): Promise<string> {
    const key = await this.getKey();
    return CryptoJS.SHA256(data + key).toString();
  }

  /**
   * Decrypt data using the secure key with multiple fallback methods
   * @param encryptedData The data to decrypt
   * @returns Decrypted string
   */
  static async decrypt(encryptedData: string): Promise<string> {
    try {
      const key = await this.getKey();
      const paddedKey = this.getPaddedKey(key);
      
      // Try different AES parameter combinations for Flutter compatibility
      const decryptionConfigs = [
        {
          name: 'Standard (Padded key + Zero IV)',
          key: CryptoJS.enc.Utf8.parse(paddedKey),
          iv: CryptoJS.enc.Utf8.parse('\0'.repeat(16)),
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        },
        {
          name: 'Raw key + Zero IV',
          key: CryptoJS.enc.Utf8.parse(key.padEnd(32, '\0').slice(0, 32)),
          iv: CryptoJS.enc.Utf8.parse('\0'.repeat(16)),
          mode: CryptoJS.mode.CBC,
          padding: CryptoJS.pad.Pkcs7
        },
        {
          name: 'Padded key + No IV (ECB mode)',
          key: CryptoJS.enc.Utf8.parse(paddedKey),
          iv: null,
          mode: CryptoJS.mode.ECB,
          padding: CryptoJS.pad.Pkcs7
        }
      ];
      
      for (const config of decryptionConfigs) {
        try {
          const decryptOptions: any = {
            mode: config.mode,
            padding: config.padding
          };
          
          if (config.iv) {
            decryptOptions.iv = config.iv;
          }
          
          const decrypted = CryptoJS.AES.decrypt(encryptedData, config.key, decryptOptions);
          
          // Try multiple encoding methods for this decryption
          const encodingMethods = [
            { name: 'UTF-8', encoder: CryptoJS.enc.Utf8 },
            { name: 'Latin1', encoder: CryptoJS.enc.Latin1 }
          ];
          
          for (const method of encodingMethods) {
            try {
              const result = decrypted.toString(method.encoder);
              
              // Validate the result
              if (result && result.length > 0) {
                // Check if it's valid JSON
                if (this.isValidJson(result)) {
                  return result;
                }
                
                // Check if it contains mostly printable characters
                if (this.containsPrintableChars(result)) {
                  return result;
                }
              }
            } catch (encodingError) {
              continue;
            }
          }
        } catch (configError) {
          continue;
        }
      }
      
      throw new Error('Decryption failed with all methods');
    } catch (error) {
      console.error('[KeyService] Decryption error:', error);
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
   */
  private static containsPrintableChars(str: string): boolean {
    if (!str || str.length === 0) return false;
    
    // Count printable characters (ASCII 32-126 plus common Unicode)
    const printableCount = str.split('').filter(char => {
      const code = char.charCodeAt(0);
      return (code >= 32 && code <= 126) || code >= 160;
    }).length;
    
    // Consider valid if at least 70% are printable characters
    return (printableCount / str.length) >= 0.7;
  }
}

// Export a default instance
export default KeyService;

// Global functions for debugging and cache management
if (typeof window !== 'undefined') {
  // Force clear KeyService cache and fetch fresh key
  (window as any).forceRefreshKeyService = async () => {
    console.log('🔄 [DEBUG] Force clearing KeyService cache...');
    
    // Clear current cache
    (KeyService as any).currentKey = null;
    (KeyService as any).keyExpiresAt = 0;
    
    console.log('✅ [DEBUG] KeyService cache cleared');
    
    try {
      // Force refresh from server
      const success = await (KeyService as any).refreshKey(true);
      if (success) {
        console.log('✅ [DEBUG] KeyService refreshed successfully');
        const currentKey = KeyService.getCachedKeySync();
        console.log('🔍 [DEBUG] Current key:', currentKey);
        console.log('🔍 [DEBUG] Expected static key:', 'LibraryQRSecureKey2024!@#$%^&*');
        console.log('🔍 [DEBUG] Keys match:', currentKey === 'LibraryQRSecureKey2024!@#$%^&*');
        return currentKey;
      } else {
        console.error('❌ [DEBUG] Failed to refresh KeyService');
        return null;
      }
    } catch (error) {
      console.error('❌ [DEBUG] Error refreshing KeyService:', error);
      return null;
    }
  };
  
  // Debug current KeyService state
  (window as any).debugKeyServiceState = () => {
    console.log('🔍 [DEBUG] KeyService State:');
    console.log('  Current key:', (KeyService as any).currentKey);
    console.log('  Key expires at:', (KeyService as any).keyExpiresAt ? new Date((KeyService as any).keyExpiresAt) : 'Not set');
    console.log('  Fallback key:', (KeyService as any).FALLBACK_KEY);
    console.log('  Using fallback:', !(KeyService as any).currentKey || (KeyService as any).keyExpiresAt < Date.now());
    
    const syncKey = KeyService.getCachedKeySync();
    console.log('  Sync key result:', syncKey);
    console.log('  Expected static key:', 'LibraryQRSecureKey2024!@#$%^&*');
    console.log('  Keys match:', syncKey === 'LibraryQRSecureKey2024!@#$%^&*');
  };
  
  console.log('🔧 [DEBUG] KeyService debug functions available:');
  console.log('  - forceRefreshKeyService(): Force clear cache and refresh key');
  console.log('  - debugKeyServiceState(): Show current KeyService state');
}