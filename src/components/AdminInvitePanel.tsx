import React, { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { X, UserPlus, User, Mail, Send, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface AdminInvitePanelProps {
  onClose: () => void;
}

const AdminInvitePanel: React.FC<AdminInvitePanelProps> = ({ onClose }) => {
  const { createAdminAccount } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    temporaryPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData(prev => ({ ...prev, temporaryPassword: password }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email || !formData.name || !formData.temporaryPassword) {
      toast.error('Please fill in all required fields');
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setLoading(true);
    
    try {
      const result = await createAdminAccount(formData.email, formData.name, formData.temporaryPassword);
      
      if (result.error) {
        toast.error(result.error);
      } else {
        setAccountCreated(true);
        toast.success('Admin account created successfully!');
        // Reset form
        setFormData({ email: '', name: '', temporaryPassword: '' });
      }
    } catch (error) {
      toast.error('Failed to create admin account');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const resetForm = () => {
    setFormData({ email: '', name: '', temporaryPassword: '' });
    setAccountCreated(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 backdrop-blur-sm">
      <div className="rounded-lg shadow-2xl max-w-md w-full mx-4 bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="p-2 border rounded-lg bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
              <UserPlus className="h-6 w-6 text-gray-900 dark:text-white" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Admin Account</h2>
          </div>
          <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-5 w-5 text-gray-700 dark:text-gray-300" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!accountCreated ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-sm mb-4 text-gray-700 dark:text-gray-300">
                Create a new admin account with a temporary password. The admin should change their password after first login.
              </div>
              
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  <User className="h-4 w-4 inline mr-2" />
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 transition-colors bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter admin's full name"
                  required
                />
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  <Mail className="h-4 w-4 inline mr-2" />
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 bg-[#2a2a2a] border border-[#404040] rounded-lg text-white placeholder-[#808080] focus:ring-2 focus:ring-white focus:border-white transition-colors"
                  placeholder="Enter admin's email address"
                  required
                />
              </div>

              {/* Temporary Password Field */}
              <div>
                <label htmlFor="temporaryPassword" className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  Temporary Password *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    id="temporaryPassword"
                    name="temporaryPassword"
                    value={formData.temporaryPassword}
                    onChange={handleInputChange}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 transition-colors bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white"
                    placeholder="Enter temporary password"
                    required
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-3 py-2 border rounded-lg transition-colors text-sm bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white border-gray-200 dark:border-gray-700"
                  >
                    Generate
                  </button>
                </div>
              </div>

              {/* Security Notice */}
              <div className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <div className="text-sm text-gray-700 dark:text-gray-300">
                  <strong className="text-gray-900 dark:text-white">Security Notice:</strong> This will create an admin account with full system privileges. Only invite trusted individuals.
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border rounded-lg transition-colors text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 bg-blue-500 text-white"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Success State */
            <div className="text-center space-y-4">
              <div className="p-4 border rounded-lg bg-green-50 dark:bg-green-900 border-green-200 dark:border-green-700">
                <div className="text-sm text-green-700 dark:text-green-300">
                  Admin account created successfully!
                </div>
              </div>
              
              <div className="border rounded-lg p-4 text-left bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                <div className="text-sm mb-2 text-gray-700 dark:text-gray-300">Account Details:</div>
                <div className="space-y-2">
                  <div className="text-sm text-gray-900 dark:text-white">
                    <strong>Email:</strong> {formData.email}
                  </div>
                  <div className="text-sm text-gray-900 dark:text-white">
                    <strong>Name:</strong> {formData.name}
                  </div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">
                    <strong>Note:</strong> The admin should change their password after first login.
                  </div>
                </div>
              </div>

              <div className="flex justify-center space-x-3">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 rounded-lg transition-colors bg-blue-500 text-white"
                >
                  Create Another
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border rounded-lg transition-colors bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminInvitePanel;