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
      <div className="rounded-lg shadow-2xl max-w-md w-full mx-4" style={{backgroundColor: 'var(--bg-primary)', borderColor: 'var(--border-color)', border: '1px solid'}}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b" style={{borderColor: 'var(--border-color)'}}>
          <div className="flex items-center space-x-3">
            <div className="p-2 border rounded-lg" style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)'}}>
              <UserPlus className="h-6 w-6" style={{color: 'var(--text-primary)'}} />
            </div>
            <h2 className="text-xl font-semibold" style={{color: 'var(--text-primary)'}}>Create Admin Account</h2>
          </div>
          <button
              onClick={onClose}
              className="p-2 rounded-lg transition-colors"
              style={{'--hover-bg': 'var(--bg-hover)'} as any}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
            >
              <X className="h-5 w-5" style={{color: 'var(--text-secondary)'}} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!accountCreated ? (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="text-sm mb-4" style={{color: 'var(--text-secondary)'}}>
                Create a new admin account with a temporary password. The admin should change their password after first login.
              </div>
              
              {/* Name Field */}
              <div>
                <label htmlFor="name" className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>
                  <User className="h-4 w-4 inline mr-2" />
                  Full Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 transition-colors"
                  style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
                  placeholder="Enter admin's full name"
                  required
                />
              </div>

              {/* Email Field */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>
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
                <label htmlFor="temporaryPassword" className="block text-sm font-medium mb-2" style={{color: 'var(--text-primary)'}}>
                  Temporary Password *
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    id="temporaryPassword"
                    name="temporaryPassword"
                    value={formData.temporaryPassword}
                    onChange={handleInputChange}
                    className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 transition-colors"
                    style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)'}}
                    placeholder="Enter temporary password"
                    required
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-3 py-2 border rounded-lg transition-colors text-sm"
                    style={{backgroundColor: 'var(--bg-hover)', color: 'var(--text-primary)', borderColor: 'var(--border-color)'}}
                  >
                    Generate
                  </button>
                </div>
              </div>

              {/* Security Notice */}
              <div className="border rounded-lg p-3" style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)'}}>
                <div className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  <strong style={{color: 'var(--text-primary)'}}>Security Notice:</strong> This will create an admin account with full system privileges. Only invite trusted individuals.
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border rounded-lg transition-colors"
                  style={{color: 'var(--text-secondary)', backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)'}}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                  style={{backgroundColor: 'var(--accent-color)', color: 'var(--accent-text)'}}
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2" style={{borderColor: 'var(--accent-text)'}}></div>
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
              <div className="p-4 border rounded-lg" style={{backgroundColor: 'var(--success-bg)', borderColor: 'var(--success-border)'}}>
                <div className="text-sm" style={{color: 'var(--success-text)'}}>
                  Admin account created successfully!
                </div>
              </div>
              
              <div className="border rounded-lg p-4 text-left" style={{backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)'}}>
                <div className="text-sm mb-2" style={{color: 'var(--text-secondary)'}}>Account Details:</div>
                <div className="space-y-2">
                  <div className="text-sm" style={{color: 'var(--text-primary)'}}>
                    <strong>Email:</strong> {formData.email}
                  </div>
                  <div className="text-sm text-white">
                    <strong>Name:</strong> {formData.name}
                  </div>
                  <div className="text-sm" style={{color: 'var(--warning-text)'}}>
                    <strong>Note:</strong> The admin should change their password after first login.
                  </div>
                </div>
              </div>

              <div className="flex justify-center space-x-3">
                <button
                  onClick={resetForm}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{backgroundColor: 'var(--accent-color)', color: 'var(--accent-text)'}}
                >
                  Create Another
                </button>
                <button
                  onClick={onClose}
                  className="px-4 py-2 border rounded-lg transition-colors"
                  style={{backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)', borderColor: 'var(--border-color)'}}
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