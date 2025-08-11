import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, UserPlus, Mail, User, Lock, Check } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';

const AdminInvitePage: React.FC = () => {
  const navigate = useNavigate();
  const { createAdminAccount } = useAuthStore();
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    temporaryPassword: ''
  });
  const [loading, setLoading] = useState(false);
  const [accountCreated, setAccountCreated] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

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
      toast.error('Please fill in all fields');
      return;
    }

    if (formData.temporaryPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const result = await createAdminAccount(formData.email, formData.name, formData.temporaryPassword);
    setLoading(false);

    if (result.error) {
      toast.error(result.error);
    } else {
      setAccountCreated(true);
      toast.success('Admin account created successfully!');
    }
  };

  const resetForm = () => {
    setFormData({ email: '', name: '', temporaryPassword: '' });
    setAccountCreated(false);
  };

  return (
    <div className="min-h-screen p-4 bg-white dark:bg-black">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-8">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center transition-colors"
            style={{
              color: 'var(--text-secondary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>
        </div>

        {/* Main Card */}
        <div className="rounded-2xl shadow-2xl p-8 bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 bg-gray-100 dark:bg-gray-800">
              <UserPlus className="w-8 h-8 text-gray-900 dark:text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2 text-gray-900 dark:text-white">
              Create New Admin
            </h1>
            <p className="text-gray-700 dark:text-gray-300">
              Create a new admin account directly
            </p>
          </div>

          {!accountCreated ? (
            /* Admin Creation Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-offset-2"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)'
                  }}
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  <User className="w-4 h-4 inline mr-2" />
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-offset-2"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)',
                    border: '1px solid var(--border-color)'
                  }}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-900 dark:text-white">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Temporary Password
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    name="temporaryPassword"
                    value={formData.temporaryPassword}
                    onChange={handleInputChange}
                    className="flex-1 px-4 py-3 rounded-lg focus:ring-2 focus:ring-offset-2"
                    style={{
                      backgroundColor: 'var(--bg-primary)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)'
                    }}
                    placeholder="Enter temporary password"
                    required
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-4 py-3 rounded-lg transition-colors"
                    style={{
                      backgroundColor: 'var(--bg-secondary)',
                      color: 'var(--text-primary)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                  >
                    Generate
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-lg font-medium focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--text-primary)'
                }}
                onMouseEnter={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
                onMouseLeave={(e) => !loading && (e.currentTarget.style.backgroundColor = 'var(--bg-primary)')}
              >
                {loading ? 'Creating Account...' : 'Create Admin Account'}
              </button>
            </form>
          ) : (
            /* Account Creation Success */
            <div className="text-center space-y-6">
              <div className="p-4 rounded-lg border" style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)'
              }}>
                <div className="flex items-center justify-center mb-2">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                  Admin Account Created Successfully!
                </h3>
                <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
                  The admin account has been created with the provided credentials.
                </p>
              </div>

              <div className="p-4 rounded-lg border" style={{
                backgroundColor: 'var(--bg-secondary)',
                borderColor: 'var(--border-color)'
              }}>
                <p className="text-sm mb-2" style={{color: 'var(--text-secondary)'}}>Account Details:</p>
                <div className="text-left space-y-2">
                  <p className="text-sm" style={{color: 'var(--text-primary)'}}><strong>Email:</strong> {formData.email}</p>
                  <p className="text-sm" style={{color: 'var(--text-primary)'}}><strong>Name:</strong> {formData.name}</p>
                  <p className="text-sm" style={{color: 'var(--accent-color)'}}>
                    <strong>Note:</strong> The admin should change their password after first login.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={resetForm}
                  className="w-full py-3 px-4 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-primary)',
                    color: 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-primary)'}
                >
                  Create Another Admin
                </button>
                <button
                  onClick={() => navigate('/admin')}
                  className="w-full py-3 px-4 rounded-lg font-medium transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-hover)'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'}
                >
                  Back to Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminInvitePage;