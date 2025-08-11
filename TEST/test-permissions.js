/**
 * Permission Testing Script
 * Run this script to test Firebase permissions and functionality
 */

import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, collection, getDocs } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

// Firebase configuration
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

// Initialize App Check for development
if (typeof window !== 'undefined') {
  window.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

initializeAppCheck(app, {
  provider: new ReCaptchaV3Provider('6LdYHwAqAAAAABLkf6aiiHvpGHgs7glsFJQRdHWl'),
  isTokenAutoRefreshEnabled: true
});

const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app, 'us-central1');

/**
 * Test Firebase Functions
 */
async function testFirebaseFunctions() {
  console.log('\n🔧 Testing Firebase Functions...');
  
  try {
    // Test health check
    const response = await fetch('https://us-central1-iqralibrary2025.cloudfunctions.net/healthCheck');
    const healthData = await response.json();
    console.log('✅ Health Check:', healthData);
    
    // Test getQrEncryptionKey function
    const getQrEncryptionKey = httpsCallable(functions, 'getQrEncryptionKey');
    const keyResult = await getQrEncryptionKey();
    console.log('✅ QR Encryption Key:', keyResult.data);
    
  } catch (error) {
    console.error('❌ Firebase Functions Error:', error);
  }
}

/**
 * Test Firestore Permissions
 */
async function testFirestorePermissions() {
  console.log('\n📊 Testing Firestore Permissions...');
  
  try {
    const user = auth.currentUser;
    if (!user) {
      throw new Error('User not authenticated');
    }
    
    // Test user profile access
    const userProfileRef = doc(db, 'user_profiles', user.uid);
    const userProfileSnap = await getDoc(userProfileRef);
    console.log('✅ User Profile Access:', userProfileSnap.exists());
    
    // Test QR codes collection
    const qrCodesRef = collection(db, 'qr_codes');
    const qrCodesSnap = await getDocs(qrCodesRef);
    console.log('✅ QR Codes Collection Access:', qrCodesSnap.size, 'documents');
    
    // Test creating a QR code
    const testQrRef = doc(qrCodesRef);
    await setDoc(testQrRef, {
      userId: user.uid,
      data: 'test-qr-data',
      createdAt: new Date(),
      isActive: true
    });
    console.log('✅ QR Code Creation: Success');
    
    // Test scan logs
    const scanLogsRef = collection(db, 'scan_logs');
    const scanLogsSnap = await getDocs(scanLogsRef);
    console.log('✅ Scan Logs Access:', scanLogsSnap.size, 'documents');
    
    // Test admin collections (if user is admin)
    try {
      const dashboardStatsRef = collection(db, 'dashboard_stats');
      const dashboardStatsSnap = await getDocs(dashboardStatsRef);
      console.log('✅ Dashboard Stats Access (Admin):', dashboardStatsSnap.size, 'documents');
    } catch (error) {
      console.log('ℹ️ Dashboard Stats Access: Not admin or no data');
    }
    
  } catch (error) {
    console.error('❌ Firestore Permissions Error:', error);
  }
}

/**
 * Test Authentication Flow
 */
async function testAuthentication() {
  console.log('\n🔐 Testing Authentication...');
  
  return new Promise((resolve) => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        console.log('✅ User Authenticated:', user.email);
        console.log('✅ User UID:', user.uid);
        console.log('✅ Email Verified:', user.emailVerified);
        resolve(user);
      } else {
        console.log('❌ User Not Authenticated');
        resolve(null);
      }
      unsubscribe();
    });
  });
}

/**
 * Main test function
 */
async function runTests() {
  console.log('🚀 Starting Firebase Permissions Test...');
  
  try {
    // Test authentication
    const user = await testAuthentication();
    
    if (user) {
      // Test Firebase Functions
      await testFirebaseFunctions();
      
      // Test Firestore permissions
      await testFirestorePermissions();
    } else {
      console.log('⚠️ Please sign in to test authenticated features');
    }
    
    console.log('\n✅ All tests completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Export for use in browser console or Node.js
if (typeof window !== 'undefined') {
  window.runFirebaseTests = runTests;
  window.testAuth = testAuthentication;
  window.testFunctions = testFirebaseFunctions;
  window.testFirestore = testFirestorePermissions;
  
  console.log('🔧 Firebase test functions loaded!');
  console.log('Run: runFirebaseTests() to test all permissions');
  console.log('Or run individual tests: testAuth(), testFunctions(), testFirestore()');
}

export { runTests, testAuthentication, testFirebaseFunctions, testFirestorePermissions };