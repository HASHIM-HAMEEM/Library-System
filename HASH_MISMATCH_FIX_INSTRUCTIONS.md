
# Hash Mismatch Fix Instructions

## Immediate Actions Required:

### 1. Clear KeyService Cache
```javascript
// In browser console:
clearKeyServiceCache();
```

### 2. Debug Current Key State
```javascript
// In browser console:
debugQREncryption();
```

### 3. Fix App Check 403 Errors
- Go to Firebase Console → App Check
- Add debug token from browser console
- Or temporarily disable App Check enforcement

### 4. Deploy Firebase Functions
```bash
cd functions
npm run deploy
```

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
