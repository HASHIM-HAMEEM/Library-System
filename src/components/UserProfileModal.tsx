import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, Calendar, Camera, FileText, Save, Edit3, Trash2, CheckCircle, XCircle, ArrowLeft, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { db } from '../lib/firebase';
import { doc, updateDoc, deleteDoc, Timestamp, runTransaction } from 'firebase/firestore';
import { useLogger } from '../hooks/useLogger';
import { useAuthStore } from '../stores/authStore';

interface UserProfile {
  id: string;
  name: string;
  email: string;
  phone?: string;
  created_at: any;
  status: 'pending' | 'verified' | 'rejected' | 'deleted';
  subscription_start?: any;
  subscription_end?: any;
  updated_at?: any;
  deleted_at?: any;
  profile_picture_url?: string;
  id_proof_url?: string;
  role?: string;
  is_active?: boolean;
  subscription_status?: string;
  verified_at?: any;
  approved_at?: any;
  approved_by?: string;
  rejection_reason?: string;
  notes?: string;
}

interface UserProfileModalProps {
  user: UserProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
  mode: 'view' | 'edit';
}

const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, isOpen, onClose, onUpdate, mode: initialMode }) => {
  const [mode, setMode] = useState<'view' | 'edit'>(initialMode);
  const [editedUser, setEditedUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const { logClick, logAction } = useLogger('UserProfileModal');
  const { user: currentUser } = useAuthStore();
  const navigate = useNavigate();

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      navigate(-1); // Go back to previous page
    }
  };

  useEffect(() => {
    if (user) {
      setEditedUser({ ...user });
    }
    setMode(initialMode);
  }, [user, initialMode]);

  if (!isOpen || !user || !editedUser) return null;

  const formatSafeDate = (date: any): string => {
    try {
      if (!date) return 'N/A';
      const dateObj = date.toDate ? date.toDate() : new Date(date);
      return format(dateObj, 'MMM dd, yyyy HH:mm');
    } catch {
      return 'N/A';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'rejected': return 'text-red-600 bg-red-100';
      case 'deleted': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getSubscriptionStatus = () => {
    if (!editedUser.subscription_end) return 'No subscription';
    try {
      const endDate = editedUser.subscription_end.toDate ? editedUser.subscription_end.toDate() : new Date(editedUser.subscription_end);
      const now = new Date();
      return endDate > now ? 'Active' : 'Expired';
    } catch {
      return 'Unknown';
    }
  };

  const handleSave = async () => {
    if (!editedUser) return;
    
    // Validation
    if (!editedUser.name?.trim()) {
      toast.error('Name is required');
      return;
    }
    
    if (!editedUser.email?.trim()) {
      toast.error('Email is required');
      return;
    }
    
    if (editedUser.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editedUser.email)) {
      toast.error('Please enter a valid email address');
      return;
    }
    
    try {
      setLoading(true);
      logAction('update_user_profile_started', { userId: editedUser.id });
      
      // Use transaction for data consistency
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'user_profiles', editedUser.id);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User profile not found');
        }
        
        const updateData: any = {
          name: editedUser.name.trim(),
          email: editedUser.email.trim(),
          phone: editedUser.phone?.trim() || '',
          notes: editedUser.notes?.trim() || '',
          updated_at: Timestamp.now()
        };

        // Only update subscription dates if they're provided
        if (editedUser.subscription_start) {
          updateData.subscription_start = editedUser.subscription_start;
        }
        if (editedUser.subscription_end) {
          updateData.subscription_end = editedUser.subscription_end;
        }

        transaction.update(userRef, updateData);
      });
      
      toast.success('User profile updated successfully');
      logAction('update_user_profile_completed', { userId: editedUser.id });
      setMode('view');
      onUpdate();
    } catch (error: any) {
      console.error('Error updating user profile:', error);
      const errorMessage = error.message || 'Failed to update user profile';
      toast.error(errorMessage);
      logAction('update_user_profile_failed', { userId: editedUser.id, error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: 'verified' | 'rejected' | 'deleted') => {
    if (!editedUser || loading) return;
    
    const confirmMessage = {
      verified: 'Are you sure you want to verify this user?',
      rejected: 'Are you sure you want to reject/deactivate this user?',
      deleted: 'Are you sure you want to soft delete this user? This action can be undone.'
    };

    if (!window.confirm(confirmMessage[newStatus])) return;

    try {
      setLoading(true);
      logAction(`${newStatus}_user_started`, { userId: editedUser.id });
      
      // Prepare update data
      const updateData: any = {
        status: newStatus,
        updated_at: Timestamp.now()
      };

      if (newStatus === 'verified') {
        updateData.is_active = true;
        updateData.verified_at = Timestamp.now();
        updateData.approved_by = currentUser?.uid || 'unknown';
        updateData.subscription_status = 'active';
      } else if (newStatus === 'rejected') {
        updateData.is_active = false;
        updateData.rejection_reason = 'Deactivated by admin';
        updateData.subscription_status = 'inactive';
      } else if (newStatus === 'deleted') {
        updateData.is_active = false;
        updateData.deleted_at = Timestamp.now();
        updateData.subscription_status = 'inactive';
      }
      
      // Use transaction for data consistency
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'user_profiles', editedUser.id);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User profile not found');
        }

        transaction.update(userRef, updateData);
      });
      
      // Update local state
      setEditedUser(prev => prev ? { ...prev, ...updateData, status: newStatus } : null);
      
      const actionText = newStatus === 'rejected' ? 'deactivated' : newStatus === 'deleted' ? 'soft deleted' : newStatus;
      toast.success(`User ${actionText} successfully`);
      logAction(`${newStatus}_user_completed`, { userId: editedUser.id });
      
      if (onUpdate) onUpdate();
      if (onClose) onClose();
    } catch (error: any) {
      console.error(`Error ${newStatus} user:`, error);
      const errorMessage = error.message || `Failed to ${newStatus} user`;
      toast.error(errorMessage);
      logAction(`${newStatus}_user_failed`, { userId: editedUser.id, error: errorMessage });
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (!editedUser || loading) return;
    
    const doubleConfirm = window.confirm('⚠️ DANGER: Are you sure you want to permanently delete this user?\n\nThis action CANNOT be undone and will remove ALL user data forever.');
    if (!doubleConfirm) return;
    
    const finalConfirm = window.confirm('This is your final warning. Type YES in the next prompt to confirm permanent deletion.');
    if (!finalConfirm) return;

    try {
      setLoading(true);
      logAction('permanent_delete_user_started', { userId: editedUser.id });
      
      // Use transaction for data consistency
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'user_profiles', editedUser.id);
        const userDoc = await transaction.get(userRef);
        
        if (!userDoc.exists()) {
          throw new Error('User profile not found');
        }
        
        transaction.delete(userRef);
      });
      
      toast.success('User permanently deleted');
      logAction('permanent_delete_user_completed', { userId: editedUser.id });
      
      if (onUpdate) onUpdate();
      if (onClose) onClose();
    } catch (error: any) {
      console.error('Error permanently deleting user:', error);
      const errorMessage = error.message || 'Failed to permanently delete user';
      toast.error(errorMessage);
      logAction('permanent_delete_user_failed', { userId: editedUser.id, error: errorMessage });
    } finally {
      setLoading(false);
    }
  };



  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
      <div className="w-full max-w-4xl h-[90vh] bg-white dark:bg-black border border-gray-300 dark:border-gray-700 rounded-lg shadow-xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-300 dark:border-gray-700 bg-white dark:bg-black">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  {editedUser.profile_picture_url ? (
                    <img 
                      src={editedUser.profile_picture_url} 
                      alt={editedUser.name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        const nextElement = e.currentTarget.nextElementSibling as HTMLElement;
                        if (nextElement) nextElement.style.display = 'flex';
                      }}
                    />
                  ) : null}
                  <div 
                    className="w-12 h-12 rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-600" 
                    style={{
                      display: editedUser.profile_picture_url ? 'none' : 'flex'
                    }}
                  >
                    <User className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                  </div>
                </div>
                
                <div className="bg-transparent">
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                    {editedUser.name}
                  </h1>
                  <div className="flex items-center gap-2 mt-1 bg-transparent">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${getStatusColor(editedUser.status)}`}>
                      {editedUser.status.charAt(0).toUpperCase() + editedUser.status.slice(1)}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-gray-400 bg-transparent">
                      ID: {editedUser.id.slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {mode === 'view' && (
                <button
                  onClick={() => {
                    setMode('edit');
                    logClick('edit_user_profile', { userId: editedUser.id });
                  }}
                  className="px-4 py-2 bg-gray-900 dark:bg-white text-white dark:text-black rounded hover:bg-gray-800 dark:hover:bg-gray-100 transition-colors text-sm font-medium"
                >
                  <Edit3 className="w-4 h-4 inline mr-1" />
                  Edit
                </button>
              )}
              {mode === 'edit' && (
                <>
                  <button
                    onClick={() => setMode('view')}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-sm font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Save'}
                  </button>
                </>
              )}
              <button
                onClick={handleClose}
                className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-black">
          <div className="p-6 space-y-6">
            {/* Basic Information Card */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                <User className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Full Name</label>
                  {mode === 'edit' ? (
                    <input
                      type="text"
                      value={editedUser.name}
                      onChange={(e) => setEditedUser({...editedUser, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-transparent rounded border border-gray-200 dark:border-gray-700">
                      <User className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-white">{editedUser.name}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Email Address</label>
                  {mode === 'edit' ? (
                    <input
                      type="email"
                      value={editedUser.email}
                      onChange={(e) => setEditedUser({...editedUser, email: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-transparent rounded border border-gray-200 dark:border-gray-700">
                      <Mail className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-white">{editedUser.email}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Phone Number</label>
                  {mode === 'edit' ? (
                    <input
                      type="tel"
                      value={editedUser.phone || ''}
                      onChange={(e) => setEditedUser({...editedUser, phone: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                      placeholder="Enter phone number"
                    />
                  ) : (
                    <div className="flex items-center gap-2 p-3 bg-transparent rounded border border-gray-200 dark:border-gray-700">
                      <Phone className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                      <span className="text-gray-900 dark:text-white">{editedUser.phone || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Account Status</label>
                  <div className="flex items-center gap-2 p-3 bg-transparent rounded border border-gray-200 dark:border-gray-700">
                    <div className={`w-3 h-3 rounded-full ${editedUser.is_active ? 'bg-green-500' : 'bg-red-500'}`}></div>
                    <span className="text-gray-900 dark:text-white">
                      {editedUser.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>

              {(mode === 'edit' || editedUser.notes) && (
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Notes</label>
                  {mode === 'edit' ? (
                    <textarea
                      value={editedUser.notes || ''}
                      onChange={(e) => setEditedUser({...editedUser, notes: e.target.value})}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500 resize-none"
                      placeholder="Add notes about this user..."
                    />
                  ) : (
                    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                      <span className="text-gray-900 dark:text-white">{editedUser.notes || 'No notes available'}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Subscription Information Card */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                Subscription Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Subscription Status</label>
                  <div className="flex items-center gap-2 p-3 bg-transparent rounded border border-gray-200 dark:border-gray-700">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      getSubscriptionStatus() === 'Active' ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'
                    }`}>
                      {getSubscriptionStatus()}
                    </span>
                  </div>
                </div>

                {mode === 'edit' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Subscription Start</label>
                      <input
                        type="date"
                        value={editedUser.subscription_start ? format(new Date(editedUser.subscription_start), 'yyyy-MM-dd') : ''}
                        onChange={(e) => setEditedUser({...editedUser, subscription_start: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Subscription End</label>
                      <input
                        type="date"
                        value={editedUser.subscription_end ? format(new Date(editedUser.subscription_end), 'yyyy-MM-dd') : ''}
                        onChange={(e) => setEditedUser({...editedUser, subscription_end: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-gray-500"
                      />
                    </div>
                  </>
                )}

                {mode === 'view' && (
                  <div>
                    <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Subscription Period</label>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 p-3 bg-transparent rounded border border-gray-200 dark:border-gray-700">
                        <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-900 dark:text-white">Start: {formatSafeDate(editedUser.subscription_start)}</span>
                      </div>
                      <div className="flex items-center gap-2 p-3 bg-transparent rounded border border-gray-200 dark:border-gray-700">
                        <Calendar className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                        <span className="text-gray-900 dark:text-white">End: {formatSafeDate(editedUser.subscription_end)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Documents & Media Card */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                <FileText className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                Documents & Media
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Profile Picture Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Camera className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile Picture</span>
                  </div>
                  
                  {editedUser.profile_picture_url ? (
                     <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                       <img 
                         src={editedUser.profile_picture_url} 
                         alt="Profile"
                         className="w-full h-40 object-cover rounded border border-gray-200 dark:border-gray-600"
                         onError={(e) => {
                           e.currentTarget.style.display = 'none';
                           const parent = e.currentTarget.parentElement;
                           if (parent) {
                             parent.innerHTML = `
                               <div class="flex flex-col items-center justify-center h-40 text-gray-400">
                                 <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                 </svg>
                                 <span class="text-sm">Failed to load image</span>
                               </div>
                             `;
                           }
                         }}
                       />
                       <a 
                         href={editedUser.profile_picture_url} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="text-sm mt-3 inline-flex items-center gap-2 text-gray-900 dark:text-white hover:underline transition-colors"
                       >
                         <ExternalLink className="w-4 h-4" />
                         View Full Size
                       </a>
                     </div>
                   ) : (
                     <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-center">
                       <Camera className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                       <span className="text-sm text-gray-500 dark:text-gray-400">No profile picture uploaded</span>
                     </div>
                   )}
                </div>

                {/* ID Proof Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">ID Proof</span>
                  </div>
                  
                  {editedUser.id_proof_url ? (
                     <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
                       <img 
                         src={editedUser.id_proof_url} 
                         alt="ID Proof"
                         className="w-full h-40 object-cover rounded border border-gray-200 dark:border-gray-600"
                         onError={(e) => {
                           e.currentTarget.style.display = 'none';
                           const parent = e.currentTarget.parentElement;
                           if (parent) {
                             parent.innerHTML = `
                               <div class="flex flex-col items-center justify-center h-40 text-gray-400">
                                 <svg class="w-8 h-8 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                                 </svg>
                                 <span class="text-sm">Failed to load image</span>
                               </div>
                             `;
                           }
                         }}
                       />
                       <a 
                         href={editedUser.id_proof_url} 
                         target="_blank" 
                         rel="noopener noreferrer"
                         className="text-sm mt-3 inline-flex items-center gap-2 text-gray-900 dark:text-white hover:underline transition-colors"
                       >
                         <ExternalLink className="w-4 h-4" />
                         View Full Size
                       </a>
                     </div>
                   ) : (
                     <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-transparent text-center">
                       <FileText className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                       <span className="text-sm text-gray-500 dark:text-gray-400">No ID proof uploaded</span>
                     </div>
                   )}
                </div>
              </div>
            </div>

            {/* Timeline Card */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                <Calendar className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                Timeline
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 bg-transparent rounded border border-gray-200 dark:border-gray-700">
                  <span className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Created:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{formatSafeDate(editedUser.created_at)}</div>
                </div>
                <div className="p-3 bg-transparent rounded border border-gray-200 dark:border-gray-700">
                  <span className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Updated:</span>
                  <div className="font-medium text-gray-900 dark:text-white">{formatSafeDate(editedUser.updated_at)}</div>
                </div>
                {editedUser.verified_at && (
                  <div className="p-3 bg-transparent rounded border border-gray-200 dark:border-gray-700">
                    <span className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Verified:</span>
                    <div className="font-medium text-gray-900 dark:text-white">{formatSafeDate(editedUser.verified_at)}</div>
                  </div>
                )}
                {editedUser.deleted_at && (
                  <div className="p-3 bg-transparent rounded border border-gray-200 dark:border-gray-700">
                    <span className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Deleted:</span>
                    <div className="font-medium text-gray-900 dark:text-white">{formatSafeDate(editedUser.deleted_at)}</div>
                  </div>
                )}
              </div>
            </div>

            {/* Actions Card */}
            {mode === 'view' && (
              <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-gray-900 dark:text-white">
                  <Edit3 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
                  Actions
                </h3>
                <div className="flex flex-wrap gap-3">
                  {editedUser.status === 'pending' && (
                    <>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!loading) {
                            handleStatusChange('verified');
                          }
                        }}
                        disabled={loading}
                        className="px-4 py-2 bg-green-600 text-white rounded flex items-center gap-2 font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {loading ? 'Processing...' : 'Approve User'}
                      </button>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (!loading) {
                            handleStatusChange('rejected');
                          }
                        }}
                        disabled={loading}
                        className="px-4 py-2 bg-red-600 text-white rounded flex items-center gap-2 font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <XCircle className="w-4 h-4" />
                        {loading ? 'Processing...' : 'Reject User'}
                      </button>
                    </>
                  )}
                  
                  {editedUser.status === 'verified' && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!loading) {
                          handleStatusChange('rejected');
                        }
                      }}
                      disabled={loading}
                      className="px-4 py-2 bg-red-600 text-white rounded flex items-center gap-2 font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <XCircle className="w-4 h-4" />
                      {loading ? 'Processing...' : 'Deactivate User'}
                    </button>
                  )}
                  
                  {editedUser.status !== 'deleted' && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!loading) {
                          handleStatusChange('deleted');
                        }
                      }}
                      disabled={loading}
                      className="px-4 py-2 bg-yellow-600 text-white rounded flex items-center gap-2 font-medium hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                      {loading ? 'Processing...' : 'Soft Delete'}
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (!loading) {
                        handlePermanentDelete();
                      }
                    }}
                    disabled={loading}
                    className="px-4 py-2 bg-white dark:bg-gray-800 text-red-600 border-2 border-red-600 rounded flex items-center gap-2 font-medium hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 className="w-4 h-4" />
                    {loading ? 'Processing...' : 'Permanent Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
       </div>
     </div>
   );
 };

export default UserProfileModal;