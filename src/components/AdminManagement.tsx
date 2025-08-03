import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, ShieldOff, Eye, EyeOff, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { AdminAuthService, AdminUser } from '../lib/adminAuth';
import { useAuthStore } from '../stores/authStore';
import LoadingSpinner from './LoadingSpinner';

interface AdminManagementProps {
  className?: string;
}

const AdminManagement: React.FC<AdminManagementProps> = ({ className = '' }) => {
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newAdminForm, setNewAdminForm] = useState({
    email: '',
    password: '',
    name: '',
    permissions: ['read', 'write'] as string[]
  });
  const [showPassword, setShowPassword] = useState(false);
  
  const { userProfile } = useAuthStore();
  
  // Available permissions
  const availablePermissions = [
    'read',
    'write', 
    'delete',
    'manage_users',
    'manage_settings',
    'view_logs',
    'export_data'
  ];
  
  useEffect(() => {
    loadAdmins();
  }, []);
  
  const loadAdmins = async () => {
    setLoading(true);
    try {
      const result = await AdminAuthService.getAllAdmins();
      if (result.success && result.users) {
        setAdmins(result.users);
      } else {
        toast.error('Failed to load admin users: ' + result.error);
      }
    } catch (error) {
      toast.error('Error loading admin users');
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newAdminForm.email || !newAdminForm.password || !newAdminForm.name) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    if (newAdminForm.password.length < 8) {
      toast.error('Password must be at least 8 characters long');
      return;
    }
    
    setActionLoading('create');
    
    try {
      const result = await AdminAuthService.createAdmin(
        newAdminForm.email,
        newAdminForm.password,
        newAdminForm.name,
        newAdminForm.permissions
      );
      
      if (result.success) {
        toast.success('Admin user created successfully');
        setNewAdminForm({ email: '', password: '', name: '', permissions: ['read', 'write'] });
        setShowCreateForm(false);
        await loadAdmins();
      } else {
        toast.error('Failed to create admin: ' + result.error);
      }
    } catch (error) {
      toast.error('Error creating admin user');
    } finally {
      setActionLoading(null);
    }
  };
  
  const handleToggleAdminStatus = async (adminId: string, currentStatus: string) => {
    if (adminId === userProfile?.id) {
      toast.error('You cannot deactivate your own account');
      return;
    }
    
    setActionLoading(adminId);
    
    try {
      const result = currentStatus === 'active' 
        ? await AdminAuthService.deactivateAdmin(adminId)
        : await AdminAuthService.activateAdmin(adminId);
      
      if (result.success) {
        toast.success(`Admin ${currentStatus === 'active' ? 'deactivated' : 'activated'} successfully`);
        await loadAdmins();
      } else {
        toast.error('Failed to update admin status: ' + result.error);
      }
    } catch (error) {
      toast.error('Error updating admin status');
    } finally {
      setActionLoading(null);
    }
  };
  
  const handlePermissionChange = (permission: string, checked: boolean) => {
    setNewAdminForm(prev => ({
      ...prev,
      permissions: checked 
        ? [...prev.permissions, permission]
        : prev.permissions.filter(p => p !== permission)
    }));
  };
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  return (
    <div className={`rounded-lg shadow-md p-6 ${className}`} style={{backgroundColor: '#000000'}}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="h-6 w-6 text-white" />
          <h2 className="text-xl font-semibold text-white">Admin Management</h2>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadAdmins}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
          <button
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="flex items-center gap-2 px-4 py-2 bg-white text-black rounded-md hover:bg-gray-200"
          >
            <UserPlus className="h-4 w-4" />
            Add Admin
          </button>
        </div>
      </div>
      
      {/* Create Admin Form */}
      {showCreateForm && (
        <div className="mb-6 p-4 rounded-lg border border-gray-300" style={{backgroundColor: '#000000'}}>
          <h3 className="text-lg font-medium text-white mb-4">Create New Admin</h3>
          <form onSubmit={handleCreateAdmin} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  value={newAdminForm.email}
                  onChange={(e) => setNewAdminForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white text-white"
                  style={{backgroundColor: '#000000'}}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={newAdminForm.name}
                  onChange={(e) => setNewAdminForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white text-white"
                  style={{backgroundColor: '#000000'}}
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Password *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={newAdminForm.password}
                  onChange={(e) => setNewAdminForm(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-white text-white" style={{backgroundColor: '#000000'}}
                  minLength={8}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Permissions
              </label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {availablePermissions.map((permission) => (
                  <label key={permission} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={newAdminForm.permissions.includes(permission)}
                      onChange={(e) => handlePermissionChange(permission, e.target.checked)}
                      className="rounded border-gray-300 text-white focus:ring-white"
                    />
                    <span className="text-sm text-gray-700 capitalize">
                      {permission.replace('_', ' ')}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={actionLoading === 'create'}
                className="px-4 py-2 bg-white text-black rounded-md hover:bg-gray-200 disabled:opacity-50 flex items-center gap-2"
              >
                {actionLoading === 'create' && <RefreshCw className="h-4 w-4 animate-spin" />}
                Create Admin
              </button>
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-black bg-white rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
      
      {/* Admin List */}
      <div className="space-y-4">
        {admins.length === 0 ? (
          <div className="text-center py-8 text-gray-300">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No admin users found</p>
          </div>
        ) : (
          admins.map((admin) => (
            <div key={admin.id} className="flex items-center justify-between p-4 border border-gray-600 rounded-lg" style={{backgroundColor: '#000000'}}>
              <div className="flex items-center gap-4">
                <div className={`p-2 rounded-full ${
                  admin.status === 'active' ? 'bg-white text-black' : 'bg-gray-600 text-white'
                }`}>
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-medium text-white">{admin.name}</h3>
                  <p className="text-sm text-gray-300">{admin.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      admin.status === 'active' 
                        ? 'bg-white text-black' 
                        : 'bg-gray-600 text-white'
                    }`}>
                      {admin.status}
                    </span>
                    {admin.permissions && (
                      <span className="text-xs text-gray-300">
                        {admin.permissions.length} permission(s)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                {admin.id !== userProfile?.id && (
                  <button
                    onClick={() => handleToggleAdminStatus(admin.id, admin.status)}
                    disabled={actionLoading === admin.id}
                    className={`flex items-center gap-2 px-3 py-2 text-sm rounded-md ${
                      admin.status === 'active'
                        ? 'bg-white text-black hover:bg-gray-200'
                        : 'bg-white text-black hover:bg-gray-200'
                    } disabled:opacity-50`}
                  >
                    {actionLoading === admin.id ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : admin.status === 'active' ? (
                      <ShieldOff className="h-4 w-4" />
                    ) : (
                      <Shield className="h-4 w-4" />
                    )}
                    {admin.status === 'active' ? 'Deactivate' : 'Activate'}
                  </button>
                )}
                
                {admin.id === userProfile?.id && (
                  <span className="px-3 py-2 text-sm text-black bg-white rounded-md">
                    Current User
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Summary */}
      <div className="mt-6 p-4 bg-gray-800 rounded-lg">
        <div className="flex items-center gap-2 text-white">
          <Shield className="h-5 w-5" />
          <span className="font-medium">Summary</span>
        </div>
        <div className="mt-2 text-sm text-gray-300">
          <p>Total Admins: {admins.length}</p>
          <p>Active: {admins.filter(a => a.status === 'active').length}</p>
          <p>Inactive: {admins.filter(a => a.status === 'inactive').length}</p>
        </div>
      </div>
    </div>
  );
};

export default AdminManagement;