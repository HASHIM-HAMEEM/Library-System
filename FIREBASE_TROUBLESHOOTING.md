# Firebase Authentication Troubleshooting

## Current Issue
The application is showing `Firebase: Error (auth/configuration-not-found)` when trying to authenticate users.

## Root Cause
This error typically occurs when:
1. Firebase Authentication is not enabled in the Firebase Console
2. The Firebase project configuration is incorrect
3. The API key doesn't have the necessary permissions

## Solution Steps

### Step 1: Enable Firebase Authentication
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `iqralibrary2025`
3. Navigate to **Authentication** in the left sidebar
4. Click on **Get Started** if Authentication is not enabled
5. Go to the **Sign-in method** tab
6. Enable **Email/Password** authentication:
   - Click on "Email/Password"
   - Toggle "Enable" to ON
   - Click "Save"

### Step 2: Verify Project Configuration
Ensure your Firebase project settings match the configuration in `src/lib/firebase.ts`:
- Project ID: `iqralibrary2025`
- API Key: `AIzaSyDhZEmFLE7K50uKX1a0dDOuQy2iSmbxbVQ`
- Auth Domain: `iqralibrary2025.firebaseapp.com`

### Step 3: Create Admin User Manually
Once Authentication is enabled:

1. **Create User in Firebase Authentication:**
   - Go to Firebase Console > Authentication > Users
   - Click "Add user"
   - Email: `scnz141@gmail.com`
   - Password: `Wehere`
   - Click "Add user"

2. **Add User Profile in Firestore:**
   - Go to Firebase Console > Firestore Database
   - Navigate to the `users` collection (create if it doesn't exist)
   - Add a new document with the User UID as the document ID
   - Add these fields:
     ```
     email: "scnz141@gmail.com"
     name: "Admin User"
     role: "admin"
     status: "verified"
     created_at: [current timestamp]
     ```

### Step 4: Test Login
After completing the above steps:
1. Restart your development server: `npm run dev`
2. Navigate to `http://localhost:5174/login`
3. Try logging in with:
   - Email: `scnz141@gmail.com`
   - Password: `Wehere`

## Additional Notes
- The Google Analytics error (`net::ERR_ABORTED`) is unrelated to authentication and can be ignored
- Make sure your Firebase project has the Firestore Database enabled
- Verify that your API key has the necessary permissions for Authentication and Firestore

## If Issues Persist
1. Check the Firebase Console for any billing or quota issues
2. Verify that the Firebase project is active and not suspended
3. Try creating a new API key in the Firebase Console