import React, { useState, useEffect } from 'react';
import { UserCheck, Calendar, Mail, Phone, CheckCircle, XCircle, Search, Filter, Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { db } from '../../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { useLogger } from '../../hooks/useLogger';
import { useAuthStore } from '../../stores/authStore';

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
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{backgroundColor: 'rgba(0, 0, 0, 0.5)'}}>
      <div className="rounded-lg p-6 w-full max-w-md" style={{backgroundColor: 'var(--bg-tertiary)'}}>
        <h3 className="text-xl font-bold mb-4" style={{color: 'var(--text-primary)'}}>Approve User</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>User Details</label>
            <div className="p-3 rounded" style={{backgroundColor: 'var(--bg-secondary)'}}>
              <p className="font-medium" style={{color: 'var(--text-primary)'}}>{user.name}</p>
              <p className="text-sm" style={{color: 'var(--text-secondary)'}}>{user.email}</p>
              {user.phone && <p className="text-sm" style={{color: 'var(--text-secondary)'}}>{user.phone}</p>}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>Subscription Start Date</label>
            <input
                type="date"
                value={subscriptionStart}
                onChange={(e) => setSubscriptionStart(e.target.value)}
                className="w-full px-3 py-2 border rounded"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1" style={{color: 'var(--text-secondary)'}}>Subscription End Date</label>
            <input
                type="date"
                value={subscriptionEnd}
                onChange={(e) => setSubscriptionEnd(e.target.value)}
                min={subscriptionStart}
                className="w-full px-3 py-2 border rounded"
                style={{
                  backgroundColor: 'var(--bg-tertiary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--text-primary)'
                }}
              />
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            style={{backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)'}}
            className="flex-1 px-4 py-2 text-white rounded hover:opacity-80 transition-opacity"
          >
            Cancel
          </button>
          <button
            onClick={handleApprove}
            style={{backgroundColor: 'var(--accent-color)', color: 'var(--text-primary)'}}
            className="flex-1 px-4 py-2 text-white rounded hover:opacity-80 transition-opacity flex items-center justify-center gap-2"
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
      
      // Fetch pending users
      const pendingQuery = query(
        collection(db, 'user_profiles'),
        where('status', '==', 'pending')
      );
      const pendingSnapshot = await getDocs(pendingQuery);
      const pending = pendingSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : data.created_at,
          updated_at: data.updated_at?.toDate ? data.updated_at.toDate().toISOString() : data.updated_at
        };
      }) as PendingUser[];

      // Fetch approved users
      const approvedQuery = query(
        collection(db, 'user_profiles'),
        where('status', '==', 'verified')
      );
      const approvedSnapshot = await getDocs(approvedQuery);
      const approved = approvedSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id,
          ...data,
          created_at: data.created_at?.toDate ? data.created_at.toDate().toISOString() : data.created_at,
          updated_at: data.updated_at?.toDate ? data.updated_at.toDate().toISOString() : data.updated_at,
          subscription_start: data.subscription_start?.toDate ? data.subscription_start.toDate().toISOString() : data.subscription_start,
          subscription_end: data.subscription_end?.toDate ? data.subscription_end.toDate().toISOString() : data.subscription_end
        };
      }) as PendingUser[];

      // Fetch deleted users
      const deletedQuery = query(
        collection(db, 'user_profiles'),
        where('status', '==', 'deleted')
      );
      const deletedSnapshot = await getDocs(deletedQuery);
      const deleted = deletedSnapshot.docs.map(doc => {
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
      }) as PendingUser[];

      setPendingUsers(pending || []);
      setApprovedUsers(approved || []);
      setDeletedUsers(deleted || []);
      logAction('fetch_users_completed', { pendingCount: pending?.length, approvedCount: approved?.length, deletedCount: deleted?.length });
    } catch (error) {
      console.error('Error in fetchUsers:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId: string, subscriptionStart: string, subscriptionEnd: string) => {
    try {
      logAction('approve_user_started', { userId, subscriptionStart, subscriptionEnd });
      
      const userRef = doc(db, 'user_profiles', userId);
      await updateDoc(userRef, {
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

      toast.success('User approved successfully');
      logAction('approve_user_completed', { userId });
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error in handleApproveUser:', error);
      toast.error('Failed to approve user');
    }
  };

  const handleRejectUser = async (userId: string) => {
    try {
      logAction('reject_user_started', { userId });
      
      const userRef = doc(db, 'user_profiles', userId);
      await updateDoc(userRef, {
        status: 'rejected',
        updated_at: Timestamp.now()
      });

      toast.success('User rejected and removed');
      logAction('reject_user_completed', { userId });
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error in handleRejectUser:', error);
      toast.error('Failed to reject user');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    try {
      logAction('delete_user_started', { userId });
      
      const userRef = doc(db, 'user_profiles', userId);
      await updateDoc(userRef, {
        status: 'deleted',
        deleted_at: Timestamp.now(),
        updated_at: Timestamp.now()
      });

      toast.success('User deleted successfully');
      logAction('delete_user_completed', { userId });
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error in handleDeleteUser:', error);
      toast.error('Failed to delete user');
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
        <div style={{color: 'var(--text-primary)'}}>Loading users...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold" style={{color: 'var(--text-primary)'}}>User Management</h2>
        <p style={{color: 'var(--text-secondary)'}}>Manage pending and approved users</p>
        </div>
        <div className="flex gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4" style={{color: 'var(--text-secondary)'}} />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border rounded-lg focus:outline-none"
              style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)',
                color: 'var(--text-primary)'
              }}
            />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex space-x-1 p-1 rounded-lg" style={{backgroundColor: 'var(--bg-tertiary)'}}>
        <button
          onClick={() => {
            setActiveTab('pending');
            logClick('tab_switch', { tab: 'pending' });
          }}
          className="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors"
          style={{
            backgroundColor: activeTab === 'pending' ? 'var(--bg-secondary)' : 'transparent',
            color: activeTab === 'pending' ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}
        >
          Pending Users ({filteredPendingUsers.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('approved');
            logClick('tab_switch', { tab: 'approved' });
          }}
          className="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors"
          style={{
            backgroundColor: activeTab === 'approved' ? 'var(--bg-secondary)' : 'transparent',
            color: activeTab === 'approved' ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}
        >
          Approved Users ({filteredApprovedUsers.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('deleted');
            logClick('tab_switch', { tab: 'deleted' });
          }}
          className="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors"
          style={{
            backgroundColor: activeTab === 'deleted' ? 'var(--bg-secondary)' : 'transparent',
            color: activeTab === 'deleted' ? 'var(--text-primary)' : 'var(--text-secondary)'
          }}
        >
          Deleted Users ({filteredDeletedUsers.length})
        </button>
      </div>

      {/* Content */}
      {activeTab === 'pending' ? (
        <div className="rounded-lg overflow-hidden" style={{backgroundColor: 'var(--bg-secondary)'}}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{backgroundColor: 'var(--bg-tertiary)'}}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>USER DETAILS</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>CONTACT</th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                    Date Registered
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody style={{borderColor: 'var(--border-color)'}} className="divide-y">
                {filteredPendingUsers.map((user) => (
                  <tr key={user.id} className="hover:opacity-80 transition-opacity">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                          <UserCheck className="w-5 h-5" style={{color: 'var(--text-secondary)'}} />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>{user.name}</div>
                          <div className="text-sm" style={{color: 'var(--text-secondary)'}}>ID: {user.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm" style={{color: 'var(--text-primary)'}}>{user.email}</div>
                      {user.phone && <div className="text-sm" style={{color: 'var(--text-secondary)'}}>{user.phone}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm" style={{color: 'var(--text-secondary)'}}>
                        <Clock className="w-4 h-4 mr-1" style={{color: 'var(--text-secondary)'}} />
                        {user.created_at ? format(new Date(user.created_at), 'MMM dd, yyyy') : 'N/A'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setSelectedUser(user);
                            setShowApprovalModal(true);
                            logClick('approve_user_button', { userId: user.id });
                          }}
                          className="px-3 py-1 rounded text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
                          style={{backgroundColor: 'var(--accent-color)', color: 'var(--text-primary)'}}
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
                          className="px-3 py-1 rounded text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
                          style={{backgroundColor: 'var(--error-color)', color: 'var(--text-primary)'}}
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
              <div className="text-center py-8" style={{color: 'var(--text-secondary)'}}>
                No pending users found
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'approved' ? (
        <div className="rounded-lg overflow-hidden" style={{backgroundColor: 'var(--bg-secondary)'}}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{backgroundColor: 'var(--bg-secondary)'}}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                    User Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                    Subscription
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{borderColor: 'var(--border-color)'}}>
                {filteredApprovedUsers.map((user) => (
                  <tr key={user.id} className="hover:opacity-80 transition-opacity">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{backgroundColor: 'var(--accent-color)'}}>
                          <CheckCircle className="w-5 h-5" style={{color: 'var(--bg-primary)'}} />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>{user.name}</div>
                    <div className="text-sm" style={{color: 'var(--text-secondary)'}}>ID: {user.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm" style={{color: 'var(--text-primary)'}}>{user.email}</div>
                      {user.phone && <div className="text-sm" style={{color: 'var(--text-secondary)'}}>{user.phone}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm" style={{color: 'var(--text-primary)'}}>
                        {formatSafeDate(user.subscription_start)} - {formatSafeDate(user.subscription_end)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium" style={{backgroundColor: 'var(--accent-color)', color: 'var(--bg-primary)'}}>
                        Approved
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this user? This action will move them to the deleted users section.')) {
                            handleDeleteUser(user.id);
                          }
                        }}
                        className="px-3 py-1 rounded text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
                        style={{backgroundColor: 'var(--accent-color)', color: 'var(--bg-primary)'}}
                      >
                        <Trash2 className="w-3 h-3" />
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredApprovedUsers.length === 0 && (
              <div className="text-center py-8" style={{color: 'var(--text-secondary)'}}>
                No approved users found
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-lg overflow-hidden" style={{backgroundColor: 'var(--bg-secondary)'}}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{backgroundColor: 'var(--bg-secondary)'}}>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                    User Details
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                    Subscription
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                    Deleted Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider" style={{color: 'var(--text-secondary)'}}>
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{borderColor: 'var(--border-color)'}}>
                {filteredDeletedUsers.map((user) => (
                  <tr key={user.id} className="hover:opacity-80 transition-opacity">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{backgroundColor: 'var(--accent-color)'}}>
                          <Trash2 className="w-5 h-5" style={{color: 'var(--bg-primary)'}} />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium" style={{color: 'var(--text-primary)'}}>{user.name}</div>
                    <div className="text-sm" style={{color: 'var(--text-secondary)'}}>ID: {user.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm" style={{color: 'var(--text-primary)'}}>{user.email}</div>
                      {user.phone && <div className="text-sm" style={{color: 'var(--text-secondary)'}}>{user.phone}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm" style={{color: 'var(--text-primary)'}}>
                        {formatSafeDate(user.subscription_start)} - {formatSafeDate(user.subscription_end)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm" style={{color: 'var(--text-primary)'}}>
                        {formatSafeDate(user.deleted_at)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        Deleted
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filteredDeletedUsers.length === 0 && (
              <div className="text-center py-8" style={{color: 'var(--text-secondary)'}}>
                No deleted users found
              </div>
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
    </div>
  );
};

export default PendingUsersScreen;