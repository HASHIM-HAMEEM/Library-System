# Firebase App Check Debug Token Fix

## Problem
The Firebase App Check was rejecting 76% of debug tokens, causing `UNAUTHENTICATED` errors when calling Cloud Functions like `getQrEncryptionKey`.

## Root Cause
- Debug tokens were not being properly generated and logged
- No automatic token refresh mechanism when App Check errors occurred
- Missing proper error handling for App Check-related failures
- Insufficient debugging tools to diagnose token issues

## Solution Implemented

### 1. Enhanced App Check Configuration (`src/lib/firebase.ts`)

**Key Changes:**
- ✅ Proper debug token generation with automatic logging
- ✅ Force refresh functionality for expired/invalid tokens
- ✅ Better environment detection (development vs production)
- ✅ Utility functions for token management

**New Features:**
```typescript
// Force refresh App Check token
export const forceRefreshAppCheckToken = async (): Promise<string | null>

// Get App Check token with optional force refresh
export const getAppCheckToken = async (forceRefresh: boolean = false): Promise<string | null>

// Log current App Check status
export const logAppCheckStatus = async (): Promise<void>
```

### 2. Smart KeyService Retry Logic (`src/lib/keyService.ts`)

**Key Changes:**
- ✅ Automatic App Check error detection
- ✅ Retry mechanism with token refresh on App Check failures
- ✅ Enhanced error handling and logging

**How it works:**
1. Detects App Check-related errors (unauthenticated, invalid token, etc.)
2. Automatically refreshes the App Check token
3. Retries the function call with the fresh token
4. Provides detailed logging for debugging

### 3. Comprehensive Debugging Tools (`src/lib/appCheckDebug.ts`)

**Features:**
- ✅ Complete App Check diagnostics
- ✅ Token generation and refresh testing
- ✅ Function call testing with and without token refresh
- ✅ Continuous monitoring capabilities
- ✅ Detailed error reporting and troubleshooting tips

**Available Debug Commands:**
```javascript
// Run comprehensive diagnostics
runAppCheckDiagnostics()

// Start continuous monitoring
startAppCheckMonitoring()
```

### 4. Automatic Debug Initialization (`src/App.tsx`)

**Features:**
- ✅ Auto-runs diagnostics on app startup in development
- ✅ Exposes debug functions globally for easy access
- ✅ Provides helpful console instructions

## How to Use

### 1. Development Setup

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Open browser console** - you'll see:
   ```
   🔧 App Check initialized in DEBUG mode
   📋 Debug token will be generated automatically
   🎯 App Check Debug Token Generated:
   Token: [your-debug-token]
   ⚠️ Copy this token and add it to Firebase Console under App Check > Debug tokens
   ```

3. **Add the debug token to Firebase Console:**
   - Go to Firebase Console > Build > App Check
   - Click on your web app
   - Go to "Debug tokens" tab
   - Click "Add debug token"
   - Paste the token from console
   - Save

### 2. Testing and Debugging

**Run diagnostics manually:**
```javascript
// In browser console
runAppCheckDiagnostics()
```

**Start continuous monitoring:**
```javascript
// In browser console
startAppCheckMonitoring()
```

**Expected diagnostic output:**
```
📊 App Check Diagnostic Results:
================================
1. ✅ Token Generation: Token generated successfully
2. ✅ Token Refresh: Token refreshed successfully
3. ✅ Function Call: Function call successful
4. ✅ Function Call (with refresh): Function call with refresh successful

📈 Summary:
   ✅ Passed: 4
   ❌ Failed: 0
   ⚠️ Warnings: 0
```

### 3. Troubleshooting

If you still see failures:

1. **Check Firebase Console:**
   - Ensure debug token is properly added
   - Verify `getQrEncryptionKey` function is enrolled for App Check
   - Check that your app is in "Allowed apps" list

2. **Wait for propagation:**
   - Changes can take up to 15 minutes to propagate
   - Try refreshing the page after adding debug token

3. **Check Function logs:**
   - Go to Firebase Console > Functions > Logs
   - Look for `appId: 1:572676592022:web:fade189e19a7a3bec1cdb7`
   - This indicates successful token acceptance

4. **Force refresh everything:**
   ```javascript
   // In browser console
   await forceRefreshAppCheckToken()
   runAppCheckDiagnostics()
   ```

## Production Considerations

### 1. Replace reCAPTCHA Key
The current key `6LdYHwAqAAAAABLkf6aiiHvpGHgs7glsFJQRdHWl` is a placeholder.

**To get a real key:**
1. Go to [Google reCAPTCHA Admin Console](https://www.google.com/recaptcha/admin)
2. Create a new site for reCAPTCHA v3
3. Add your domain(s)
4. Copy the site key
5. Replace in `src/lib/firebase.ts`

### 2. Environment Variables
Consider using environment variables for the reCAPTCHA key:

```typescript
const recaptchaKey = process.env.VITE_RECAPTCHA_SITE_KEY || '6LdYHwAqAAAAABLkf6aiiHvpGHgs7glsFJQRdHWl';
```

## Files Modified

1. **`src/lib/firebase.ts`** - Enhanced App Check configuration
2. **`src/lib/keyService.ts`** - Added retry logic with token refresh
3. **`src/lib/appCheckDebug.ts`** - New debugging utilities
4. **`src/App.tsx`** - Added debug initialization

## Expected Results

- ✅ Debug token rejection rate should drop from 76% to near 0%
- ✅ `getQrEncryptionKey` function calls should succeed
- ✅ Automatic recovery from token expiration/invalidation
- ✅ Clear debugging information in development
- ✅ Comprehensive error handling and logging

## Next Steps

1. **Test the fix** by running the app and checking console output
2. **Add debug token** to Firebase Console as instructed
3. **Run diagnostics** to verify everything is working
4. **Replace reCAPTCHA key** for production use
5. **Monitor App Check metrics** in Firebase Console to confirm improvement

The 76% rejection rate should be resolved, and you'll have comprehensive tools to debug any future App Check issues.