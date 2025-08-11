# QR Code Debugging Guide

## Enhanced Firestore Debugging (Latest Update)

The `validateDynamicQR` function now includes comprehensive debugging to identify why QR codes might be showing as "Inactive or unknown". When a QR code scan fails, you'll see detailed logs in the browser console:

### Debug Information Logged:
1. **Initial Search**: Shows the qrId being searched and query parameters
2. **Query Results**: Number of active documents found
3. **Inactive Check**: Searches for deactivated versions of the same qrId
4. **Any QR Check**: Shows ALL documents with the qrId (regardless of status)
5. **Collection Access**: Verifies the app can read the qr_codes collection

### New Error Messages:
- `"QR code has been deactivated (newer QR code generated)"` - The QR exists but was deactivated
- `"QR code not found in database (may not have been generated properly)"` - No QR with this qrId exists
- `"QR code exists but is not active"` - QR exists but has an unexpected status

### How to Use:
1. Open browser console before scanning
2. Scan the QR code
3. Look for `[QR Debug]` messages to see exactly what's happening
4. Check the Firebase console qr_codes collection to verify the data

---

## Overview
This guide helps debug QR code verification failures between the Flutter app and web application.

## Enhanced Debugging Features Added

### 1. Detailed Hash Verification Logging
When QR validation fails, the web app now logs:
- Encrypted data and its length
- Provided hash from Flutter
- AES key and its length
- Hash input (encrypted data + AES key)
- Calculated hash by web app
- Detailed comparison results

### 2. Debug Encryption Values Function
A new method `debugEncryptionValues()` outputs exact values for Flutter comparison:
- Test payload: `{"test":123}`
- AES key processing steps
- Encrypted data
- Hash generation process
- Expected Flutter output values

### 3. Global Debug Function
You can manually trigger debugging from browser console:
```javascript
debugQREncryption()
```

## How to Debug QR Mismatch

### Step 1: Check Browser Console
1. Open browser developer tools (F12)
2. Go to Console tab
3. Try scanning a QR code
4. Look for detailed debug output

### Step 2: Compare Values with Flutter
1. Run `debugQREncryption()` in browser console
2. Copy the output values
3. In Flutter, implement the same test:

```dart
final testPayload = '{"test":123}';
final encrypted = _encryptData(testPayload);
final hash = _generateHash(encrypted);
print('Flutter encrypted: $encrypted');
print('Flutter hash: $hash');
```

### Step 3: Verify Implementation Details

#### AES Key Processing
- **Web**: `AES_KEY.padEnd(32, '0').slice(0, 32)`
- **Flutter**: Should use same 32-byte key processing

#### Encryption Parameters
- **Algorithm**: AES-256-CBC
- **IV**: 16 zero bytes
- **Padding**: PKCS#7
- **Key**: 32 bytes from `AES_KEY`

#### Hash Generation
- **Formula**: `SHA256(encryptedData + AES_KEY)`
- **Input**: Concatenate encrypted data + original AES key
- **Output**: SHA-256 hash as hex string

## Common Issues and Solutions

### 1. Key Mismatch
**Symptoms**: Different encrypted data or hash
**Solution**: Ensure exact same AES_KEY in both apps

### 2. Encoding Issues
**Symptoms**: "Malformed UTF-8" errors
**Solution**: Check character encoding in Flutter

### 3. Base64 Handling
**Symptoms**: Hash mismatch with correct encryption
**Solution**: Verify base64 encoding/decoding consistency

### 4. JSON Structure
**Symptoms**: Parse errors or unexpected data
**Solution**: Ensure identical JSON structure and key ordering

## Expected Debug Output

When working correctly, you should see:
```
=== QR ENCRYPTION DEBUG VALUES ===
1. Test payload: {"test":123}
2. AES_KEY: Gfc52gFfkLpO8U8RDM+kaTDGce5RpCIW
3. AES_KEY length: 32
4. Processed key (padded/trimmed to 32): Gfc52gFfkLpO8U8RDM+kaTDGce5RpCIW
5. Processed key length: 32
6. Encrypted data: [base64 string]
7. Encrypted data length: [number]
8. Hash input (encrypted + AES_KEY): [concatenated string]
9. Hash input length: [number]
10. Generated hash: [64-character hex string]
11. Generated hash length: 64
12. Decrypted data: {"test":123}
13. Decryption matches original: true
=== FLUTTER SHOULD GENERATE THESE EXACT VALUES ===
Flutter encrypted data should be: [same base64 string]
Flutter hash should be: [same 64-character hex string]
=== END DEBUG VALUES ===
```

## Next Steps

1. **If values match**: Issue is in QR payload structure or timing
2. **If encrypted data differs**: Check AES implementation details
3. **If hash differs**: Verify hash input concatenation
4. **If decryption fails**: Check key processing and IV

## Contact
If issues persist after following this guide, provide:
1. Browser console output from failed scan
2. Flutter debug output from same test payload
3. Exact error messages from both sides