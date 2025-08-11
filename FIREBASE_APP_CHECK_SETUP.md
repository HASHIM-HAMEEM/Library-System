# Firebase App Check Setup Guide

This guide explains how to set up Firebase App Check for both web and Android platforms to resolve "App attestation failed" errors.

## Overview

App Check helps protect your Firebase resources from abuse by verifying that requests come from your authentic app. When you see "App attestation failed" errors, it means Firebase doesn't recognize the device/build and you need to configure debug tokens or production attestation.

## Web Platform Setup

### Development (Debug Tokens)

For local development, the web configuration automatically enables debug tokens:

1. **Automatic Debug Token Generation**: The `firebase.ts` configuration automatically sets up debug tokens in development mode
2. **Get Debug Token**: 
   - Run your web app in development mode
   - Open browser developer console
   - Look for the debug token in the console output
   - Copy the token
3. **Register Debug Token**:
   - Go to Firebase Console → Build → App Check → Web app
   - Click "Debug tokens" → "Add token"
   - Paste the token and save

### Production (reCAPTCHA v3)

For production builds:

1. **Get reCAPTCHA v3 Site Key**:
   - Go to Firebase Console → Build → App Check → Web app
   - Enable App Check and choose reCAPTCHA v3
   - Copy the site key
2. **Update Configuration**:
   - Replace the placeholder site key in `src/lib/firebase.ts`
   - Add your production domain to authorized domains in reCAPTCHA settings

## Android Platform Setup

### Development (Debug Tokens)

For Android development builds:

1. **Enable Debug Provider**: In your Flutter `main.dart`, ensure you have:
   ```dart
   await FirebaseAppCheck.instance.activate(
     androidProvider: AndroidProvider.debug,
   );
   ```

2. **Get Debug Token**:
   - Connect your Android device/emulator
   - Run the app
   - Open terminal and run:
     ```bash
     adb logcat -s "FirebaseAppCheck" | grep --line-buffered "Debug token"
     ```
   - Or in Android Studio: Logcat → filter for "Debug token"
   - Look for: `I/FirebaseAppCheck: Debug token: 4F3C1D9E-7B1D-4C7D-93A1-97F1F1C6A8B4`
   - Copy the token

3. **Register Debug Token**:
   - Go to Firebase Console → Build → App Check → Android app
   - Click "Debug tokens" → "Add token"
   - Paste the token and save
   - Hot-restart the app

**Important Notes for Android Debug**:
- A new token is generated per app install
- If you reinstall the app, you need to add the new token
- Keep enforcement ON - debug tokens are only accepted for listed apps

### Production (Play Integrity)

For production Android builds:

1. **Enable Play Integrity**: In your Flutter `main.dart`:
   ```dart
   await FirebaseAppCheck.instance.activate(
     androidProvider: AndroidProvider.playIntegrity,
   );
   ```

2. **Requirements**:
   - APK/AAB must be signed with release keystore
   - SHA-256 fingerprint added in Firebase Project Settings → App Integrity
   - Build installed via Google Play (internal/closed/production track)

## Verification Steps

1. **Run the app again**
2. **Check logs**: Logcat should no longer show "App attestation failed"
3. **Test Firebase Functions**: `getQrEncryptionKey` should return without UNAUTHENTICATED error
4. **Test Firestore**: Reads to `user_profiles/{uid}` should work

## Troubleshooting

### Common Issues

1. **"App attestation failed" persists**:
   - Verify debug token is correctly added to Firebase Console
   - Check that the token matches exactly (no extra spaces)
   - Ensure you're using the correct app (Android vs Web)

2. **Debug token not appearing**:
   - Make sure debug provider is enabled in code
   - Check that the app is running in debug mode
   - Verify device is connected for Android

3. **Production issues**:
   - Verify reCAPTCHA site key is correct for web
   - Check SHA-256 fingerprint is added for Android
   - Ensure production build is properly signed

### Environment Variables

The web configuration automatically detects the environment:
- `NODE_ENV === 'development'`: Uses debug tokens
- `NODE_ENV === 'production'`: Uses reCAPTCHA v3

## Security Notes

- Debug tokens should only be used in development
- Never commit debug tokens to version control
- Always use proper attestation (reCAPTCHA v3/Play Integrity) in production
- Keep your reCAPTCHA secret key secure and never expose it client-side

## Next Steps

After setting up App Check:
1. Test all Firebase Functions calls
2. Verify Firestore security rules work correctly
3. Monitor App Check metrics in Firebase Console
4. Set up alerts for App Check failures in production