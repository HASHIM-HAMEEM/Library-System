import { 
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  User
} from 'firebase/auth';
import { 
  doc, 
  setDoc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db } from './firebase';
import { logger } from '../utils/logger';

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'admin';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at: string;
  last_login?: string;
  permissions?: string[];
}

/**
 * Admin Authentication Service
 * Handles all admin-specific authentication operations
 */
export class AdminAuthService {
  
  /**
   * Create a new admin user
   */
  static async createAdmin(
    email: string, 
    password: string, 
    name: string,
    permissions: string[] = ['read', 'write', 'delete']
  ): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
    try {
      logger.info('auth', 'Creating new admin user', { email, name });
      
      // Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Create admin profile in Firestore
      const adminData: AdminUser = {
        id: user.uid,
        email: user.email!,
        name,
        role: 'admin',
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        permissions
      };
      
      // Store in both collections for compatibility
      await setDoc(doc(db, 'users', user.uid), adminData);
      
      // Also create in user_profiles collection for login compatibility
      const userProfileData = {
        id: user.uid,
        email: user.email!,
        name,
        role: 'admin',
        status: 'verified', // Admins should be verified, not pending
        subscription_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'user_profiles', user.uid), userProfileData);
      
      logger.info('auth', 'Admin user created successfully', { userId: user.uid, email });
      
      return { success: true, user: adminData };
    } catch (error: any) {
      logger.error('auth', 'Failed to create admin user', { error: error.message, email });
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Sign in admin user
   */
  static async signInAdmin(
    email: string, 
    password: string
  ): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
    try {
      logger.info('auth', 'Admin sign in attempt', { email });
      
      // Sign in with Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      // Get admin profile from Firestore (check both collections)
      let adminDoc = await getDoc(doc(db, 'users', user.uid));
      let adminData: AdminUser;
      
      if (!adminDoc.exists()) {
        // Try user_profiles collection as fallback
        const userProfileDoc = await getDoc(doc(db, 'user_profiles', user.uid));
        if (!userProfileDoc.exists()) {
          throw new Error('Admin profile not found');
        }
        
        const userProfileData = userProfileDoc.data();
        adminData = {
          id: userProfileData.id,
          email: userProfileData.email,
          name: userProfileData.name,
          role: 'admin',
          status: userProfileData.status === 'verified' ? 'active' : 'inactive',
          created_at: userProfileData.created_at,
          updated_at: userProfileData.updated_at,
          last_login: userProfileData.last_login,
          permissions: ['read', 'write', 'delete'] // Default permissions
        };
      } else {
        adminData = adminDoc.data() as AdminUser;
      }
      
      // Verify user is admin
      if (adminData.role !== 'admin') {
        throw new Error('Access denied: User is not an admin');
      }
      
      // Check if admin is active
      if (adminData.status !== 'active') {
        throw new Error('Admin account is inactive');
      }
      
      // Update last login in both collections
      const lastLoginData = {
        last_login: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Update in users collection if it exists
      if (adminDoc.exists()) {
        await updateDoc(doc(db, 'users', user.uid), lastLoginData);
      }
      
      // Always update in user_profiles collection for consistency
      const userProfileRef = doc(db, 'user_profiles', user.uid);
      const userProfileDoc = await getDoc(userProfileRef);
      if (userProfileDoc.exists()) {
        await updateDoc(userProfileRef, lastLoginData);
      }
      
      logger.info('auth', 'Admin signed in successfully', { userId: user.uid, email });
      
      return { success: true, user: { ...adminData, last_login: new Date().toISOString() } };
    } catch (error: any) {
      logger.error('auth', 'Admin sign in failed', { error: error.message, email });
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Sign out admin user
   */
  static async signOutAdmin(): Promise<{ success: boolean; error?: string }> {
    try {
      await signOut(auth);
      logger.info('auth', 'Admin signed out successfully');
      return { success: true };
    } catch (error: any) {
      logger.error('auth', 'Admin sign out failed', { error: error.message });
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get current admin user
   */
  static async getCurrentAdmin(): Promise<{ success: boolean; user?: AdminUser; error?: string }> {
    try {
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        return { success: false, error: 'No user signed in' };
      }
      
      const adminDoc = await getDoc(doc(db, 'users', currentUser.uid));
      
      if (!adminDoc.exists()) {
        return { success: false, error: 'Admin profile not found' };
      }
      
      const adminData = adminDoc.data() as AdminUser;
      
      if (adminData.role !== 'admin') {
        return { success: false, error: 'User is not an admin' };
      }
      
      return { success: true, user: adminData };
    } catch (error: any) {
      logger.error('auth', 'Failed to get current admin', { error: error.message });
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Update admin profile
   */
  static async updateAdminProfile(
    userId: string, 
    updates: Partial<AdminUser>
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const updateData = {
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      // Remove fields that shouldn't be updated
      delete updateData.id;
      delete updateData.created_at;
      
      await updateDoc(doc(db, 'users', userId), updateData);
      
      logger.info('auth', 'Admin profile updated', { userId, updates: Object.keys(updates) });
      
      return { success: true };
    } catch (error: any) {
      logger.error('auth', 'Failed to update admin profile', { error: error.message, userId });
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Reset admin password
   */
  static async resetAdminPassword(email: string): Promise<{ success: boolean; error?: string }> {
    try {
      await sendPasswordResetEmail(auth, email);
      logger.info('auth', 'Password reset email sent', { email });
      return { success: true };
    } catch (error: any) {
      logger.error('auth', 'Failed to send password reset email', { error: error.message, email });
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Change admin password
   */
  static async changeAdminPassword(
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const currentUser = auth.currentUser;
      
      if (!currentUser) {
        return { success: false, error: 'No user signed in' };
      }
      
      await updatePassword(currentUser, newPassword);
      logger.info('auth', 'Admin password changed successfully', { userId: currentUser.uid });
      
      return { success: true };
    } catch (error: any) {
      logger.error('auth', 'Failed to change admin password', { error: error.message });
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Get all admin users
   */
  static async getAllAdmins(): Promise<{ success: boolean; users?: AdminUser[]; error?: string }> {
    try {
      const admins: AdminUser[] = [];
      const adminIds = new Set<string>();
      
      // Get admins from users collection
      const usersQuery = query(collection(db, 'users'), where('role', '==', 'admin'));
      const usersSnapshot = await getDocs(usersQuery);
      
      usersSnapshot.forEach((doc) => {
        const adminData = doc.data() as AdminUser;
        admins.push(adminData);
        adminIds.add(adminData.id);
      });
      
      // Get admins from user_profiles collection (for those not in users collection)
      const profilesQuery = query(collection(db, 'user_profiles'), where('role', '==', 'admin'));
      const profilesSnapshot = await getDocs(profilesQuery);
      
      profilesSnapshot.forEach((doc) => {
        const profileData = doc.data();
        // Only add if not already in the list
        if (!adminIds.has(profileData.id)) {
          const adminData: AdminUser = {
            id: profileData.id,
            email: profileData.email,
            name: profileData.name,
            role: 'admin',
            status: profileData.status === 'verified' ? 'active' : 'inactive',
            created_at: profileData.created_at,
            updated_at: profileData.updated_at,
            last_login: profileData.last_login,
            permissions: ['read', 'write', 'delete'] // Default permissions
          };
          admins.push(adminData);
        }
      });
      
      logger.info('auth', 'Retrieved all admin users', { count: admins.length });
      
      return { success: true, users: admins };
    } catch (error: any) {
      logger.error('auth', 'Failed to get all admins', { error: error.message });
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Deactivate admin user
   */
  static async deactivateAdmin(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'inactive',
        updated_at: new Date().toISOString()
      });
      
      logger.info('auth', 'Admin user deactivated', { userId });
      
      return { success: true };
    } catch (error: any) {
      logger.error('auth', 'Failed to deactivate admin', { error: error.message, userId });
      return { success: false, error: error.message };
    }
  }
  
  /**
   * Activate admin user
   */
  static async activateAdmin(userId: string): Promise<{ success: boolean; error?: string }> {
    try {
      await updateDoc(doc(db, 'users', userId), {
        status: 'active',
        updated_at: new Date().toISOString()
      });
      
      logger.info('auth', 'Admin user activated', { userId });
      
      return { success: true };
    } catch (error: any) {
      logger.error('auth', 'Failed to activate admin', { error: error.message, userId });
      return { success: false, error: error.message };
    }
  }
}

// Export default instance
export default AdminAuthService;