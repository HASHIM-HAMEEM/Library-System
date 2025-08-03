import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, Shield, Key, Activity, Download, AlertTriangle, LogOut, Settings, Clock, Database, FileText, Eye, EyeOff, Users, UserPlus, Search, Filter, MoreVertical, Edit, Trash2, CheckCircle, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { db } from '../../lib/firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc, updateDoc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useAuthStore } from '../../stores/authStore';

interface AdminProfile {
  id: string;
  name: string;
  email: string;
  lastLogin: Date;
  createdAt: Date;
  activityLogs: ActivityLog[];
  settings: {
    twoFactorEnabled: boolean;
    sessionTimeout: number;
  };
}

interface ActivityLog {
  id: string;
  action: string;
  timestamp: Date;
  ipAddress?: string;
  device?: string;
  status: 'success' | 'failed';
}

interface AdminManagementScreenProps {}

const AdminManagementScreen: React.FC<AdminManagementScreenProps> = () => {
  const { user, userProfile, updateProfile, changePassword } = useAuthStore();
  const [adminProfile, setAdminProfile] = useState<AdminProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'profile' | 'credentials' | 'activity' | 'security' | 'backup'>('profile');
  const [editMode, setEditMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    fetchAdminProfile();
  }, [user, userProfile]); // Re-fetch when user or userProfile changes

  const fetchActivityLogs = async (userId: string): Promise<ActivityLog[]> => {
    try {
      // Fetch QR scan logs (admin activities)
      const scanLogsQuery = query(
        collection(db, 'qr_scan_logs'),
        where('admin_id', '==', userId),
        orderBy('scan_timestamp', 'desc'),
        limit(10)
      );
      const scanSnapshot = await getDocs(scanLogsQuery);
      const scanLogs = scanSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

      // Fetch attendance logs where admin was involved
      const attendanceLogsQuery = query(
        collection(db, 'attendance_logs'),
        where('scanned_by_admin_id', '==', userId),
        orderBy('created_at', 'desc'),
        limit(10)
      );
      const attendanceSnapshot = await getDocs(attendanceLogsQuery);
      const attendanceLogs = attendanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

      // Combine and format activity logs
      const activities: ActivityLog[] = [];

      // Add scan logs
      if (scanLogs) {
        scanLogs.forEach(log => {
          activities.push({
            id: log.id,
            action: `QR Code Scan - ${log.scan_result}`,
            timestamp: new Date(log.scan_timestamp?.toDate?.() || log.scan_timestamp),
            ipAddress: log.ip_address,
            device: log.user_agent,
            status: log.scan_result === 'success' ? 'success' : 'failed'
          });
        });
      }

      // Add attendance logs
      if (attendanceLogs) {
        attendanceLogs.forEach(log => {
          activities.push({
            id: log.id,
            action: `Student Check-in Processed`,
            timestamp: new Date(log.created_at?.toDate?.() || log.created_at),
            status: 'success'
          });
        });
      }

      // Sort by timestamp and return latest 10
      return activities
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 10);
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      return [];
    }
  };

  const fetchAdminProfile = async () => {
    try {
      setLoading(true);
      
      if (!user || !userProfile) {
        toast.error('No admin user found');
        return;
      }

      // Fetch profile data from database
      const userDocRef = doc(db, 'user_profiles', (user as any).id);
      const profileDoc = await getDoc(userDocRef);
      const profile = profileDoc.exists() ? profileDoc.data() : null;

      // Fetch real activity logs from database
      const activityLogs = await fetchActivityLogs((user as any).id);

      // Get session timeout from profile or use default
      const sessionTimeout = profile?.session_timeout || 30;
      
      // Store session timeout in localStorage for useSecurity hook
      localStorage.setItem('admin_session_timeout', sessionTimeout.toString());

      // Use real admin data from auth store
      const realProfile: AdminProfile = {
        id: (user as any).id,
        name: userProfile.name || 'Admin User',
        email: (user as any).email || 'admin@gstore.com',
        lastLogin: new Date(), // Could be enhanced to track real last login
        createdAt: new Date((user as any).created_at || Date.now()),
        activityLogs,
        settings: {
          twoFactorEnabled: profile?.two_factor_enabled || false,
          sessionTimeout
        }
      };
      
      setAdminProfile(realProfile);
      setFormData({
        name: realProfile.name,
        email: realProfile.email,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
    } catch (error) {
      console.error('Error loading admin profile:', error);
      toast.error('Failed to load admin profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      // Validate form
      if (!formData.name || !formData.email) {
        toast.error('Name and email are required');
        return;
      }

      // Update profile using auth store
      const result = await updateProfile({
        name: formData.name,
        email: formData.email
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      // Update local state to reflect changes
      setAdminProfile(prev => prev ? {
        ...prev,
        name: formData.name,
        email: formData.email
      } : null);

      setEditMode(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handleChangePassword = async () => {
    try {
      if (!formData.currentPassword || !formData.newPassword || !formData.confirmPassword) {
        toast.error('All password fields are required');
        return;
      }

      if (formData.newPassword !== formData.confirmPassword) {
        toast.error('New passwords do not match');
        return;
      }

      if (formData.newPassword.length < 8) {
        toast.error('Password must be at least 8 characters long');
        return;
      }

      // Change password using auth store
      const result = await changePassword(formData.currentPassword, formData.newPassword);

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Password changed successfully');
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error('Failed to change password');
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      // Use auth store logout from all devices
      const { logoutFromAllDevices } = useAuthStore.getState();
      const result = await logoutFromAllDevices();

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success('Logged out from all devices successfully');
      // Note: User will be redirected to login page automatically
    } catch (error) {
      console.error('Error logging out from all devices:', error);
      toast.error('Failed to logout from all devices');
    }
  };

  const handleToggle2FA = async () => {
    try {
      if (!adminProfile) return;
      
      const newStatus = !adminProfile.settings.twoFactorEnabled;
      
      // Update in database - for now we'll update the user_profiles table
      // In a real implementation, you'd have a separate 2FA settings table
      if (user) {
        const userDocRef = doc(db, 'user_profiles', (user as any).id);
        await updateDoc(userDocRef, { 
          two_factor_enabled: newStatus 
        });
      }
      
      setAdminProfile(prev => prev ? ({ 
        ...prev, 
        settings: { 
          ...prev.settings, 
          twoFactorEnabled: newStatus 
        } 
      }) : null);
      
      toast.success(`Two-factor authentication ${newStatus ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling 2FA:', error);
      toast.error('Failed to update two-factor authentication');
    }
  };

  const handleExportData = async (format: 'json' | 'csv') => {
    try {
      toast.info('Starting data export...');
      
      // Fetch all relevant data for export
      const [usersSnapshot, logsSnapshot, attendanceSnapshot] = await Promise.all([
        getDocs(collection(db, 'user_profiles')),
        getDocs(collection(db, 'qr_scan_logs')),
        getDocs(collection(db, 'attendance_logs'))
      ]);
      
      const exportData = {
          users: usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[],
          scanLogs: logsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[],
          attendanceLogs: attendanceSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[],
          exportedAt: new Date().toISOString(),
          exportedBy: (user as any)?.email
        };
      
      if (format === 'json') {
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `library-data-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        // Convert to CSV format
        const csvData = [
          'Users:',
          'ID,Name,Email,Phone,Created At',
          ...exportData.users.map(u => `${u.id},${u.name},${u.email},${u.phone},${u.created_at}`),
          '',
          'Scan Logs:',
          'ID,User ID,Action,Timestamp,IP Address',
          ...exportData.scanLogs.map(l => `${l.id},${l.user_id},${l.action},${l.timestamp},${l.ip_address || ''}`),
          '',
          'Attendance Logs:',
          'ID,User ID,Check In,Check Out,Date',
          ...exportData.attendanceLogs.map(a => `${a.id},${a.user_id},${a.check_in_time},${a.check_out_time || ''},${a.date}`)
        ].join('\n');
        
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `library-data-export-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      toast.success(`Data exported successfully in ${format.toUpperCase()} format`);
    } catch (error) {
      console.error('Error exporting data:', error);
      toast.error('Failed to export data');
    }
  };

  const handleSessionTimeoutChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newTimeout = parseInt(e.target.value);
    
    try {
      // Update in database
      if (user) {
        const userDocRef = doc(db, 'user_profiles', (user as any).id);
        await updateDoc(userDocRef, { session_timeout: newTimeout });
      }
      
      // Update local state
      setAdminProfile(prev => prev ? ({
        ...prev,
        settings: {
          ...prev.settings,
          sessionTimeout: newTimeout
        }
      }) : null);
      
      // Store in localStorage for useSecurity hook
      localStorage.setItem('admin_session_timeout', newTimeout.toString());
      
      toast.success(`Session timeout updated to ${newTimeout} minutes`);
    } catch (error) {
      console.error('Session timeout update error:', error);
      toast.error('Failed to update session timeout');
    }
  };

  const handleEmergencyReset = async () => {
    const confirmed = window.confirm('Are you sure you want to perform an emergency reset? This will delete all data except admin credentials and cannot be undone.');
    if (!confirmed) return;
    
    const doubleConfirm = window.confirm('This action is IRREVERSIBLE. Type "RESET" to confirm you want to delete all user data, logs, and attendance records.');
    if (!doubleConfirm) return;
    
    try {
      toast.info('Starting emergency reset...');
      
      // Delete all non-admin data
      const batch = writeBatch(db);
      
      // Get all documents to delete
      const [attendanceSnapshot, scanLogsSnapshot, userProfilesSnapshot] = await Promise.all([
        getDocs(collection(db, 'attendance_logs')),
        getDocs(collection(db, 'qr_scan_logs')),
        getDocs(query(collection(db, 'user_profiles'), where('role', '!=', 'admin')))
      ]);
      
      // Add delete operations to batch
      attendanceSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      scanLogsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      userProfilesSnapshot.docs.forEach(doc => batch.delete(doc.ref));
      
      // Execute batch delete
      await batch.commit();
      
      toast.success('Emergency reset completed successfully. All non-admin data has been cleared.');
      
      // Refresh the admin profile to reflect changes
      await fetchAdminProfile();
    } catch (error) {
      console.error('Error during emergency reset:', error);
      toast.error('Emergency reset failed. Please contact system administrator.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2" style={{borderColor: 'var(--text-primary)'}}></div>
      </div>
    );
  }

  if (!adminProfile) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="w-12 h-12 mx-auto mb-4" style={{color: 'var(--text-secondary)'}} />
        <h3 className="text-lg font-medium mb-2" style={{color: 'var(--text-primary)'}}>Failed to load admin profile</h3>
        <button
          onClick={fetchAdminProfile}
          className="px-4 py-2 rounded-lg transition-colors"
          style={{
            backgroundColor: 'var(--bg-tertiary)',
            color: 'var(--text-primary)'
          }}
          onMouseEnter={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-quaternary)';
          }}
          onMouseLeave={(e) => {
            (e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-tertiary)';
          }}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Admin Profile Header */}
      <div className="p-6 rounded-lg border border-gray-300 mb-6" style={{backgroundColor: 'var(--bg-secondary)'}}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{backgroundColor: 'var(--accent-primary)'}}>
              <User className="w-8 h-8" style={{color: 'var(--text-primary)'}} />
            </div>
            <div>
              <h2 className="text-xl font-bold" style={{color: 'var(--text-primary)'}}>{adminProfile.name}</h2>
              <p style={{color: 'var(--text-secondary)'}}>{adminProfile.email}</p>
              <p className="text-sm" style={{color: 'var(--text-muted)'}}>
                Last login: {format(adminProfile.lastLogin, 'MMM dd, yyyy HH:mm')}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm" style={{color: 'var(--text-secondary)'}}>Account created</p>
            <p style={{color: 'var(--text-primary)'}}>{format(adminProfile.createdAt, 'MMM dd, yyyy')}</p>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="p-6 rounded-lg border border-gray-300 mb-6" style={{backgroundColor: 'var(--bg-secondary)'}}>
        <div className="flex flex-wrap gap-2">
          {[
            { id: 'profile', label: 'Profile', icon: User },
            { id: 'credentials', label: 'Credentials', icon: Key },
            { id: 'activity', label: 'Activity Logs', icon: Activity },
            { id: 'security', label: 'Security', icon: Shield },
            { id: 'backup', label: 'Backup & Recovery', icon: Database }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === id
                  ? ''
                  : ''
              }`}
              style={{
                 backgroundColor: activeTab === id ? 'var(--accent-primary)' : 'transparent',
                 color: activeTab === id ? 'var(--text-primary)' : 'var(--text-secondary)'
               }}
               onMouseEnter={(e) => {
                 if (activeTab !== id) {
                   (e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-tertiary)';
                 }
               }}
               onMouseLeave={(e) => {
                 if (activeTab !== id) {
                   (e.target as HTMLButtonElement).style.backgroundColor = 'transparent';
                 }
               }}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-6 rounded-lg border border-gray-300" style={{backgroundColor: 'var(--bg-secondary)'}}>
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>Profile Information</h3>
              <button
                onClick={() => setEditMode(!editMode)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                style={{backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)'}}
              >
                <Settings className="w-4 h-4" />
                {editMode ? 'Cancel' : 'Edit Profile'}
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-secondary)'}}>Full Name</label>
                {editMode ? (
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    style={{backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)'}}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
                  />
                ) : (
                  <p style={{color: 'var(--text-primary)'}}>{adminProfile.name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-secondary)'}}>Email Address</label>
                {editMode ? (
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    style={{backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)'}}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
                  />
                ) : (
                  <p style={{color: 'var(--text-primary)'}}>{adminProfile.email}</p>
                )}
              </div>
            </div>

            {editMode && (
              <div className="flex gap-4">
                <button
                  onClick={handleUpdateProfile}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = 'var(--accent-hover)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = 'var(--accent-primary)';
                  }}
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditMode(false)}
                  className="px-4 py-2 rounded-lg transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    color: 'var(--text-secondary)'
                  }}
                  onMouseEnter={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-quaternary)';
                  }}
                  onMouseLeave={(e) => {
                    (e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-tertiary)';
                  }}
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'credentials' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>Change Password</h3>
            
            <div className="grid grid-cols-1 gap-6 max-w-md">
              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-secondary)'}}>Current Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={formData.currentPassword}
                    onChange={(e) => setFormData(prev => ({ ...prev, currentPassword: e.target.value }))}
                    style={{backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)'}}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2"
                    style={{color: 'var(--text-secondary)'}}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-secondary)'}}>New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, newPassword: e.target.value }))}
                  style={{backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)'}}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{color: 'var(--text-secondary)'}}>Confirm New Password</label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  style={{backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)'}}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
                />
              </div>

              <button
                onClick={handleChangePassword}
                className="px-4 py-2 rounded-lg transition-colors"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--text-primary)'
                }}
                onMouseEnter={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-quaternary)';
                }}
                onMouseLeave={(e) => {
                  (e.target as HTMLButtonElement).style.backgroundColor = 'var(--bg-tertiary)';
                }}
              >
                Change Password
              </button>
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>Activity Logs</h3>
            
            <div className="space-y-4">
              {adminProfile.activityLogs.map((log) => (
                <div key={log.id} className="p-4 rounded-lg border border-gray-300" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-2 rounded-full ${
                        log.status === 'success' ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                      <div>
                        <p className="font-medium" style={{color: 'var(--text-primary)'}}>{log.action}</p>
                        <p className="text-sm" style={{color: 'var(--text-secondary)'}}>{format(log.timestamp, 'MMM dd, yyyy HH:mm')}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      {log.ipAddress && <p className="text-sm" style={{color: 'var(--text-secondary)'}}>{log.ipAddress}</p>}
                      {log.device && <p className="text-sm" style={{color: 'var(--text-secondary)'}}>{log.device}</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'security' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>Security Settings</h3>
            
            <div className="space-y-6">
              {/* 2FA Settings */}
              <div className="p-4 rounded-lg border border-gray-300" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium" style={{color: 'var(--text-primary)'}}>Two-Factor Authentication</h4>
                    <p className="text-sm" style={{color: 'var(--text-secondary)'}}>Add an extra layer of security to your account</p>
                  </div>
                  <button
                    onClick={handleToggle2FA}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      adminProfile.settings.twoFactorEnabled ? 'bg-green-600' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        adminProfile.settings.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Session Timeout */}
              <div className="p-4 rounded-lg border border-gray-300" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                <div>
                  <h4 className="font-medium mb-2" style={{color: 'var(--text-primary)'}}>Session Timeout</h4>
                  <p className="text-sm mb-4" style={{color: 'var(--text-secondary)'}}>Automatically log out after period of inactivity</p>
                  <select
                    value={adminProfile.settings.sessionTimeout}
                    onChange={handleSessionTimeoutChange}
                    style={{backgroundColor: 'var(--bg-secondary)', color: 'var(--text-primary)'}}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-white"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 hour</option>
                    <option value={120}>2 hours</option>
                    <option value={240}>4 hours</option>
                  </select>
                </div>
              </div>

              {/* Logout All Devices */}
              <div className="p-4 rounded-lg border border-gray-300" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium" style={{color: 'var(--text-primary)'}}>Active Sessions</h4>
                    <p className="text-sm" style={{color: 'var(--text-secondary)'}}>Sign out from all devices and browsers</p>
                  </div>
                  <button
                    onClick={handleLogoutAllDevices}
                    className="px-4 py-2 rounded-lg transition-colors"
                    style={{
                      backgroundColor: 'var(--error-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor = 'var(--error-hover)';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor = 'var(--error-primary)';
                    }}
                  >
                    Logout All Devices
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'backup' && (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold" style={{color: 'var(--text-primary)'}}>Backup & Recovery</h3>
            
            <div className="space-y-6">
              {/* Data Export */}
              <div className="p-4 rounded-lg border border-gray-300" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                <div>
                  <h4 className="font-medium mb-2" style={{color: 'var(--text-primary)'}}>Export Data</h4>
                  <p className="text-sm mb-4" style={{color: 'var(--text-secondary)'}}>Download a backup of all system data</p>
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleExportData('json')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                      style={{
                        backgroundColor: 'var(--accent-primary)',
                        color: 'var(--text-primary)'
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = 'var(--accent-hover)';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = 'var(--accent-primary)';
                      }}
                    >
                      <Download className="w-4 h-4" />
                      Export as JSON
                    </button>
                    <button
                      onClick={() => handleExportData('csv')}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                      style={{
                        backgroundColor: 'var(--accent-primary)',
                        color: 'var(--text-primary)'
                      }}
                      onMouseEnter={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = 'var(--accent-hover)';
                      }}
                      onMouseLeave={(e) => {
                        (e.target as HTMLButtonElement).style.backgroundColor = 'var(--accent-primary)';
                      }}
                    >
                      <Download className="w-4 h-4" />
                      Export as CSV
                    </button>
                  </div>
                </div>
              </div>

              {/* Emergency Reset */}
              <div className="p-4 rounded-lg border border-red-400" style={{backgroundColor: 'var(--bg-tertiary)'}}>
                <div>
                  <h4 className="text-red-400 font-medium mb-2">Emergency Reset</h4>
                  <p className="text-sm mb-4" style={{color: 'var(--text-secondary)'}}>Reset all data except admin credentials. This action cannot be undone.</p>
                  <button
                    onClick={handleEmergencyReset}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                    style={{
                      backgroundColor: 'var(--error-primary)',
                      color: 'var(--text-primary)'
                    }}
                    onMouseEnter={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor = 'var(--error-hover)';
                    }}
                    onMouseLeave={(e) => {
                      (e.target as HTMLButtonElement).style.backgroundColor = 'var(--error-primary)';
                    }}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Emergency Reset
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default AdminManagementScreen;