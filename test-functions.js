// Test script for Firebase Functions with App Check
const { initializeApp } = require('firebase/app');
const { getFunctions, httpsCallable } = require('firebase/functions');
const { initializeAppCheck, ReCaptchaV3Provider } = require('firebase/app-check');

// Firebase configuration (replace with your actual config)
const firebaseConfig = {
  // Add your Firebase config here
  projectId: 'iqralibrary2025',
  // ... other config
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize App Check with debug token for testing
if (typeof window !== 'undefined') {
  // This would run in browser environment
  const appCheck = initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider('your-recaptcha-site-key'),
    isTokenAutoRefreshEnabled: true
  });
}

// Initialize Functions
const functions = getFunctions(app, 'us-central1');

// Test the getQrEncryptionKey function
async function testGetQrEncryptionKey() {
  try {
    console.log('Testing getQrEncryptionKey function...');
    const getKey = httpsCallable(functions, 'getQrEncryptionKey');
    const result = await getKey();
    console.log('Success:', result.data);
    return result.data;
  } catch (error) {
    console.error('Error calling getQrEncryptionKey:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    throw error;
  }
}

// Test the health check function
async function testHealthCheck() {
  try {
    console.log('Testing health check...');
    const response = await fetch('https://us-central1-iqralibrary2025.cloudfunctions.net/healthCheck');
    const data = await response.json();
    console.log('Health check result:', data);
    return data;
  } catch (error) {
    console.error('Error calling health check:', error);
    throw error;
  }
}

// Run tests
async function runTests() {
  console.log('Starting Firebase Functions tests...');
  
  try {
    // Test health check first (no auth required)
    await testHealthCheck();
    
    // Test encryption key function (requires auth and App Check)
    // Note: This will fail without proper authentication
    // await testGetQrEncryptionKey();
    
    console.log('Tests completed successfully!');
  } catch (error) {
    console.error('Tests failed:', error);
  }
}

if (require.main === module) {
  runTests();
}

module.exports = {
  testGetQrEncryptionKey,
  testHealthCheck,
  runTests
};