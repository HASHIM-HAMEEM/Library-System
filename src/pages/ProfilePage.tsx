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
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: 'var(--accent-color)' }}></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header */}
      <header className="shadow-sm border-b" style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link
                to={'/dashboard'}
                className="flex items-center mr-4 transition-colors"
                style={{ color: 'var(--text-secondary)' }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </Link>
              <div className="rounded-lg p-2" style={{ backgroundColor: 'var(--accent-color)' }}>
                <User className="h-6 w-6" style={{ color: 'var(--text-primary)' }} />
              </div>
              <h1 className="ml-3 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>Profile</h1>
            </div>
            <div className="flex items-center space-x-4">
              {!isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center px-4 py-2 rounded-lg transition-colors"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.8';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  <Edit2 className="h-4 w-4 mr-2" />
                  Edit Profile
                </button>
              ) : (
                <div className="flex space-x-2">
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="flex items-center px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: 'var(--success-color)', color: 'var(--text-primary)' }}
                    onMouseEnter={(e) => {
                      if (!loading) e.currentTarget.style.opacity = '0.8';
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) e.currentTarget.style.opacity = '1';
                    }}
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
                    className="flex items-center px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}
                    onMouseEnter={(e) => {
                      if (!loading) e.currentTarget.style.opacity = '0.8';
                    }}
                    onMouseLeave={(e) => {
                      if (!loading) e.currentTarget.style.opacity = '1';
                    }}
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
            <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <h2 className="text-lg font-medium mb-6" style={{ color: 'var(--text-primary)' }}>Personal Information</h2>
              
              <div className="space-y-6">
                {/* Name */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Full Name
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:outline-none"
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-color)';
                        e.currentTarget.style.boxShadow = `0 0 0 2px var(--accent-color)20`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      placeholder="Enter your full name"
                    />
                  ) : (
                    <div className="flex items-center p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      <User className="h-5 w-5 mr-3" style={{ color: 'var(--text-secondary)' }} />
                      <span style={{ color: 'var(--text-primary)' }}>{profileData.name || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Email Address
                  </label>
                  {isEditing ? (
                    <input
                      type="email"
                      value={profileData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:outline-none"
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-color)';
                        e.currentTarget.style.boxShadow = `0 0 0 2px var(--accent-color)20`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      placeholder="Enter your email address"
                    />
                  ) : (
                    <div className="flex items-center p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      <Mail className="h-5 w-5 mr-3" style={{ color: 'var(--text-secondary)' }} />
                      <span style={{ color: 'var(--text-primary)' }}>{profileData.email || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Phone Number
                  </label>
                  {isEditing ? (
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:outline-none"
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-color)';
                        e.currentTarget.style.boxShadow = `0 0 0 2px var(--accent-color)20`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      placeholder="Enter your phone number"
                    />
                  ) : (
                    <div className="flex items-center p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      <Phone className="h-5 w-5 mr-3" style={{ color: 'var(--text-secondary)' }} />
                      <span style={{ color: 'var(--text-primary)' }}>{profileData.phone || 'Not provided'}</span>
                    </div>
                  )}
                </div>

                {/* Address */}
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                    Address
                  </label>
                  {isEditing ? (
                    <textarea
                      value={profileData.address}
                      onChange={(e) => handleInputChange('address', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 rounded-lg focus:ring-2 focus:outline-none"
                      style={{
                        backgroundColor: 'var(--bg-tertiary)',
                        border: '1px solid var(--border-color)',
                        color: 'var(--text-primary)'
                      }}
                      onFocus={(e) => {
                        e.currentTarget.style.borderColor = 'var(--accent-color)';
                        e.currentTarget.style.boxShadow = `0 0 0 2px var(--accent-color)20`;
                      }}
                      onBlur={(e) => {
                        e.currentTarget.style.borderColor = 'var(--border-color)';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                      placeholder="Enter your address"
                    />
                  ) : (
                    <div className="flex items-start p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
                      <MapPin className="h-5 w-5 mr-3 mt-0.5" style={{ color: 'var(--text-secondary)' }} />
                      <span style={{ color: 'var(--text-primary)' }}>{profileData.address || 'Not provided'}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Account Summary */}
          <div className="space-y-6">
            {/* Account Status */}
            <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Account Status</h3>
              
              <div className="space-y-4">
                {/* Role */}
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Role</span>
                  <div className="flex items-center">
                    <Shield className="h-4 w-4 mr-2" style={{ color: 'var(--accent-color)' }} />
                    <span className="text-sm font-medium capitalize" style={{ color: 'var(--text-primary)' }}>
                      {userProfile.role}
                    </span>
                  </div>
                </div>

                {/* Member Since */}
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Member Since</span>
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2" style={{ color: 'var(--text-secondary)' }} />
                    <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                      {format(new Date(userProfile.created_at), 'MMM yyyy')}
                    </span>
                  </div>
                </div>

                {/* Subscription Status */}
                {userProfile.role === 'student' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Subscription</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full border ${
                        getSubscriptionStatusColor(userProfile.subscription_status || 'inactive')
                      }`}>
                        {userProfile.subscription_status || 'inactive'}
                      </span>
                    </div>
                    
                    {userProfile.subscription_type && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Type</span>
                        <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                          {getSubscriptionTypeDisplay(userProfile.subscription_type)}
                        </span>
                      </div>
                    )}
                    
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Type</span>
                      <span className="text-sm capitalize" style={{ color: 'var(--text-primary)' }}>
                        {userProfile.subscription_type}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions */}
            {userProfile.role === 'student' && (
              <div className="rounded-xl shadow-sm p-6" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <h3 className="text-lg font-medium mb-4" style={{ color: 'var(--text-primary)' }}>Quick Actions</h3>
                
                <div className="space-y-3">
                  <Link
                    to="/scan"
                    className="block w-full text-center px-4 py-2 rounded-lg transition-colors"
                    style={{ 
                      backgroundColor: 'var(--bg-tertiary)', 
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--accent-color)';
                      e.currentTarget.style.color = 'white';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                  >
                    QR Scanner
                  </Link>
                  
                  <Link
                    to="/subscription"
                    className="block w-full text-center px-4 py-2 rounded-lg transition-colors"
                    style={{ 
                      backgroundColor: 'var(--success-bg)', 
                      color: 'white'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    Manage Subscription
                  </Link>
                  
                  <Link
                    to="/attendance"
                    className="block w-full text-center px-4 py-2 rounded-lg transition-colors"
                    style={{ 
                      backgroundColor: 'var(--accent-color)', 
                      color: 'white'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
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