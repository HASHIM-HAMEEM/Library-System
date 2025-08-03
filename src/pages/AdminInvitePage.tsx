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
    <div className="min-h-screen p-4" style={{backgroundColor: '#000000'}}>
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 pt-8">
          <button
            onClick={() => navigate('/admin')}
            className="flex items-center text-white/80 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Back to Dashboard
          </button>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4">
              <UserPlus className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Create New Admin
            </h1>
            <p className="text-gray-600">
              Create a new admin account directly
            </p>
          </div>

          {!accountCreated ? (
            /* Admin Creation Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Mail className="w-4 h-4 inline mr-2" />
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-white focus:border-transparent text-white" style={{backgroundColor: '#000000'}}
                  placeholder="admin@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-2" />
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-white focus:border-transparent text-white" style={{backgroundColor: '#000000'}}
                  placeholder="John Doe"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  <Lock className="w-4 h-4 inline mr-2" />
                  Temporary Password
                </label>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    name="temporaryPassword"
                    value={formData.temporaryPassword}
                    onChange={handleInputChange}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-white focus:border-transparent text-white" style={{backgroundColor: '#000000'}}
                    placeholder="Enter temporary password"
                    required
                  />
                  <button
                    type="button"
                    onClick={generatePassword}
                    className="px-4 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                  >
                    Generate
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-white text-black py-3 px-4 rounded-lg font-medium hover:bg-gray-200 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Creating Account...' : 'Create Admin Account'}
              </button>
            </form>
          ) : (
            /* Account Creation Success */
            <div className="text-center space-y-6">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center justify-center mb-2">
                  <Check className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="text-lg font-semibold text-green-800 mb-2">
                  Admin Account Created Successfully!
                </h3>
                <p className="text-green-700 text-sm">
                  The admin account has been created with the provided credentials.
                </p>
              </div>

              <div className="p-4 bg-gray-50 rounded-lg border">
                <p className="text-sm text-gray-600 mb-2">Account Details:</p>
                <div className="text-left space-y-2">
                  <p className="text-sm"><strong>Email:</strong> {formData.email}</p>
                  <p className="text-sm"><strong>Name:</strong> {formData.name}</p>
                  <p className="text-sm text-orange-600">
                    <strong>Note:</strong> The admin should change their password after first login.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                <button
                  onClick={resetForm}
                  className="w-full bg-white text-black py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Create Another Admin
                </button>
                <button
                  onClick={() => navigate('/admin')}
                  className="w-full bg-gray-200 text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors"
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