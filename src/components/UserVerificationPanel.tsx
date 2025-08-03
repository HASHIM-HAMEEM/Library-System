import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { CheckCircle, XCircle, Clock, User, Mail, Phone, Calendar, Image } from 'lucide-react';
import { toast } from 'sonner';

interface PendingStudent {
  id: string;
  email: string;
  name: string;
  phone?: string;
  role: 'student'; // Students from Flutter app only
  status?: 'pending' | 'verified' | 'rejected';
  rejection_reason?: string;
  profile_picture_url?: string;
  id_proof_url?: string;
  address?: string;
  created_at?: string;
}

const UserVerificationPanel: React.FC = () => {
  const { getPendingUsers, verifyUser } = useAuthStore();
  const [pendingUsers, setPendingUsers] = useState<PendingStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);

  useEffect(() => {
    loadPendingUsers();
  }, []);

  const loadPendingUsers = async () => {
    setLoading(true);
    const result = await getPendingUsers();
    if (result.error) {
      toast.error(result.error);
    } else {
      // Filter only student users from the result
      const studentUsers = (result.data || []).filter(user => user.role === 'student') as PendingStudent[];
      setPendingUsers(studentUsers);
    }
    setLoading(false);
  };

  const handleApprove = async (userId: string) => {
    setProcessingUserId(userId);
    const result = await verifyUser(userId, 'approve');
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('User approved successfully!');
      await loadPendingUsers();
    }
    setProcessingUserId(null);
  };

  const handleReject = async (userId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setProcessingUserId(userId);
    const result = await verifyUser(userId, 'reject', rejectionReason);
    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success('User rejected successfully!');
      await loadPendingUsers();
      setShowRejectModal(null);
      setRejectionReason('');
    }
    setProcessingUserId(null);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
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
      <div className="rounded-lg shadow-md p-6" style={{backgroundColor: 'var(--bg-primary)'}}>
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-600"></div>
          <span className="ml-2 text-gray-600">Loading pending verifications...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex items-center mb-6">
        <Clock className="h-6 w-6 text-orange-500 mr-2" />
        <h2 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>Pending Verifications</h2>
        <span className="ml-2 bg-orange-100 text-orange-800 text-sm font-medium px-2.5 py-0.5 rounded-full">
          {pendingUsers.length}
        </span>
      </div>

      {pendingUsers.length === 0 ? (
        <div className="text-center py-8">
          <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <p style={{color: 'var(--text-secondary)'}}>No pending verifications</p>
          <p className="text-sm mt-1" style={{color: 'var(--text-secondary)'}}>All users have been processed</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingUsers.map((user) => (
            <div key={user.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <User className="h-5 w-5 text-gray-500 mr-2" />
                    <h3 className="font-semibold text-gray-800">{user.name}</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2" />
                      {user.email}
                    </div>
                    {user.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="h-4 w-4 mr-2" />
                        {user.phone}
                      </div>
                    )}
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2" />
                      Registered: {formatDate(user.created_at)}
                    </div>
                  </div>

                  {user.address && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-600">
                        <strong>Address:</strong> {user.address}
                      </p>
                    </div>
                  )}

                  {(user.profile_picture_url || user.id_proof_url) && (
                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Documents:</p>
                      <div className="flex space-x-3">
                        {user.profile_picture_url && (
                          <a
                            href={user.profile_picture_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-sm text-white hover:text-gray-300"
                          >
                            <Image className="h-4 w-4 mr-1" />
                            Profile Picture
                          </a>
                        )}
                        {user.id_proof_url && (
                          <a
                            href={user.id_proof_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center text-sm text-white hover:text-gray-300"
                          >
                            <Image className="h-4 w-4 mr-1" />
                            ID Proof
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2 ml-4">
                  <button
                    onClick={() => handleApprove(user.id)}
                    disabled={processingUserId === user.id}
                    className="flex items-center px-3 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    {processingUserId === user.id ? 'Processing...' : 'Approve'}
                  </button>
                  <button
                    onClick={() => setShowRejectModal(user.id)}
                    disabled={processingUserId === user.id}
                    className="flex items-center px-3 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Reject User Registration</h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this user's registration:
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              rows={4}
            />
            <div className="flex justify-end space-x-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectionReason('');
                }}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleReject(showRejectModal)}
                disabled={!rejectionReason.trim() || processingUserId === showRejectModal}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {processingUserId === showRejectModal ? 'Processing...' : 'Reject User'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserVerificationPanel;