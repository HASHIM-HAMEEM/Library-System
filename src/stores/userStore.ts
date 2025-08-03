import { create } from 'zustand';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  doc, 
  getDoc, 
  updateDoc, 
  deleteDoc, 
  where,
  getDocs,
  addDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { toast } from 'sonner';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  address?: string;
  role: 'student' | 'faculty' | 'staff' | 'admin';
  status: 'pending' | 'verified' | 'suspended' | 'rejected';
  subscription_status: 'active' | 'expired' | 'cancelled';
  subscription_start?: string;
  subscription_end?: string;
  profile_picture_url?: string;
  id_proof_url?: string;
  created_at: string;
  updated_at: string;
  last_login?: string;
  qr_data?: string;
  qr_code_url?: string;
  rejection_reason?: string;
  institution_id?: string;
}

interface UserState {
  users: UserProfile[];
  pendingUsers: UserProfile[];
  selectedUser: UserProfile | null;
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchUsers: (limitCount?: number) => () => void;
  fetchPendingUsers: () => () => void;
  verifyUser: (userId: string, status: 'verified' | 'rejected', rejectionReason?: string) => Promise<void>;
  updateUserSubscription: (userId: string, subscriptionData: {
    subscription_status: 'active' | 'expired' | 'cancelled';
    subscription_start?: string;
    subscription_end?: string;
  }) => Promise<void>;
  suspendUser: (userId: string, reason?: string) => Promise<void>;
  reactivateUser: (userId: string) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  searchUsers: (searchTerm: string, filters?: {
    role?: string;
    status?: string;
    subscription_status?: string;
  }) => Promise<UserProfile[]>;
  getUserById: (userId: string) => Promise<UserProfile | null>;
  updateUserProfile: (userId: string, updates: Partial<UserProfile>) => Promise<void>;
  setSelectedUser: (user: UserProfile | null) => void;
  clearUsers: () => void;
}

export const useUserStore = create<UserState>((set, get) => ({
  users: [],
  pendingUsers: [],
  selectedUser: null,
  loading: false,
  error: null,

  fetchUsers: (limitCount = 100) => {
    set({ loading: true, error: null });
    
    const usersQuery = query(
      collection(db, 'user_profiles'),
      orderBy('created_at', 'desc'),
      limit(limitCount)
    );

    const unsubscribe = onSnapshot(usersQuery,
      (snapshot) => {
        const users = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UserProfile[];
        
        set({ users, loading: false });
      },
      (error) => {
        console.error('Error fetching users:', error);
        set({ error: error.message, loading: false });
        toast.error('Failed to fetch users');
      }
    );

    return unsubscribe;
  },

  fetchPendingUsers: () => {
    set({ loading: true, error: null });
    
    const pendingQuery = query(
      collection(db, 'user_profiles'),
      where('status', '==', 'pending'),
      orderBy('created_at', 'desc')
    );

    const unsubscribe = onSnapshot(pendingQuery,
      (snapshot) => {
        const pendingUsers = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as UserProfile[];
        
        // Filter out admin users from pending list
        const filteredPendingUsers = pendingUsers.filter(user => user.role !== 'admin');
        
        set({ pendingUsers: filteredPendingUsers, loading: false });
      },
      (error) => {
        console.error('Error fetching pending users:', error);
        set({ error: error.message, loading: false });
        toast.error('Failed to fetch pending users');
      }
    );

    return unsubscribe;
  },

  verifyUser: async (userId: string, status: 'verified' | 'rejected', rejectionReason?: string) => {
    try {
      const updateData: any = {
        status,
        updated_at: new Date().toISOString(),
      };

      if (status === 'rejected' && rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      if (status === 'verified') {
        // Set default subscription when verifying
        updateData.subscription_status = 'active';
        updateData.subscription_start = new Date().toISOString();
        updateData.is_active = true;
        
        // Set subscription end to 1 year from now
        const subscriptionEnd = new Date();
        subscriptionEnd.setFullYear(subscriptionEnd.getFullYear() + 1);
        updateData.subscription_end = subscriptionEnd.toISOString();
      }

      await updateDoc(doc(db, 'user_profiles', userId), updateData);
      
      toast.success(`User ${status} successfully`);
    } catch (error: any) {
      console.error('Error verifying user:', error);
      toast.error('Failed to update user status');
      throw error;
    }
  },

  updateUserSubscription: async (userId: string, subscriptionData) => {
    try {
      await updateDoc(doc(db, 'user_profiles', userId), {
        ...subscriptionData,
        updated_at: new Date().toISOString(),
      });
      
      toast.success('Subscription updated successfully');
    } catch (error: any) {
      console.error('Error updating subscription:', error);
      toast.error('Failed to update subscription');
      throw error;
    }
  },

  suspendUser: async (userId: string, reason?: string) => {
    try {
      const updateData: any = {
        status: 'suspended',
        updated_at: new Date().toISOString(),
      };

      if (reason) {
        updateData.suspension_reason = reason;
      }

      await updateDoc(doc(db, 'user_profiles', userId), updateData);
      
      toast.success('User suspended successfully');
    } catch (error: any) {
      console.error('Error suspending user:', error);
      toast.error('Failed to suspend user');
      throw error;
    }
  },

  reactivateUser: async (userId: string) => {
    try {
      await updateDoc(doc(db, 'user_profiles', userId), {
        status: 'verified',
        updated_at: new Date().toISOString(),
        suspension_reason: null,
      });
      
      toast.success('User reactivated successfully');
    } catch (error: any) {
      console.error('Error reactivating user:', error);
      toast.error('Failed to reactivate user');
      throw error;
    }
  },

  deleteUser: async (userId: string) => {
    try {
      await deleteDoc(doc(db, 'user_profiles', userId));
      
      toast.success('User deleted successfully');
    } catch (error: any) {
      console.error('Error deleting user:', error);
      toast.error('Failed to delete user');
      throw error;
    }
  },

  searchUsers: async (searchTerm: string, filters = {}) => {
    try {
      let usersQuery = query(collection(db, 'user_profiles'));
      
      // Apply filters
      if (filters.role) {
        usersQuery = query(usersQuery, where('role', '==', filters.role));
      }
      if (filters.status) {
        usersQuery = query(usersQuery, where('status', '==', filters.status));
      }
      if (filters.subscription_status) {
        usersQuery = query(usersQuery, where('subscription_status', '==', filters.subscription_status));
      }

      const snapshot = await getDocs(usersQuery);
      let users = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as UserProfile[];

      // Client-side search filtering
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        users = users.filter(user => 
          user.name.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          (user.phone && user.phone.includes(term))
        );
      }

      return users;
    } catch (error: any) {
      console.error('Error searching users:', error);
      toast.error('Failed to search users');
      return [];
    }
  },

  getUserById: async (userId: string) => {
    try {
      const userDoc = await getDoc(doc(db, 'user_profiles', userId));
      
      if (userDoc.exists()) {
        return {
          id: userDoc.id,
          ...userDoc.data()
        } as UserProfile;
      }
      
      return null;
    } catch (error: any) {
      console.error('Error fetching user:', error);
      toast.error('Failed to fetch user');
      return null;
    }
  },

  updateUserProfile: async (userId: string, updates: Partial<UserProfile>) => {
    try {
      await updateDoc(doc(db, 'user_profiles', userId), {
        ...updates,
        updated_at: new Date().toISOString(),
      });
      
      toast.success('User profile updated successfully');
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      toast.error('Failed to update user profile');
      throw error;
    }
  },

  setSelectedUser: (user: UserProfile | null) => {
    set({ selectedUser: user });
  },

  clearUsers: () => {
    set({
      users: [],
      pendingUsers: [],
      selectedUser: null,
      error: null
    });
  },
}));