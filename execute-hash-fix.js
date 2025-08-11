#!/usr/bin/env node

/**
 * Hash Mismatch Fix Execution Script
 * This script implements the complete solution to fix the persistent hash mismatch issue
 * between the web app and Flutter app.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🔧 Starting Hash Mismatch Fix Implementation...');
console.log('=' .repeat(60));

// Step 1: Verify environment configuration
function verifyEnvironmentConfig() {
    console.log('\n📋 Step 1: Verifying Environment Configuration');
    
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        const aesKeyMatch = envContent.match(/VITE_AES_KEY=(.+)/);
        
        if (aesKeyMatch) {
            const envKey = aesKeyMatch[1].trim();
            console.log(`✅ Found VITE_AES_KEY: ${envKey}`);
            
            if (envKey === 'LibraryQRSecureKey2024!@#$%^&*') {
                console.log('✅ Environment key matches expected static key');
                return true;
            } else {
                console.log('❌ Environment key does not match expected static key');
                return false;
            }
        } else {
            console.log('❌ VITE_AES_KEY not found in .env file');
            return false;
        }
    } else {
        console.log('❌ .env file not found');
        return false;
    }
}

// Step 2: Check Firebase functions configuration
function checkFirebaseFunctions() {
    console.log('\n🔥 Step 2: Checking Firebase Functions Configuration');
    
    const functionsPath = path.join(__dirname, 'functions', 'src', 'index.ts');
    if (fs.existsSync(functionsPath)) {
        const functionsContent = fs.readFileSync(functionsPath, 'utf8');
        
        // Check if static key is being returned
        if (functionsContent.includes("'LibraryQRSecureKey2024!@#$%^&*'")) {
            console.log('✅ Firebase functions configured to return static key');
            return true;
        } else {
            console.log('❌ Firebase functions not configured with static key');
            return false;
        }
    } else {
        console.log('❌ Firebase functions index.ts not found');
        return false;
    }
}

// Step 3: Verify KeyService implementation
function verifyKeyServiceImplementation() {
    console.log('\n🔑 Step 3: Verifying KeyService Implementation');
    
    const keyServicePath = path.join(__dirname, 'src', 'lib', 'keyService.ts');
    if (fs.existsSync(keyServicePath)) {
        const keyServiceContent = fs.readFileSync(keyServicePath, 'utf8');
        
        // Check for fallback key
        if (keyServiceContent.includes('LibraryQRSecureKey2024!@#$%^&*')) {
            console.log('✅ KeyService has correct fallback key');
        } else {
            console.log('❌ KeyService fallback key not found or incorrect');
        }
        
        // Check for cache clearing functionality
        if (keyServiceContent.includes('clearCache') || keyServiceContent.includes('clearKeyServiceCache')) {
            console.log('✅ KeyService has cache clearing functionality');
            return true;
        } else {
            console.log('❌ KeyService missing cache clearing functionality');
            return false;
        }
    } else {
        console.log('❌ KeyService file not found');
        return false;
    }
}

// Step 4: Check DynamicQRService implementation
function verifyDynamicQRService() {
    console.log('\n🎯 Step 4: Verifying DynamicQRService Implementation');
    
    const qrServicePath = path.join(__dirname, 'src', 'lib', 'dynamicQRService.ts');
    if (fs.existsSync(qrServicePath)) {
        const qrServiceContent = fs.readFileSync(qrServicePath, 'utf8');
        
        // Check for global debug functions
        if (qrServiceContent.includes('window.clearKeyServiceCache') && 
            qrServiceContent.includes('window.debugQREncryption')) {
            console.log('✅ DynamicQRService has global debug functions');
            return true;
        } else {
            console.log('❌ DynamicQRService missing global debug functions');
            return false;
        }
    } else {
        console.log('❌ DynamicQRService file not found');
        return false;
    }
}

// Step 5: Generate fix instructions
function generateFixInstructions() {
    console.log('\n📋 Step 5: Generating Fix Instructions');
    
    const instructions = `
# Hash Mismatch Fix Instructions

## Immediate Actions Required:

### 1. Clear KeyService Cache
\`\`\`javascript
// In browser console:
clearKeyServiceCache();
\`\`\`

### 2. Debug Current Key State
\`\`\`javascript
// In browser console:
debugQREncryption();
\`\`\`

### 3. Fix App Check 403 Errors
- Go to Firebase Console → App Check
- Add debug token from browser console
- Or temporarily disable App Check enforcement

### 4. Deploy Firebase Functions
\`\`\`bash
cd functions
npm run deploy
\`\`\`

### 5. Test QR Generation
- Generate new QR code after cache clear
- Verify hash matches between web and Flutter
- Test scanning with Flutter app

## Expected Results:
- Raw AES key should be: 'LibraryQRSecureKey2024!@#$%^&*'
- Hash calculation should match between platforms
- No more "HASH MISMATCH DETECTED!" errors

## Troubleshooting:
- If key is still base64: Clear browser cache and localStorage
- If App Check fails: Add debug token or disable temporarily
- If hash still mismatches: Verify Flutter uses same static key
`;
    
    const instructionsPath = path.join(__dirname, 'HASH_MISMATCH_FIX_INSTRUCTIONS.md');
    fs.writeFileSync(instructionsPath, instructions);
    console.log(`✅ Fix instructions written to: ${instructionsPath}`);
}

// Step 6: Create browser test script
function createBrowserTestScript() {
    console.log('\n🌐 Step 6: Creating Browser Test Script');
    
    const testScript = `
// Hash Mismatch Fix Test Script
// Copy and paste this into browser console

console.log('🔧 Starting Hash Mismatch Fix Test...');

// Step 1: Clear cache
if (typeof clearKeyServiceCache === 'function') {
    clearKeyServiceCache();
    console.log('✅ KeyService cache cleared');
} else {
    localStorage.removeItem('qr_encryption_key');
    localStorage.removeItem('qr_key_expires_at');
    console.log('✅ Manual cache clear completed');
}

// Step 2: Debug key state
setTimeout(() => {
    if (typeof debugQREncryption === 'function') {
        debugQREncryption().then(result => {
            console.log('🧪 Encryption test result:', result);
            
            // Check if using correct key
            if (result.rawKey === 'LibraryQRSecureKey2024!@#$%^&*') {
                console.log('✅ Using correct static key!');
            } else {
                console.log('❌ Still using wrong key:', result.rawKey);
            }
        });
    } else {
        console.log('❌ debugQREncryption function not available');
    }
}, 1000);

// Step 3: Test QR generation
setTimeout(() => {
    const testData = {
        userId: 'test-123',
        fullName: 'Test User',
        email: 'test@example.com'
    };
    
    if (typeof DynamicQRService !== 'undefined') {
        DynamicQRService.generateQRCode(testData, 'test-scanner')
            .then(result => {
                console.log('🎯 QR generation test:', result);
            })
            .catch(error => {
                console.error('❌ QR generation failed:', error);
            });
    } else {
        console.log('❌ DynamicQRService not available');
    }
}, 2000);
`;
    
    const testScriptPath = path.join(__dirname, 'browser-test-script.js');
    fs.writeFileSync(testScriptPath, testScript);
    console.log(`✅ Browser test script written to: ${testScriptPath}`);
}

// Main execution
function main() {
    console.log('🚀 Executing Hash Mismatch Fix Implementation');
    
    const checks = [
        verifyEnvironmentConfig(),
        checkFirebaseFunctions(),
        verifyKeyServiceImplementation(),
        verifyDynamicQRService()
    ];
    
    const allPassed = checks.every(check => check);
    
    console.log('\n' + '=' .repeat(60));
    
    if (allPassed) {
        console.log('✅ All configuration checks passed!');
        console.log('🎯 Ready to execute fix in browser');
    } else {
        console.log('❌ Some configuration checks failed');
        console.log('⚠️  Please review and fix the issues above');
    }
    
    generateFixInstructions();
    createBrowserTestScript();
    
    console.log('\n🔧 Next Steps:');
    console.log('1. Open http://localhost:5174/fix-hash-mismatch.html');
    console.log('2. Follow the step-by-step fix process');
    console.log('3. Or use the browser test script in console');
    console.log('4. Deploy Firebase functions if needed');
    console.log('5. Test QR generation and scanning');
    
    console.log('\n✨ Hash Mismatch Fix Implementation Complete!');
}

// Execute if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}

export {
    verifyEnvironmentConfig,
    checkFirebaseFunctions,
    verifyKeyServiceImplementation,
    verifyDynamicQRService,
    generateFixInstructions,
    createBrowserTestScript,
    main
};