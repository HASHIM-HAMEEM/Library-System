import React, { useState, useEffect } from 'react';
import { 
  User, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Calendar, 
  Mail, 
  Phone, 
  MapPin,
  FileText,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { useUserStore } from '../stores/userStore';
// Note: Using console.log for notifications - replace with your preferred toast library
const toast = {
  success: (message: string) => console.log('Success:', message),
  error: (message: string) => console.error('Error:', message)
};

interface UserVerificationProps {
  className?: string;
}

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  userName: string;
}

const RejectionModal: React.FC<RejectionModalProps> = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  userName 
}) => {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm(reason);
      setReason('');
      onClose();
    } catch (error) {
      console.error('Error submitting rejection:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
        <div className="flex items-center space-x-3 mb-4">
          <AlertTriangle className="w-6 h-6 text-red-600" />
          <h3 className="text-lg font-semibold text-gray-800">
            Reject User Registration
          </h3>
        </div>
        
        <p className="text-gray-600 mb-4">
          You are about to reject the registration for <strong>{userName}</strong>. 
          Please provide a reason for rejection:
        </p>
        
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Enter rejection reason..."
          className="w-full p-3 border border-gray-300 rounded-lg resize-none h-24 focus:ring-2 focus:ring-red-500 focus:border-transparent"
          maxLength={500}
        />
        
        <div className="text-right text-sm text-gray-500 mb-4">
          {reason.length}/500 characters
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || !reason.trim()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Rejecting...</span>
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4" />
                <span>Reject User</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

const UserVerification: React.FC<UserVerificationProps> = ({ className = '' }) => {
  const { 
    pendingUsers, 
    loading, 
    error, 
    fetchPendingUsers, 
    verifyUser 
  } = useUserStore();
  
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [viewingDocument, setViewingDocument] = useState<string | null>(null);
  const [rejectionModal, setRejectionModal] = useState<{
    isOpen: boolean;
    userId: string;
    userName: string;
  }>({ isOpen: false, userId: '', userName: '' });
  const [processingUsers, setProcessingUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPendingUsers();
  }, [fetchPendingUsers]);

  const handleApprove = async (userId: string) => {
    setProcessingUsers(prev => new Set(prev).add(userId));
    try {
      await verifyUser(userId, 'verified');
      toast.success('User approved successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to approve user');
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const handleReject = async (userId: string, reason: string) => {
    setProcessingUsers(prev => new Set(prev).add(userId));
    try {
      await verifyUser(userId, 'rejected');
      toast.success('User rejected successfully');
    } catch (error: any) {
      toast.error(error.message || 'Failed to reject user');
    } finally {
      setProcessingUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
    }
  };

  const openRejectionModal = (userId: string, userName: string) => {
    setRejectionModal({ isOpen: true, userId, userName });
  };

  const closeRejectionModal = () => {
    setRejectionModal({ isOpen: false, userId: '', userName: '' });
  };

  const confirmRejection = async (reason: string) => {
    await handleReject(rejectionModal.userId, reason);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-gray-600">Loading pending users...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`bg-white rounded-lg shadow-lg p-6 ${className}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Error Loading Users</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={fetchPendingUsers}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Clock className="w-6 h-6 text-orange-600" />
            <h2 className="text-xl font-semibold text-gray-800">
              Pending User Verifications
            </h2>
          </div>
          <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-full text-sm font-medium">
            {pendingUsers.length} pending
          </div>
        </div>
      </div>

      {pendingUsers.length === 0 ? (
        <div className="p-12 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-800 mb-2">
            All Caught Up!
          </h3>
          <p className="text-gray-600">
            No pending user verifications at the moment.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-gray-200">
          {pendingUsers.map((user) => {
            const isProcessing = processingUsers.has(user.id);
            
            return (
              <div key={user.id} className="p-6 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {/* User Basic Info */}
                    <div className="flex items-center space-x-4 mb-4">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <User className="w-6 h-6 text-gray-600" />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-800">
                          {user.name}
                        </h3>
                        <div className="flex items-center space-x-4 text-sm text-gray-600">
                          <div className="flex items-center space-x-1">
                            <Mail className="w-4 h-4" />
                            <span>{user.email}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <Phone className="w-4 h-4" />
                            <span>{user.phone}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* User Details Grid */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block">Registration Date</span>
                        <span className="text-sm font-medium text-gray-800">
                          {formatDate(user.created_at)}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block">Role</span>
                        <span className="text-sm font-medium text-gray-800 capitalize">
                          {user.role}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block">Account Status</span>
                        <span className="text-sm font-medium text-orange-600">
                          {user.status}
                        </span>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 block">Address</span>
                        <span className="text-sm font-medium text-gray-800">
                          {user.address || 'Not provided'}
                        </span>
                      </div>
                    </div>

                    {/* Documents Section */}
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Documents</h4>
                      <div className="flex space-x-3">
                        {user.profile_picture_url && (
                          <button
                            onClick={() => setViewingDocument(user.profile_picture_url!)}
                            className="flex items-center space-x-2 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                            <span>Profile Picture</span>
                          </button>
                        )}
                        {user.id_proof_url && (
                          <button
                            onClick={() => setViewingDocument(user.id_proof_url)}
                            className="flex items-center space-x-2 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                            <span>ID Proof</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 ml-6">
                    <button
                      onClick={() => handleApprove(user.id)}
                      disabled={isProcessing}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {isProcessing ? (
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => openRejectionModal(user.id, user.name)}
                      disabled={isProcessing}
                      className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-4 max-w-4xl max-h-[90vh] overflow-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Document Viewer</h3>
              <button
                onClick={() => setViewingDocument(null)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <img
              src={viewingDocument}
              alt="Document"
              className="max-w-full h-auto rounded-lg"
              onError={(e) => {
                e.currentTarget.src = '/placeholder-document.png';
              }}
            />
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      <RejectionModal
        isOpen={rejectionModal.isOpen}
        onClose={closeRejectionModal}
        onConfirm={confirmRejection}
        userName={rejectionModal.userName}
      />
    </div>
  );
};

export default UserVerification;