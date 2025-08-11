import { create } from 'zustand';
import { User } from 'firebase/auth';
import { 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  updatePassword,
  onAuthStateChanged,
  updateProfile as updateFirebaseProfile
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs,
  addDoc,
  deleteDoc,
  serverTimestamp
} from 'firebase/firestore';
import { auth, db, isAppCheckWorking, logAppCheckStatus } from '../lib/firebase';
import {
  checkLoginRateLimit,
  recordFailedLogin,
  clearFailedLogins,
  validateSession,
  sanitizeInput,
  generateCSRFToken,
  cleanupSecurityData,
  logSecurityEvent,
} from '../utils/securityMiddleware';
import { logger } from '../utils/logger';
import DynamicQRService from '../lib/dynamicQRService';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'student' | 'admin';
  status?: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string;
  profile_picture_url?: string;
  id_proof_url?: string;
  address?: string;
  subscription_status?: 'active' | 'expired' | 'inactive';
  subscription_type?: 'daily' | 'weekly' | 'monthly';
  subscription_start?: string;
  subscription_end?: string;
  verified_at?: string;
  verified_by?: string;
  created_at?: string;
  updated_at?: string;
}

interface AuthState {
  user: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  sessionExpiry: Date | null;
  lastActivity: Date | null;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signUp: (email: string, password: string, userData: Partial<UserProfile>) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  adminLogout: () => Promise<{ error?: string }>;
  logoutFromAllDevices: () => Promise<{ error?: string }>;
  updateProfile: (updates: Partial<UserProfile>) => Promise<{ error?: string }>;
  fetchUserProfile: () => Promise<void>;
  initialize: () => Promise<void>;
  updateLastActivity: () => void;
  checkSessionValidity: () => boolean;
  resetPassword: (email: string) => Promise<{ error?: string }>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<{ error?: string }>;
  getPendingUsers: () => Promise<{ data?: UserProfile[]; error?: string }>;
  verifyUser: (userId: string, action: 'approve' | 'reject', reason?: string) => Promise<{ error?: string }>;
  createAdminAccount: (email: string, name: string, temporaryPassword: string) => Promise<{ error?: string }>;

}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  userProfile: null,
  loading: true,
  sessionExpiry: null,
  lastActivity: null,

  updateLastActivity: () => {
    const now = new Date();
    set({ lastActivity: now });
    localStorage.setItem('lastActivity', now.toISOString());
  },

  checkSessionValidity: () => {
    const { sessionExpiry, lastActivity } = get();
    const now = new Date();
    
    // Check if session has expired
      if (sessionExpiry && now > sessionExpiry) {
        logger.warn('security', 'Session expired');
        get().signOut();
        return false;
      }
      
      // Check for inactivity (30 minutes)
      if (lastActivity) {
        const inactivityLimit = 30 * 60 * 1000; // 30 minutes
        if (now.getTime() - lastActivity.getTime() > inactivityLimit) {
          logger.warn('security', 'Session expired due to inactivity');
          get().signOut();
          return false;
        }
      }
    
    return true;
  },

  resetPassword: async (email: string) => {
    try {
      const sanitizedEmail = sanitizeInput(email);
      await sendPasswordResetEmail(auth, sanitizedEmail);
      
      await logSecurityEvent('password_reset_requested', {
        email: sanitizedEmail,
        timestamp: new Date().toISOString()
      });
      
      return {};
    } catch (error: any) {
      logger.error('security', 'Password reset error', error);
      return { error: error.message || 'Failed to send password reset email' };
    }
  },

  changePassword: async (currentPassword: string, newPassword: string) => {
    try {
      const { user } = get();
      if (!user) {
        return { error: 'No authenticated user' };
      }

      // Re-authenticate user with current password
      await signInWithEmailAndPassword(auth, user.email!, currentPassword);
      
      // Update password
      await updatePassword(user, newPassword);
      
      await logSecurityEvent('password_changed', {
        userId: user.uid,
        timestamp: new Date().toISOString()
      });
      
      return {};
    } catch (error: any) {
      logger.error('security', 'Password change error', error);
      return { error: error.message || 'Failed to change password' };
    }
  },

  initialize: async () => {
    try {
      set({ loading: true });
      
      // Set up auth state listener
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          set({ user });
          await get().fetchUserProfile();
          
          // Set session expiry (24 hours)
          const sessionExpiry = new Date();
          sessionExpiry.setHours(sessionExpiry.getHours() + 24);
          set({ sessionExpiry });
          
          // Restore last activity from localStorage
          const storedActivity = localStorage.getItem('lastActivity');
          if (storedActivity) {
            set({ lastActivity: new Date(storedActivity) });
          } else {
            get().updateLastActivity();
          }
          
          await logSecurityEvent('session_restored', {
            userId: user.uid,
            timestamp: new Date().toISOString()
          });
        } else {
          set({ 
            user: null, 
            userProfile: null, 
            sessionExpiry: null, 
            lastActivity: null 
          });
          localStorage.removeItem('lastActivity');
        }
        set({ loading: false });
      });
      
    } catch (error: any) {
       logger.error('auth', 'Auth initialization error', error);
       set({ loading: false });
     }
  },

  signIn: async (email: string, password: string) => {
    try {
      set({ loading: true });
      
      const sanitizedEmail = sanitizeInput(email);
      const sanitizedPassword = sanitizeInput(password);
      
      // Check App Check status before proceeding
      console.log('🔍 Checking App Check status before login...');
      const appCheckWorking = await isAppCheckWorking();
      console.log('🔍 App Check status:', appCheckWorking ? '✅ Working' : '⚠️ Not working');
      
      if (!appCheckWorking) {
        console.warn('⚠️ App Check not working - proceeding with authentication anyway in development mode');
        await logAppCheckStatus();
      }
      
      // Check rate limiting
      const rateLimitCheck = checkLoginRateLimit(sanitizedEmail);
      if (!rateLimitCheck) {
        return { error: 'Too many login attempts. Please try again later.' };
      }
      
      // Validate session
      const sessionValidation = validateSession();
      if (!sessionValidation) {
        return { error: 'Invalid session. Please refresh the page.' };
      }
      
      console.log('🔐 Attempting Firebase authentication...');
      const userCredential = await signInWithEmailAndPassword(auth, sanitizedEmail, sanitizedPassword);
      const user = userCredential.user;
      console.log('✅ Firebase authentication successful');
      
      // Clear failed login attempts on successful login
      clearFailedLogins(sanitizedEmail);
      
      // Generate CSRF token
      const csrfToken = generateCSRFToken();
      localStorage.setItem('csrfToken', csrfToken);
      
      // Set session expiry
      const sessionExpiry = new Date();
      sessionExpiry.setHours(sessionExpiry.getHours() + 24);
      set({ sessionExpiry });
      
      get().updateLastActivity();
      
      // Set the user immediately and fetch profile
      set({ user });
      
      console.log('📋 Fetching user profile...');
      await get().fetchUserProfile();
      console.log('✅ User profile fetched successfully');
      
      await logSecurityEvent('login_success', {
        userId: user.uid,
        email: sanitizedEmail,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        appCheckWorking
      });
      
      console.log('🎉 Login completed successfully');
      return {};
    } catch (error: any) {
      logger.error('auth', 'Sign in error', error);
      console.error('❌ Login failed:', error);
      
      // Record failed login attempt
      recordFailedLogin(email);
      
      await logSecurityEvent('login_failed', {
        email: sanitizeInput(email),
        error: error.code,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
      });
      
      let errorMessage = 'Login failed';
      if (error.code === 'auth/user-not-found') {
        errorMessage = 'No account found with this email';
      } else if (error.code === 'auth/wrong-password') {
        errorMessage = 'Incorrect password';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      } else if (error.code === 'auth/user-disabled') {
        errorMessage = 'This account has been disabled';
      } else if (error.code === 'auth/network-request-failed') {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (error.message?.includes('App Check')) {
        errorMessage = 'Authentication service temporarily unavailable. Please try again.';
        console.log('💡 This error is related to App Check. The debug token may need to be registered.');
      }
      
      return { error: errorMessage };
    } finally {
      set({ loading: false });
    }
  },

  signUp: async (email: string, password: string, userData: Partial<UserProfile>) => {
    try {
      set({ loading: true });
      
      const sanitizedEmail = sanitizeInput(email);
      const sanitizedPassword = sanitizeInput(password);
      
      const userCredential = await createUserWithEmailAndPassword(auth, sanitizedEmail, sanitizedPassword);
      const user = userCredential.user;
      
      // Update Firebase Auth profile
      await updateFirebaseProfile(user, {
        displayName: userData.name || 'User'
      });
      
      // Create user profile in Firestore
      const userProfile: UserProfile = {
        id: user.uid,
        email: sanitizedEmail,
        name: userData.name || 'User',
        phone: userData.phone,
        role: userData.role || 'student',
        status: 'pending',
        subscription_status: 'inactive',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        ...userData
      };
      
      await setDoc(doc(db, 'user_profiles', user.uid), userProfile);
      
      await logSecurityEvent('user_registered', {
        userId: user.uid,
        email: sanitizedEmail,
        role: userProfile.role,
        timestamp: new Date().toISOString()
      });
      
      return {};
    } catch (error: any) {
      logger.error('auth', 'Sign up error', error);
      
      let errorMessage = 'Registration failed';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'An account with this email already exists';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = 'Password is too weak';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'Invalid email address';
      }
      
      return { error: errorMessage };
    } finally {
      set({ loading: false });
    }
  },

  signOut: async () => {
    try {
      const { user } = get();
      
      if (user) {
        await logSecurityEvent('logout', {
          userId: user.uid,
          timestamp: new Date().toISOString()
        });
      }
      
      await firebaseSignOut(auth);
      
      // Clean up local storage
      localStorage.removeItem('csrfToken');
      localStorage.removeItem('lastActivity');
      cleanupSecurityData();
      
      set({ 
        user: null, 
        userProfile: null, 
        sessionExpiry: null, 
        lastActivity: null 
      });
    } catch (error: any) {
      logger.error('auth', 'Sign out error', error);
    }
  },

  adminLogout: async () => {
    try {
      await get().signOut();
      return {};
    } catch (error: any) {
      logger.error('auth', 'Admin logout error', error);
      return { error: 'Failed to logout' };
    }
  },

  logoutFromAllDevices: async () => {
    try {
      // Firebase doesn't have a direct "logout from all devices" feature
      // This would require custom implementation with token management
      await get().signOut();
      return {};
    } catch (error: any) {
      logger.error('auth', 'Logout from all devices error', error);
      return { error: 'Failed to logout from all devices' };
    }
  },

  fetchUserProfile: async () => {
    try {
      const { user } = get();
      if (!user) return;
      
      const userDoc = await getDoc(doc(db, 'user_profiles', user.uid));
      
      if (userDoc.exists()) {
        const userProfile = userDoc.data() as UserProfile;
        set({ userProfile });
        
        // If user has admin role, ensure they also exist in the users collection
        if (userProfile.role === 'admin') {
          const adminDoc = await getDoc(doc(db, 'users', user.uid));
          if (!adminDoc.exists()) {
            // Create admin entry in users collection
            const adminData = {
              id: user.uid,
              email: user.email || '',
              name: userProfile.name,
              role: 'admin',
              status: 'active',
              permissions: ['read', 'write', 'delete'],
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            };
            
            await setDoc(doc(db, 'users', user.uid), adminData);
            logger.info('database', 'Created admin entry in users collection', { userId: user.uid });
          }
        }
      } else {
        // Create a basic profile if it doesn't exist
        const basicProfile: UserProfile = {
          id: user.uid,
          email: user.email || '',
          name: user.displayName || 'User',
          role: 'student', // Default to student, admin role must be assigned manually
          status: 'pending',
          subscription_status: 'inactive',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        await setDoc(doc(db, 'user_profiles', user.uid), basicProfile);
        set({ userProfile: basicProfile });
      }
    } catch (error: any) {
      logger.error('database', 'Fetch user profile error', error);
    }
  },

  updateProfile: async (updates: Partial<UserProfile>) => {
    try {
      const { user, userProfile } = get();
      if (!user || !userProfile) {
        return { error: 'No authenticated user' };
      }
      
      const updatedProfile = {
        ...updates,
        updated_at: new Date().toISOString()
      };
      
      await updateDoc(doc(db, 'user_profiles', user.uid), updatedProfile);
      
      // Update local state
      set({ 
        userProfile: { 
          ...userProfile, 
          ...updatedProfile 
        } 
      });
      
      return {};
    } catch (error: any) {
      logger.error('database', 'Update profile error', error);
      return { error: 'Failed to update profile' };
    }
  },

  getPendingUsers: async () => {
    try {
      const q = query(
        collection(db, 'user_profiles'),
        where('status', '==', 'pending')
      );
      
      const querySnapshot = await getDocs(q);
      const users: UserProfile[] = [];
      
      querySnapshot.forEach((doc) => {
        users.push(doc.data() as UserProfile);
      });
      
      return { data: users };
    } catch (error: any) {
      logger.error('database', 'Get pending users error', error);
      return { error: 'Failed to fetch pending users' };
    }
  },

  verifyUser: async (userId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      const { user } = get();
      if (!user) {
        return { error: 'No authenticated user' };
      }
      
      const updates: any = {
        status: action === 'approve' ? 'verified' : 'rejected',
        verified_at: new Date().toISOString(),
        verified_by: user.uid,
        updated_at: new Date().toISOString()
      };
      
      if (action === 'approve') {
        updates.is_active = true;
        updates.approved_by = user.uid;
        updates.approved_at = new Date().toISOString();
        
        // Set default subscription if not already set
        if (!updates.subscription_status) {
          updates.subscription_status = 'active';
        }
        if (!updates.subscription_start) {
          updates.subscription_start = new Date().toISOString();
        }
        if (!updates.subscription_end) {
          // Default to 1 year subscription
          const oneYearFromNow = new Date();
          oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);
          updates.subscription_end = oneYearFromNow.toISOString();
        }
      }
      
      if (action === 'reject' && reason) {
        updates.rejection_reason = reason;
      }
      
      // Update user profile
      await updateDoc(doc(db, 'user_profiles', userId), updates);
      
      // Handle QR code generation/deactivation based on action
      if (action === 'approve') {
        try {
          // Generate initial dynamic QR code for approved user
          const qrResult = await DynamicQRService.generateInitialQRCode(userId);
          if (!qrResult.success) {
            logger.error('qr', 'Failed to generate QR code for approved user', { userId, error: qrResult.error });
            // Don't fail the approval process if QR generation fails
          } else {
            logger.info('qr', 'QR code generated for approved user', { userId, qrId: qrResult.qrId });
          }
        } catch (qrError) {
          logger.error('qr', 'Error generating QR code for approved user', { userId, error: qrError });
        }
      } else if (action === 'reject') {
        try {
          // Deactivate QR codes for rejected user
          await DynamicQRService.deactivateUserQRCodes(userId);
          logger.info('qr', 'QR codes deactivated for rejected user', { userId });
        } catch (qrError) {
          logger.error('qr', 'Error deactivating QR codes for rejected user', { userId, error: qrError });
        }
      }
      
      return {};
    } catch (error: any) {
      logger.error('database', 'Verify user error', error);
      return { error: 'Failed to verify user' };
    }
  },

  createAdminAccount: async (email: string, name: string, temporaryPassword: string) => {
    try {
      // Create admin user account directly
      const userCredential = await createUserWithEmailAndPassword(auth, email, temporaryPassword);
      const user = userCredential.user;
      
      // Create admin profile
      const adminProfile: UserProfile = {
        id: user.uid,
        email: email,
        name: name,
        role: 'admin',
        status: 'verified',
        subscription_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      await setDoc(doc(db, 'user_profiles', user.uid), adminProfile);
      
      // Log the admin creation
      logger.info('auth', 'Admin account created', { email, createdBy: get().user?.uid });
      
      return {};
    } catch (error: any) {
      logger.error('database', 'Create admin account error', error);
      return { error: 'Failed to create admin account' };
    }
  },


}));