import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getFunctions } from "firebase/functions";
import { initializeAppCheck, ReCaptchaV3Provider, getToken } from "firebase/app-check";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDhZEmFLE7K50uKX1a0dDOuQy2iSmbxbVQ",
  authDomain: "iqralibrary2025.firebaseapp.com",
  projectId: "iqralibrary2025",
  storageBucket: "iqralibrary2025.firebasestorage.app",
  messagingSenderId: "572676592022",
  appId: "1:572676592022:web:fade189e19a7a3bec1cdb7",
  measurementId: "G-6NWJKSPY51"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize App Check with proper debug token handling
let appCheck: any;

// Check if we're in development environment
const isDevelopment = process.env.NODE_ENV === 'development' || 
                     window.location.hostname === 'localhost' ||
                     window.location.hostname === '127.0.0.1';

if (isDevelopment) {
  // For development, use a specific debug token instead of automatic generation
  // This approach is more reliable than automatic token generation
  const debugToken = 'debug-token-local-dev-12345'; // Fixed debug token for development
  
  if (typeof window !== 'undefined') {
    // Set the specific debug token instead of true
    (window as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
    
    // Also set it in self for service workers
    if (typeof self !== 'undefined') {
      (self as any).FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
    }
  }
  
  try {
    // Initialize with ReCaptchaV3Provider but debug mode will override it
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider('6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI'), // Google's test site key
      isTokenAutoRefreshEnabled: true
    });
    
    console.log('🔧 App Check initialized in DEBUG mode');
    console.log('🎯 Using fixed debug token:', debugToken);
    console.log('⚠️  IMPORTANT: Add this debug token to Firebase Console:');
    console.log('   1. Go to Firebase Console > Build > App Check');
    console.log('   2. Click on your web app');
    console.log('   3. Go to Debug tokens tab');
    console.log('   4. Add this token:', debugToken);
    console.log('   5. Make sure to save the changes');
    
    // Test the debug token after initialization
    setTimeout(async () => {
      try {
        console.log('🔄 Testing App Check debug token...');
        const token = await getToken(appCheck, true);
        console.log('✅ App Check debug token working successfully!');
        console.log('🔍 Token preview:', token.token.substring(0, 50) + '...');
      } catch (error: any) {
        console.error('❌ App Check debug token test failed:', error);
        console.log('🔧 Troubleshooting steps:');
        console.log('   1. Ensure the debug token "' + debugToken + '" is added to Firebase Console');
        console.log('   2. Wait up to 15 minutes for changes to propagate');
        console.log('   3. Refresh the page after adding the token');
        console.log('   4. Check that App Check is enabled for your project');
      }
    }, 3000);
    
  } catch (error) {
    console.error('❌ Failed to initialize App Check in debug mode:', error);
    console.warn('⚠️  App Check initialization failed - continuing without it');
    appCheck = null;
  }
} else {
  try {
    // For production, use reCAPTCHA v3 with a valid site key
    appCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider('6LdYHwAqAAAAABLkf6aiiHvpGHgs7glsFJQRdHWl'), // Replace with your actual reCAPTCHA v3 site key
      isTokenAutoRefreshEnabled: true
    });
    
    console.log('🔒 App Check initialized in PRODUCTION mode with reCAPTCHA v3');
  } catch (error) {
    console.error('❌ Failed to initialize App Check in production mode:', error);
    appCheck = null;
  }
}

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export const functions = getFunctions(app);
export { appCheck };

// App Check utility functions
export const forceRefreshAppCheckToken = async (): Promise<string | null> => {
  try {
    if (!appCheck) {
      console.warn('⚠️ App Check not initialized - skipping token refresh');
      return null;
    }
    
    console.log('🔄 Force refreshing App Check token...');
    const token = await getToken(appCheck, true); // Force refresh
    console.log('✅ App Check token refreshed successfully');
    console.log('🔍 Token preview:', token.token.substring(0, 50) + '...');
    return token.token;
  } catch (error: any) {
    console.error('❌ Failed to refresh App Check token:', error);
    
    // Provide specific error guidance
    if (error.code === 'app-check/fetch-status-error') {
      console.log('🔧 This is likely because the debug token is not registered in Firebase Console');
      console.log('📋 Steps to fix:');
      console.log('   1. Copy the debug token from the console logs above');
      console.log('   2. Go to Firebase Console > Build > App Check');
      console.log('   3. Select your web app and add the debug token');
      console.log('   4. Wait up to 15 minutes for changes to propagate');
    }
    
    // In development, don't throw error to allow app to continue
    if (isDevelopment) {
      console.warn('⚠️  Development mode: continuing without App Check token');
      return null;
    }
    
    throw error;
  }
};

export const getAppCheckToken = async (forceRefresh: boolean = false): Promise<string | null> => {
  try {
    if (!appCheck) {
      console.warn('⚠️ App Check not initialized - returning null');
      return null;
    }
    
    const token = await getToken(appCheck, forceRefresh);
    if (forceRefresh) {
      console.log('🔄 App Check token obtained (forced refresh)');
    }
    return token.token;
  } catch (error: any) {
    console.error('❌ Failed to get App Check token:', error);
    
    // Enhanced error reporting
    if (error.code) {
      console.log('Error code:', error.code);
    }
    if (error.message) {
      console.log('Error message:', error.message);
    }
    
    // In development, don't throw error to allow app to continue
    if (isDevelopment) {
      console.warn('⚠️  Development mode: continuing without App Check token');
      return null;
    }
    
    throw error;
  }
};

export const logAppCheckStatus = async (): Promise<void> => {
  try {
    if (!appCheck) {
      console.log('❌ App Check not initialized');
      return;
    }
    
    const token = await getAppCheckToken();
    if (token) {
      console.log('✅ App Check token available:', token.substring(0, 20) + '...');
      console.log('🔍 Token length:', token.length);
      console.log('🕒 Current time:', new Date().toISOString());
    } else {
      console.log('❌ No App Check token available');
    }
  } catch (error: any) {
    console.error('❌ App Check status check failed:', error);
    console.log('🔧 This usually means the debug token needs to be registered in Firebase Console');
    
    // In development, provide more helpful guidance
    if (isDevelopment) {
      console.log('💡 Development tips:');
      console.log('   1. Check if the debug token was logged above');
      console.log('   2. Add it to Firebase Console > App Check > Debug tokens');
      console.log('   3. Refresh the page after adding the token');
      console.log('   4. App will continue to work with limited functionality');
    }
  }
};

// Helper function to check if App Check is working
export const isAppCheckWorking = async (): Promise<boolean> => {
  try {
    if (!appCheck) return false;
    const token = await getAppCheckToken();
    return !!token;
  } catch {
    return false;
  }
};

// Helper function to get stored debug token
export const getStoredDebugToken = (): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('firebase_appcheck_debug_token');
  }
  return null;
};

export default app;