
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
