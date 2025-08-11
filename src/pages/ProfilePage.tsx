import { useState, useEffect } from 'react';
import { User, Mail, Phone, MapPin, Calendar, Edit2, Save, X, ArrowLeft, Shield } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface ProfileData {
  name: string;
  email: string;
  phone: string;
  address: string;
}

const ProfilePage = () => {
  const { userProfile, updateProfile, fetchUserProfile } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [profileData, setProfileData] = useState<ProfileData>({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [originalData, setOriginalData] = useState<ProfileData>({
    name: '',
    email: '',
    phone: '',
    address: ''
  });

  useEffect(() => {
    if (userProfile) {
      const data = {
        name: userProfile.name || '',
        email: userProfile.email || '',
        phone: userProfile.phone || '',
        address: userProfile.address || ''
      };
      setProfileData(data);
      setOriginalData(data);
    }
  }, [userProfile]);

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setProfileData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSave = async () => {
    if (!userProfile) return;

    // Validation
    if (!profileData.name.trim()) {
      toast.error('Name is required');
      return;
    }

    if (!profileData.email.trim()) {
      toast.error('Email is required');
      return;
    }

    if (!profileData.email.includes('@')) {
      toast.error('Please enter a valid email');
      return;
    }

    setLoading(true);

    try {
      const { error } = await updateProfile({
        name: profileData.name.trim(),
        email: profileData.email.trim(),
        phone: profileData.phone.trim(),
        address: profileData.address.trim()
      });

      if (error) {
        toast.error(`Failed to update profile: ${error}`);
        return;
      }

      // Update local state
      await fetchUserProfile();
      setOriginalData(profileData);
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setProfileData(originalData);
    setIsEditing(false);
  };

  const getSubscriptionStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return { backgroundColor: 'var(--success-bg)', color: 'var(--success-text)', border: '1px solid var(--success-border)' };
      case 'expired':
        return { backgroundColor: 'var(--error-bg)', color: 'var(--error-text)', border: '1px solid var(--error-border)' };
      default:
        return { backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' };
    }
  };

  const getSubscriptionTypeDisplay = (type?: string) => {
    if (!type) return 'N/A';
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="shadow-sm border-b bg-white dark:bg-black border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link
                to={'/dashboard'}
                className="flex items-center mr-4 transition-colors text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="rounded-lg p-2 bg-gray-900 dark:bg-white">
                <User className="h-6 w-6 text-white dark:text-black" />
              </div>
              <h1 className="ml-3 text-xl font-semibold text-gray-900 dark:text-white">Profile</h1>
            </div>
            <div className="flex items-center space-x-4">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center px-4 py-2 rounded-lg transition-colors bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:opacity-80"
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-green-600 text-white hover:bg-green-700"
                  >
                    {loading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    Save
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={loading}
                    className="flex items-center px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-gray-200 text-gray-800 dark:bg-gray-700 dark:text-gray-200 hover:opacity-80"
                  >
                    <X className="h-4 w-4 mr-2" />
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Profile Information */}
          <div className="lg:col-span-2">
            <div className="rounded-xl shadow-sm p-6 bg-white dark:bg-black">
          <h2 className="text-lg font-medium mb-6 text-gray-900 dark:text-white">Personal Information</h2>
              
              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:outline-none bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-gray-900 dark:focus:ring-white"
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <div className="flex items-center p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
                      <User className="h-5 w-5 mr-3 text-gray-700 dark:text-gray-300" />
                      <span className="text-gray-900 dark:text-white">{profileData.name || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Email Address
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:outline-none bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-gray-900 dark:focus:ring-white"
                      placeholder="Enter your email address"
                    />
                  ) : (
                    <div className="flex items-center p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
                      <Mail className="h-5 w-5 mr-3 text-gray-700 dark:text-gray-300" />
                      <span className="text-gray-900 dark:text-white">{profileData.email || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:outline-none bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-gray-900 dark:focus:ring-white"
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <div className="flex items-center p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
                      <Phone className="h-5 w-5 mr-3 text-gray-700 dark:text-gray-300" />
                      <span className="text-gray-900 dark:text-white">{profileData.phone || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                    Address
                  </label>
                  {isEditing ? (
                    <textarea
                      value={profileData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:outline-none bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white focus:ring-gray-900 dark:focus:ring-white"
                      placeholder="Enter your address"
                    />
                  ) : (
                    <div className="flex items-start p-3 rounded-lg bg-gray-100 dark:bg-gray-800">
                      <MapPin className="h-5 w-5 mr-3 mt-0.5 text-gray-700 dark:text-gray-300" />
                      <span className="text-gray-900 dark:text-white">{profileData.address || 'Not provided'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Account Summary */}
          <div className="space-y-6">
            {/* Account Status */}
            <div className="rounded-xl shadow-sm p-6 bg-white dark:bg-black">
              <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Account Status</h3>
              
              <div className="space-y-4">
                {/* Role */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Role</span>
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-2 text-gray-900 dark:text-white" />
                    <span className="text-sm font-medium capitalize text-gray-900 dark:text-white">
                      {userProfile.role}
                    </span>
                  </div>
                </div>

                {/* Member Since */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Member Since</span>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-gray-700 dark:text-gray-300" />
                    <span className="text-sm text-gray-900 dark:text-white">
                      {format(new Date(userProfile.created_at), 'MMM yyyy')}
                    </span>
                  </div>
                </div>

                {/* Subscription Status */}
                {userProfile.role === 'student' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-gray-700 dark:text-gray-300">Subscription</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                        getSubscriptionStatusColor(userProfile.subscription_status || 'inactive')
                      }`}>
                        {userProfile.subscription_status || 'inactive'}
                      </span>
                    </div>
                    
                    {userProfile.subscription_type && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700 dark:text-gray-300">Type</span>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {getSubscriptionTypeDisplay(userProfile.subscription_type)}
                        </span>
                      </div>
                    )}
                    

                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            {userProfile.role === 'student' && (
              <div className="rounded-xl shadow-sm p-6 bg-white dark:bg-black">
                <h3 className="text-lg font-medium mb-4 text-gray-900 dark:text-white">Quick Actions</h3>
                
                <div className="space-y-3">
                  <Link
                    to="/scan"
                    className="block w-full text-center px-4 py-2 rounded-lg transition-colors bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700 hover:bg-gray-900 hover:text-white dark:hover:bg-white dark:hover:text-black"
                  >
                    QR Scanner
                  </Link>
                  
                  <Link
                    to="/subscription"
                    className="block w-full text-center px-4 py-2 rounded-lg transition-colors bg-green-600 text-white hover:bg-green-700"
                  >
                    Manage Subscription
                  </Link>
                  
                  <Link
                    to="/attendance"
                    className="block w-full text-center px-4 py-2 rounded-lg transition-colors bg-gray-900 text-white dark:bg-white dark:text-black hover:opacity-80"
                  >
                    View Attendance
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;