import React, { useState, useEffect } from 'react';
import { UserCheck, Calendar, Mail, Phone, CheckCircle, XCircle, Search, Filter, Clock, Trash2, Eye, User } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp, runTransaction, getDoc } from 'firebase/firestore';
import { useLogger } from '../../hooks/useLogger';
import { useAuthStore } from '../../stores/authStore';
import DynamicQRService from '../../lib/dynamicQRService';
import UserProfileModal from '../UserProfileModal';

interface PendingUser {
  id: string;
  name: string;
  email: string;
  phone?: string;
  created_at: any; // Firestore Timestamp or string
  status: 'pending' | 'verified' | 'rejected' | 'deleted';
  subscription_start?: any; // Firestore Timestamp or string
  subscription_end?: any; // Firestore Timestamp or string
  updated_at?: any; // Firestore Timestamp or string
  deleted_at?: any; // Firestore Timestamp or string
  profile_picture_url?: string;
  id_proof_url?: string;
}

interface ApprovalModalProps {
  user: PendingUser | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (userId: string, subscriptionStart: string, subscriptionEnd: string) => void;
}

const ApprovalModal: React.FC<ApprovalModalProps> = ({ user, isOpen, onClose, onApprove }) => {
  const [subscriptionStart, setSubscriptionStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [subscriptionEnd, setSubscriptionEnd] = useState('');
  const { logClick, logAction } = useLogger('ApprovalModal');

  if (!isOpen || !user) return null;

  const handleApprove = () => {
    if (!subscriptionEnd) {
      toast.error('Please select subscription end date');
      return;
    }
    
    logClick('approve_user_confirm', { userId: user.id, subscriptionStart, subscriptionEnd });
    onApprove(user.id, subscriptionStart, subscriptionEnd);
    onClose();
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50">
      <div className="rounded-lg p-6 w-full max-w-md bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
        <h3 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Approve User</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">User Details</label>
            <div className="p-3 rounded bg-white/30 dark:bg-black/30 border border-gray-200 dark:border-gray-700">
              <p className="font-medium text-gray-900 dark:text-white">{user.name}</p>
              <p className="text-sm text-gray-700 dark:text-gray-300">{user.email}</p>
              {user.phone && <p className="text-sm text-gray-700 dark:text-gray-300">{user.phone}</p>}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Subscription Start Date</label>
            <input
                type="date"
                value={subscriptionStart}
                onChange={(e) => setSubscriptionStart(e.target.value)}
                className="w-full px-3 py-2 border rounded bg-white dark:bg-black border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
              />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">Subscription End Date</label>
            <input
                type="date"
                value={subscriptionEnd}
                onChange={(e) => setSubscriptionEnd(e.target.value)}
                min={subscriptionStart}
                className="w-full px-3 py-2 border rounded bg-white dark:bg-black border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
              />
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 rounded hover:opacity-80 transition-opacity bg-white dark:bg-black text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            className="flex-1 px-4 py-2 rounded hover:opacity-80 transition-opacity flex items-center justify-center gap-2 bg-black dark:bg-white text-white dark:text-black"
          >
            <CheckCircle className="w-4 h-4" />
            Approve
          </button>
        </div>
      </div>
    </div>
  );
};

const PendingUsersScreen: React.FC = () => {
  const [pendingUsers, setPendingUsers] = useState<PendingUser[]>([]);
  const [approvedUsers, setApprovedUsers] = useState<PendingUser[]>([]);
  const [deletedUsers, setDeletedUsers] = useState<PendingUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileModalMode, setProfileModalMode] = useState<'view' | 'edit'>('view');
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'deleted'>('pending');
  const { logClick, logAction, logInfo } = useLogger('PendingUsersScreen');
  const { user } = useAuthStore();

  const formatSafeDate = (date: any): string => {
    try {
      return date ? format(new Date(date), 'MMM dd, yyyy') : 'N/A';
    } catch {
      return 'N/A';
    }
  };

  useEffect(() => {
    logInfo('PendingUsersScreen mounted');
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      logAction('fetch_users_started');
      
      const transformUserData = (doc: any) => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : data.created_at,
          updated_at: data.updated_at?.toDate ? data.updated_at.toDate().toISOString() : data.updated_at,
          deleted_at: data.deleted_at?.toDate ? data.deleted_at.toDate().toISOString() : data.deleted_at,
          subscription_start: data.subscription_start?.toDate ? data.subscription_start.toDate().toISOString() : data.subscription_start,
          subscription_end: data.subscription_end?.toDate ? data.subscription_end.toDate().toISOString() : data.subscription_end
        };
      };
      
      // Fetch all user types in parallel for better performance
      const [pendingSnapshot, approvedSnapshot, deletedSnapshot] = await Promise.all([
        getDocs(query(collection(db, 'user_profiles'), where('status', '==', 'pending'))),
        getDocs(query(collection(db, 'user_profiles'), where('status', '==', 'verified'))),
        getDocs(query(collection(db, 'user_profiles'), where('status', '==', 'deleted')))
      ]);

      const pending = pendingSnapshot.docs.map(transformUserData) as PendingUser[];
      const approved = approvedSnapshot.docs.map(transformUserData) as PendingUser[];
      const deleted = deletedSnapshot.docs.map(transformUserData) as PendingUser[];

      setPendingUsers(pending || []);
      setApprovedUsers(approved || []);
      setDeletedUsers(deleted || []);
      
      logAction('fetch_users_completed', { 
        pendingCount: pending?.length || 0, 
        approvedCount: approved?.length || 0, 
        deletedCount: deleted?.length || 0 
      });
    } catch (error: any) {
      console.error('Error in fetchUsers:', error);
      toast.error(`Failed to fetch users: ${error.message || 'Unknown error'}`);
      
      // Set empty arrays on error to prevent UI issues
      setPendingUsers([]);
      setApprovedUsers([]);
      setDeletedUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenProfile = (user: PendingUser, mode: 'view' | 'edit' = 'view') => {
    setSelectedUser(user);
    setProfileModalMode(mode);
    setShowProfileModal(true);
    logClick('open_user_profile', { userId: user.id, mode });
  };

  const handleApproveUser = async (userId: string, subscriptionStart: string, subscriptionEnd: string) => {
    if (!userId || !subscriptionStart || !subscriptionEnd) {
      toast.error('Missing required information for user approval');
      return;
    }

    try {
      logAction('approve_user_started', { userId, subscriptionStart, subscriptionEnd });
      
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'user_profiles', userId);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User profile not found');
        }
        
        const userData = userDoc.data();
        if (userData.status !== 'pending') {
          throw new Error(`User status is ${userData.status}, cannot approve`);
        }
        
        transaction.update(userRef, {
          status: 'verified',
          is_active: true,
          subscription_start: subscriptionStart,
          subscription_end: subscriptionEnd,
          subscription_status: 'active',
          verified_at: Timestamp.now(),
          approved_at: Timestamp.now(),
          approved_by: user?.uid || 'unknown',
          updated_at: Timestamp.now()
        });
      });

      // Generate initial dynamic QR code for approved user
      try {
        const qrResult = await DynamicQRService.generateInitialQRCode(userId);
        if (!qrResult.success) {
          console.error('Failed to generate QR code for approved user:', qrResult.error);
          toast.warning('User approved but QR code generation failed. QR code will be generated automatically.');
        } else {
          console.log('QR code generated for approved user:', userId);
        }
      } catch (qrError) {
        console.error('Error generating QR code for approved user:', qrError);
        toast.warning('User approved but QR code generation failed. QR code will be generated automatically.');
      }

      toast.success('User approved successfully');
      logAction('approve_user_completed', { userId });
      fetchUsers(); // Refresh the list
    } catch (error: any) {
      console.error('Error in handleApproveUser:', error);
      toast.error(error.message || 'Failed to approve user');
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!userId) {
      toast.error('Invalid user ID');
      return;
    }

    try {
      logAction('reject_user_started', { userId });
      
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'user_profiles', userId);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User profile not found');
        }
        
        const userData = userDoc.data();
        if (userData.status !== 'pending') {
          throw new Error(`User status is ${userData.status}, cannot reject`);
        }
        
        transaction.update(userRef, {
          status: 'rejected',
          rejected_at: Timestamp.now(),
          rejected_by: user?.uid || 'unknown',
          updated_at: Timestamp.now()
        });
      });

      toast.success('User rejected successfully');
      logAction('reject_user_completed', { userId });
      fetchUsers(); // Refresh the list
    } catch (error: any) {
      console.error('Error in handleRejectUser:', error);
      toast.error(error.message || 'Failed to reject user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!userId) {
      toast.error('Invalid user ID');
      return;
    }

    if (!user?.uid) {
      toast.error('Authentication required to delete user');
      return;
    }

    try {
      logAction('delete_user_started', { userId });
      
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'user_profiles', userId);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User profile not found');
        }
        
        const userData = userDoc.data();
        if (userData.status === 'deleted') {
          throw new Error('User is already deleted');
        }
        
        // Soft delete - preserve data but mark as deleted
        transaction.update(userRef, {
          status: 'deleted',
          is_active: false,
          deleted_at: Timestamp.now(),
          deleted_by: user.uid,
          updated_at: Timestamp.now(),
          // Preserve original data for audit trail
          original_status: userData.status
        });
      });

      toast.success('User deleted successfully');
      logAction('delete_user_completed', { userId });
      await fetchUsers(); // Refresh the list
    } catch (error: any) {
      console.error('Error in handleDeleteUser:', error);
      logAction('delete_user_failed', { userId, error: error.message });
      toast.error(error.message || 'Failed to delete user');
    }
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!userId) {
      toast.error('Invalid user ID');
      return;
    }

    if (!user?.uid) {
      toast.error('Authentication required to deactivate user');
      return;
    }

    try {
      logAction('deactivate_user_started', { userId });
      
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'user_profiles', userId);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User profile not found');
        }
        
        const userData = userDoc.data();
        if (userData.status === 'deleted') {
          throw new Error('Cannot deactivate deleted user');
        }
        
        transaction.update(userRef, {
          is_active: false,
          deactivated_at: Timestamp.now(),
          deactivated_by: user.uid,
          updated_at: Timestamp.now()
        });
      });

      toast.success('User deactivated successfully');
      logAction('deactivate_user_completed', { userId });
      await fetchUsers(); // Refresh the list
    } catch (error: any) {
      console.error('Error in handleDeactivateUser:', error);
      logAction('deactivate_user_failed', { userId, error: error.message });
      toast.error(error.message || 'Failed to deactivate user');
    }
  };

  const filteredPendingUsers = pendingUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredApprovedUsers = approvedUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredDeletedUsers = deletedUsers.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-900 dark:text-white">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h2>
        <p className="text-gray-700 dark:text-gray-300">Manage pending and approved users</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-700 dark:text-gray-300" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none bg-white dark:bg-black border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 p-1 rounded-lg bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
        <button
          onClick={() => {
            setActiveTab('pending');
            logClick('tab_switch', { tab: 'pending' });
          }}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
             activeTab === 'pending' ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'bg-transparent text-gray-700 dark:text-gray-300'
           }`}
        >
          Pending Users ({filteredPendingUsers.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('approved');
            logClick('tab_switch', { tab: 'approved' });
          }}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
             activeTab === 'approved' ? 'bg-gray-900 text-white dark:bg-white dark:text-black' : 'bg-transparent text-gray-700 dark:text-gray-300'
           }`}
        >
          Approved Users ({filteredApprovedUsers.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('deleted');
            logClick('tab_switch', { tab: 'deleted' });
          }}
          className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${activeTab === 'deleted' ? 'bg-white dark:bg-black text-gray-900 dark:text-white' : 'bg-transparent text-gray-700 dark:text-gray-300'}`}
        >
          Deleted Users ({filteredDeletedUsers.length})
        </button>
      </div>

      {/* Content - Personal Info Section */}
      {activeTab === 'pending' ? (
        <div className="rounded-lg overflow-hidden bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/50">USER DETAILS</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/50">CONTACT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/50">DATE REGISTERED</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/50">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredPendingUsers.map((user) => (
                  <tr key={user.id} className="hover:opacity-80 transition-opacity">
                    <td className="px-6 py-4 whitespace-nowrap border border-gray-200 dark:border-gray-700 bg-white/30 dark:bg-black/30">
                      <div className="flex items-center border border-gray-200 dark:border-gray-700 bg-white/20 dark:bg-black/20 p-2 rounded">
                        <div className="relative">
                          {user.profile_picture_url ? (
                            <img 
                              src={user.profile_picture_url} 
                              alt={user.name}
                              className="w-14 h-14 rounded-full object-cover border-2 shadow-lg"
                              style={{borderColor: '#f59e0b'}}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                if (nextElement) nextElement.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className="w-14 h-14 rounded-full flex items-center justify-center border-2 shadow-lg bg-white dark:bg-black border-gray-200 dark:border-gray-700"
                            style={{
                              display: user.profile_picture_url ? 'none' : 'flex'
                            }}
                          >
                            <User className="w-7 h-7 text-gray-700 dark:text-gray-300" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</div>
                          <div className="text-xs text-gray-700 dark:text-gray-300">ID: {user.id.slice(0, 8)}...</div>
                          <div className="flex items-center gap-2 mt-2">
                            {user.profile_picture_url && (
                              <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-600 text-white">
                                📷 Photo
                              </span>
                            )}
                            {user.id_proof_url && (
                              <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-600 text-white">
                                📄 ID Proof
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border border-gray-200 dark:border-gray-700 bg-white/30 dark:bg-black/30">
                      <div className="border border-gray-200 dark:border-gray-700 bg-white/20 dark:bg-black/20 p-2 rounded">
                        <div className="text-sm text-gray-900 dark:text-white">{user.email}</div>
                        {user.phone && <div className="text-sm text-gray-700 dark:text-gray-300">{user.phone}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border border-gray-200 dark:border-gray-700 bg-white/30 dark:bg-black/30">
                      <div className="flex items-center text-sm text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white/20 dark:bg-black/20 p-2 rounded">
                        <Clock className="w-4 h-4 mr-1 text-gray-700 dark:text-gray-300" />
                        {user.created_at ? format(new Date(user.created_at), 'MMM dd, yyyy') : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium border border-gray-200 dark:border-gray-700 bg-white/30 dark:bg-black/30">
                      <div className="flex gap-2 border border-gray-200 dark:border-gray-700 bg-white/20 dark:bg-black/20 p-2 rounded">
                        <button
                          onClick={() => handleOpenProfile(user, 'view')}
                          className="px-3 py-1 rounded text-xs flex items-center gap-1 hover:opacity-80 transition-opacity bg-white dark:bg-black text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowApprovalModal(true);
                            logClick('approve_user_button', { userId: user.id });
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:opacity-90 transition-all duration-200 font-medium bg-green-600 text-white"
                        >
                          <CheckCircle className="w-3 h-3" />
                          Approve
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to reject this user?')) {
                              handleRejectUser(user.id);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg text-xs flex items-center gap-1 hover:opacity-90 transition-all duration-200 font-medium bg-red-600 text-white"
                        >
                          <XCircle className="w-3 h-3" />
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredPendingUsers.length === 0 && (
              <div className="text-center py-8 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white/20 dark:bg-black/20 rounded">
                No pending users found
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'approved' ? (
        <div className="rounded-lg overflow-hidden bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/50">USER DETAILS</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/50">CONTACT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/50">SUBSCRIPTION</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/50">STATUS</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/50">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredApprovedUsers.map((user) => (
                  <tr key={user.id} className="hover:opacity-80 transition-opacity">
                    <td className="px-6 py-4 whitespace-nowrap border border-gray-200 dark:border-gray-700 bg-white/30 dark:bg-black/30">
                      <div className="flex items-center border border-gray-200 dark:border-gray-700 bg-white/20 dark:bg-black/20 p-2 rounded">
                        <div className="relative">
                          {user.profile_picture_url ? (
                            <img 
                              src={user.profile_picture_url} 
                              alt={user.name}
                              className="w-14 h-14 rounded-full object-cover border-2 shadow-lg border-black dark:border-white"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                if (nextElement) nextElement.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className="w-14 h-14 rounded-full flex items-center justify-center border-2 shadow-lg bg-white dark:bg-black border-gray-200 dark:border-gray-700" 
                            style={{
                              display: user.profile_picture_url ? 'none' : 'flex'
                            }}
                          >
                            <User className="w-7 h-7 text-gray-700 dark:text-gray-300" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold text-gray-900 dark:text-white">{user.name}</div>
                          <div className="text-xs text-gray-700 dark:text-gray-300">ID: {user.id.slice(0, 8)}...</div>
                          <div className="flex items-center gap-2 mt-2">
                            {user.profile_picture_url && (
                              <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-500 text-white">
                                📷 Photo
                              </span>
                            )}
                            {user.id_proof_url && (
                              <span className="text-xs px-2 py-1 rounded-full font-medium bg-blue-500 text-white">
                                📄 ID Proof
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border border-gray-200 dark:border-gray-700 bg-white/30 dark:bg-black/30">
                      <div className="border border-gray-200 dark:border-gray-700 bg-white/20 dark:bg-black/20 p-2 rounded">
                        <div className="text-sm text-gray-900 dark:text-white">{user.email}</div>
                        {user.phone && <div className="text-sm text-gray-700 dark:text-gray-300">{user.phone}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border border-gray-200 dark:border-gray-700 bg-white/30 dark:bg-black/30">
                      <div className="text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 bg-white/20 dark:bg-black/20 p-2 rounded">
                        {formatSafeDate(user.subscription_start)} - {formatSafeDate(user.subscription_end)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border border-gray-200 dark:border-gray-700 bg-white/30 dark:bg-black/30">
                      <div className="border border-gray-200 dark:border-gray-700 bg-white/20 dark:bg-black/20 p-2 rounded">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-green-500 text-white">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Approved
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border border-gray-200 dark:border-gray-700 bg-white/30 dark:bg-black/30">
                      <div className="flex gap-2 border border-gray-200 dark:border-gray-700 bg-white/20 dark:bg-black/20 p-2 rounded">
                        <button
                          onClick={() => handleOpenProfile(user, 'view')}
                          className="px-3 py-1 rounded text-xs flex items-center gap-1 hover:opacity-80 transition-opacity bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-600"
                        >
                          <Eye className="w-3 h-3" />
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredApprovedUsers.length === 0 && (
              <div className="text-center py-8 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white/20 dark:bg-black/20 rounded">
                No approved users found
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden bg-white/50 dark:bg-black/50 border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-transparent">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/50">USER DETAILS</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/50">CONTACT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/50">SUBSCRIPTION</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/50">DELETED DATE</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-black/50">STATUS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredDeletedUsers.map((user) => (
                  <tr key={user.id} className="hover:opacity-80 transition-opacity">
                    <td className="px-6 py-4 whitespace-nowrap border border-gray-200 dark:border-gray-700 bg-white/30 dark:bg-black/30">
                      <div className="flex items-center border border-gray-200 dark:border-gray-700 bg-white/20 dark:bg-black/20 p-2 rounded">
                        <div className="relative">
                          {user.profile_picture_url ? (
                            <img 
                              src={user.profile_picture_url} 
                              alt={user.name}
                              className="w-14 h-14 rounded-full object-cover border-2 opacity-60 shadow-lg"
                              style={{borderColor: '#ef4444'}}
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                                if (nextElement) nextElement.style.display = 'flex';
                              }}
                            />
                          ) : null}
                          <div 
                            className="w-14 h-14 rounded-full flex items-center justify-center border-2 opacity-60 shadow-lg bg-gray-100 dark:bg-gray-700 border-red-500" 
                            style={{
                              display: user.profile_picture_url ? 'none' : 'flex'
                            }}
                          >
                            <Trash2 className="w-7 h-7 text-red-500" />
                          </div>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-semibold opacity-60 text-gray-900 dark:text-white">{user.name}</div>
                          <div className="text-xs opacity-60 text-gray-700 dark:text-gray-300">ID: {user.id.slice(0, 8)}...</div>
                          <div className="flex items-center gap-2 mt-2">
                            {user.profile_picture_url && (
                              <span className="text-xs px-2 py-1 rounded-full font-medium opacity-60 bg-gray-500 text-white">
                                📷 Photo
                              </span>
                            )}
                            {user.id_proof_url && (
                              <span className="text-xs px-2 py-1 rounded-full font-medium opacity-60 bg-gray-500 text-white">
                                📄 ID Proof
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border border-gray-200 dark:border-gray-700 bg-white/30 dark:bg-black/30">
                      <div className="border border-gray-200 dark:border-gray-700 bg-white/20 dark:bg-black/20 p-2 rounded">
                        <div className="text-sm text-gray-900 dark:text-white">{user.email}</div>
                        {user.phone && <div className="text-sm text-gray-700 dark:text-gray-300">{user.phone}</div>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border border-gray-200 dark:border-gray-700 bg-white/30 dark:bg-black/30">
                      <div className="text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 bg-white/20 dark:bg-black/20 p-2 rounded">
                        {formatSafeDate(user.subscription_start)} - {formatSafeDate(user.subscription_end)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border border-gray-200 dark:border-gray-700 bg-white/30 dark:bg-black/30">
                      <div className="text-sm text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 bg-white/20 dark:bg-black/20 p-2 rounded">
                        {formatSafeDate(user.deleted_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap border border-gray-200 dark:border-gray-700 bg-white/30 dark:bg-black/30">
                      <div className="border border-gray-200 dark:border-gray-700 bg-white/20 dark:bg-black/20 p-2 rounded">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold bg-red-500 text-white">
                          <Trash2 className="w-3 h-3 mr-1" />
                          Deleted
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDeletedUsers.length === 0 && (
              <div className="text-center py-8 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700 bg-white/20 dark:bg-black/20 rounded">No deleted users found</div>
            )}
          </div>
        </div>
      )}

      {/* Approval Modal */}
      <ApprovalModal
        user={selectedUser}
        isOpen={showApprovalModal}
        onClose={() => {
          setShowApprovalModal(false);
          setSelectedUser(null);
        }}
        onApprove={handleApproveUser}
      />

      {/* User Profile Modal */}
       <UserProfileModal
         user={selectedUser}
         isOpen={showProfileModal}
         onClose={() => {
           setShowProfileModal(false);
           setSelectedUser(null);
         }}
         mode={profileModalMode}
         onUpdate={() => {
           fetchUsers();
         }}
       />
    </div>
  );
};

export default PendingUsersScreen;