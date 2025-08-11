# Admin User Setup Instructions

Since you want to add an admin user directly to the database without using a signup screen, follow these steps to manually create the admin user through Firebase Console:

## Step 1: Create User in Firebase Authentication

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `iqralibrary2025`
3. Navigate to **Authentication** > **Users**
4. Click **Add user**
5. Enter the following details:
   - **Email**: `scnz141@gmail.com`
   - **Password**: `Wehere`
6. Click **Add user**

## Step 2: Add User Profile in Firestore

1. In the same Firebase Console, navigate to **Firestore Database**
2. Go to the `users` collection
3. Click **Add document**
4. Set the **Document ID** to the User UID from step 1 (copy it from Authentication > Users)
5. Add the following fields:

```json
{
  "id": "[USER_UID_FROM_STEP_1]",
  "email": "scnz141@gmail.com",
  "name": "System Administrator",
  "role": "admin",
  "status": "active",
  "permissions": ["read", "write", "delete", "manage_users", "manage_settings"],
  "createdAt": "2025-01-01T18:00:00.000Z",
  "updatedAt": "2025-01-01T18:00:00.000Z"
}
```

## Step 3: Test Login

1. Go to your application: `http://localhost:5174/admin/login`
2. Login with:
   - **Email**: `scnz141@gmail.com`
   - **Password**: `Wehere`

## Notes

- The `permissions` field is an array of strings
- Make sure the `role` field is set to `"admin"`
- The `status` should be `"active"`
- Replace `[USER_UID_FROM_STEP_1]` with the actual UID from Firebase Authentication

After completing these steps, you should be able to login to the admin dashboard with the specified credentials.