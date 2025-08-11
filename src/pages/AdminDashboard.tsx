import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'sonner';
import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import OverviewScreen from '../components/screens/OverviewScreen';
import AnalyticsScreen from '../components/screens/AnalyticsScreen';
import AdminManagementScreen from '../components/screens/AdminManagementScreen';
import AdminManagement from '../components/AdminManagement';
import QRScannerScreen from '../components/screens/QRScannerScreen';
import PendingUsersScreen from '../components/screens/PendingUsersScreen';
import UserVerificationPanel from '../components/UserVerificationPanel';
import AdminInvitePanel from '../components/AdminInvitePanel';
import { AdminUser, AttendanceRecord, DashboardStats, AnalyticsData, SubscriptionBreakdown, QRScanResult, RecentScan, SystemAlert, ActiveView } from '../types/dashboard';
import { format } from 'date-fns';

const AdminDashboard = () => {
  console.log('🔍 AdminDashboard: Component starting to render');
  
  const navigate = useNavigate();
  const location = useLocation();
  const { signOut, user, userProfile } = useAuthStore();
  
  console.log('🔍 AdminDashboard: User profile from store:', userProfile);

  // Initialize logging hooks
  // Initialize logging functions as empty stubs until logger is implemented
  const logClick = (action: string, data?: any) => console.log('Click:', action, data);
  const logAction = (action: string, data?: any) => console.log('Action:', action, data);
  const logError = (error: string, data?: any) => console.error('Error:', error, data);
  const logInfo = (info: string, data?: any) => console.info('Info:', info, data);
  const logUserInteraction = (category: string, element: string, data?: any) => 
    console.log('User Interaction:', category, element, data);
// Temporarily stub out auth logging until logger is implemented
const logAuthAction = (action: string, data?: any) => console.log('Auth:', action, data);
// Temporarily stub out navigation logging until logger is implemented
const logNavigate = (path: string) => console.log('Navigation:', path);

  // State management
  console.log('🔍 AdminDashboard: Initializing state');
  
  // Determine initial view based on URL path with security validation
  const getInitialView = (): ActiveView => {
    const path = location.pathname;
    
    // Security: Only allow valid admin paths
     const validPaths: Record<string, ActiveView> = {
       '/admin': 'overview',
       '/admin/pending-users': 'pending-users',
       '/admin/analytics': 'analytics',
       '/admin/admin-management': 'admin-management',
       '/admin/qr-scanner': 'qr-scanner'
     };
    
    // Check if current path is valid
    if (validPaths[path]) {
      return validPaths[path];
    }
    
    // Security: If invalid path, redirect to overview and log potential attack
    if (path.startsWith('/admin/')) {
      console.warn('🚨 Security: Invalid admin path detected:', path);
      logError('invalid_admin_path_access', { 
        path, 
        userId: userProfile?.id,
        timestamp: new Date().toISOString()
      });
      // Redirect to safe default
      navigate('/admin', { replace: true });
    }
    
    return 'overview';
  };
  
  const [activeView, setActiveView] = useState<ActiveView>(getInitialView());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  console.log('🔍 AdminDashboard: State initialized - activeView:', activeView, 'loading:', loading);

  // Sync activeView with URL changes
  useEffect(() => {
    const newView = getInitialView();
    if (newView !== activeView) {
      setActiveView(newView);
    }
  }, [location.pathname]);

  // Log component mount and show welcome message (only once per session)
  useEffect(() => {
    logInfo('AdminDashboard mounted', { 
      userId: userProfile?.id, 
      userRole: userProfile?.role,
      initialView: activeView,
      currentPath: location.pathname
    });
    
    // Show welcome message for admin users (only once per session)
    if (userProfile && userProfile.role === 'admin') {
      const welcomeShown = sessionStorage.getItem(`welcome_shown_${userProfile.id}`);
      if (!welcomeShown) {
        toast.success(`Welcome back, ${userProfile.name || 'Admin'}!`);
        sessionStorage.setItem(`welcome_shown_${userProfile.id}`, 'true');
      }
    }
  }, [userProfile, logInfo]);

  // Dashboard data states
  const [stats, setStats] = useState<DashboardStats>({
    totalAdmins: 3,
    systemUptime: 99.8,
    todayLogins: 12,
    activeUsers: 8
  });

  const [admins, setAdmins] = useState<AdminUser[]>([
    {
      id: '1',
      name: 'HASHIM HAMEEM',
      email: 'admin@test.com',
      phone: '+1234567890',
      role: 'admin',
      status: 'verified',
      created_at: '2024-01-01T00:00:00Z'
    },
    {
      id: '2',
      name: 'John Smith',
      email: 'john@admin.com',
      phone: '+1234567891',
      role: 'admin',
      status: 'verified',
      created_at: '2024-01-15T00:00:00Z'
    },
    {
      id: '3',
      name: 'Sarah Johnson',
      email: 'sarah@admin.com',
      phone: '+1234567892',
      role: 'admin',
      status: 'verified',
      created_at: '2024-02-01T00:00:00Z'
    }
  ]);

  const [analyticsData, setAnalyticsData] = useState<AnalyticsData[]>([
    { date: '2024-01-01', visits: 120, hours: 8.5, revenue: 450 },
    { date: '2024-01-02', visits: 135, hours: 9.2, revenue: 520 },
    { date: '2024-01-03', visits: 98, hours: 7.1, revenue: 380 },
    { date: '2024-01-04', visits: 167, hours: 10.8, revenue: 680 },
    { date: '2024-01-05', visits: 142, hours: 8.9, revenue: 590 }
  ]);

  const [subscriptionBreakdown, setSubscriptionBreakdown] = useState<SubscriptionBreakdown[]>([
    { type: 'Basic', count: 45, revenue: 2250, color: 'var(--accent-color)' },
    { type: 'Pro', count: 28, revenue: 4200, color: 'var(--success-color)' },
    { type: 'Premium', count: 12, revenue: 3600, color: 'var(--warning-color)' }
  ]);

  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([
    {
      id: '1',
      type: 'warning',
      message: 'Server load is above 80%',
      timestamp: new Date().toISOString(),
      read: false
    },
    {
      id: '2',
      type: 'info',
      message: 'System backup completed successfully',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      read: false
    }
  ]);

  // QR Scanner states
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<QRScanResult | null>(null);
  const [recentScans, setRecentScans] = useState<RecentScan[]>([
    {
      id: '1',
      userId: 'user123',
      userName: 'John Doe',
      timestamp: new Date().toISOString(),
      location: 'Main Entrance',
      status: 'success',
      result: 'granted'
    },
    {
      id: '2',
      userId: 'user456',
      userName: 'Jane Smith',
      timestamp: new Date(Date.now() - 1800000).toISOString(),
      location: 'Side Door',
      status: 'success',
      result: 'granted'
    }
  ]);

  // Admin management states
  const [showAddAdminModal, setShowAddAdminModal] = useState(false);
  const [showEditAdminModal, setShowEditAdminModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [newAdmin, setNewAdmin] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'admin' as const
  });

  // Effects
  useEffect(() => {
    fetchDashboardData();
    
    let interval: NodeJS.Timeout;
    if (autoRefresh) {
      interval = setInterval(() => {
        fetchDashboardData();
        setLastUpdated(new Date());
      }, 120000); // Changed from 30 seconds to 2 minutes
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [autoRefresh]);

  // Functions
  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const toggleAutoRefresh = () => {
    const newAutoRefresh = !autoRefresh;
    setAutoRefresh(newAutoRefresh);
    logClick('toggle_auto_refresh', { enabled: newAutoRefresh });
    logAction('auto_refresh_toggled', { enabled: newAutoRefresh });
    toast.success(`Auto refresh ${newAutoRefresh ? 'enabled' : 'disabled'}`);
  };

  const handleLogout = async () => {
    logClick('logout_button');
    logAuthAction('logout_attempt', { userId: userProfile?.id });
    
    try {
      await signOut();
      logNavigate('/login');
      navigate('/login');
      toast.success('Logged out successfully');
      logAuthAction('logout_success', { userId: userProfile?.id });
    } catch (error: any) {
      logError('logout_error', { error: error.message, userId: userProfile?.id });
      console.error('Logout error:', error);
      toast.error('Failed to logout');
    }
  };

  const handleProfileClick = () => {
    logClick('profile_click');
    logUserInteraction('navigation', 'profile_button', {
      action: 'profile_click',
      userId: userProfile?.id
    });
    // Switch to admin management view with proper URL update
    handleViewChange('admin-management');
  };

  // QR Scanner functions
  const startScanning = () => {
    setIsScanning(true);
    setScanResult(null);
    toast.info('QR Scanner started');
    
    // Simulate scan result after 3 seconds
    setTimeout(() => {
      setScanResult({
        isValid: true,
        timestamp: new Date().toISOString(),
        userInfo: {
          id: 'user789',
          name: 'Alice Johnson',
          memberSince: '2023-06-15'
        }
      });
      setIsScanning(false);
    }, 3000);
  };

  const stopScanning = () => {
    setIsScanning(false);
    toast.info('QR Scanner stopped');
  };

  const clearScanResult = () => {
    setScanResult(null);
  };

  const exportAttendance = () => {
    try {
      // Mock export functionality
      const csvData = recentScans.map(scan => ({
        userId: scan.userId,
        userName: scan.userName,
        timestamp: scan.timestamp,
        location: scan.location,
        status: scan.status,
        result: scan.result
      }));
      
      const csvContent = [
        'User ID,User Name,Timestamp,Location,Status,Result',
        ...csvData.map(row => 
          `${row.userId},${row.userName},${row.timestamp},${row.location},${row.status},${row.result}`
        )
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `attendance_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      toast.success('Attendance data exported successfully');
    } catch (error) {
      toast.error('Failed to export attendance data');
    }
  };

  // Admin management functions
  const handleAddAdmin = async () => {
    if (!newAdmin.name || !newAdmin.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    const adminToAdd: AdminUser = {
      id: Date.now().toString(),
      name: newAdmin.name,
      email: newAdmin.email,
      phone: newAdmin.phone,
      role: 'admin',
      status: 'verified',
      created_at: new Date().toISOString()
    };

    setAdmins(prev => [...prev, adminToAdd]);
    setStats(prev => ({ ...prev, totalAdmins: prev.totalAdmins + 1 }));
    setNewAdmin({ name: '', email: '', phone: '', role: 'admin' });
    setShowAddAdminModal(false);
    toast.success('Admin added successfully');
  };

  const handleUpdateAdmin = async () => {
    if (!selectedAdmin) return;

    setAdmins(prev => prev.map(admin => 
      admin.id === selectedAdmin.id ? selectedAdmin : admin
    ));
    setShowEditAdminModal(false);
    setSelectedAdmin(null);
    toast.success('Admin updated successfully');
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (window.confirm('Are you sure you want to delete this admin?')) {
      setAdmins(prev => prev.filter(admin => admin.id !== adminId));
      setStats(prev => ({ ...prev, totalAdmins: prev.totalAdmins - 1 }));
      toast.success('Admin deleted successfully');
    }
  };

  const dismissAlert = (alertId: string) => {
    setSystemAlerts(prev => prev.filter(alert => alert.id !== alertId));
  };

  // Get screen title
  const getScreenTitle = () => {
    switch (activeView) {
      case 'overview': return 'Dashboard Overview';
      case 'analytics': return 'Analytics & Reports';
      case 'admin-management': return 'Admin Management';
      case 'qr-scanner': return 'QR Code Scanner';
      case 'pending-users': return 'Pending Users';
      default: return 'Dashboard';
    }
  };

  // Enhanced setActiveView with URL synchronization and logging
  const handleViewChange = (view: ActiveView) => {
    const previousView = activeView;
    setActiveView(view);
    
    // Update URL to match the view
     const urlMap: Record<ActiveView, string> = {
       'overview': '/admin',
       'pending-users': '/admin/pending-users',
       'analytics': '/admin/analytics',
       'admins': '/admin/admin-management',
       'admin-management': '/admin/admin-management',
       'qr-scanner': '/admin/qr-scanner'
     };
    
    const newUrl = urlMap[view];
    if (newUrl && location.pathname !== newUrl) {
      navigate(newUrl, { replace: true });
    }
    
    logClick('navigation_menu_item', { from: previousView, to: view });
    logAction('view_changed', { 
      previousView, 
      newView: view, 
      screenTitle: getScreenTitle(),
      url: newUrl
    });
    logUserInteraction('navigation', 'sidebar_menu', { 
      action: 'view_change',
      from: previousView,
      to: view,
      url: newUrl
    });
  };

  // Mobile menu handlers
  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
    logClick('mobile_menu_toggle', { isOpen: !isMobileMenuOpen });
  };

  const handleMobileMenuClose = () => {
    setIsMobileMenuOpen(false);
    logClick('mobile_menu_close');
  };

  // Render active screen
  const renderActiveScreen = () => {
    console.log('🔍 AdminDashboard: renderActiveScreen called with activeView:', activeView);
    
    try {
      switch (activeView) {
        case 'overview':
          console.log('🔍 AdminDashboard: Rendering OverviewScreen with stats:', stats);
          return (
            <OverviewScreen
              stats={stats}
              analyticsData={analyticsData}
              subscriptionBreakdown={subscriptionBreakdown}
              setShowVerificationPanel={setShowAddAdminModal}
              exportAttendance={exportAttendance}
            />
          );
        case 'analytics':
          console.log('🔍 AdminDashboard: Rendering AnalyticsScreen');
          return <AnalyticsScreen />;
        case 'admin-management':
          console.log('🔍 AdminDashboard: Rendering AdminManagement');
          return <AdminManagement />;
        case 'qr-scanner':
          console.log('🔍 AdminDashboard: Rendering QRScannerScreen');
          return <QRScannerScreen />;
        case 'pending-users':
          console.log('🔍 AdminDashboard: Rendering PendingUsersScreen');
          return <PendingUsersScreen />;
        default:
          console.log('🔍 AdminDashboard: No matching view, returning null');
          return null;
      }
    } catch (error) {
      console.error('🚨 AdminDashboard: Error in renderActiveScreen:', error);
      return <div className="p-4" style={{color: 'var(--error-color)'}}>Error rendering screen: {error.message}</div>;
    }
  };

  console.log('🔍 AdminDashboard: About to render main component');
  console.log('🔍 AdminDashboard: Current state - activeView:', activeView, 'loading:', loading);
  
  try {
    const screenContent = renderActiveScreen();
    console.log('🔍 AdminDashboard: Screen content rendered:', screenContent ? 'Success' : 'Null/Empty');
    
    // Temporary fallback for debugging
    if (!screenContent) {
      console.warn('🔍 AdminDashboard: No screen content, showing fallback');
      return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black text-gray-900 dark:text-white">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Dashboard Loading...</h1>
            <p className="mb-4">Active View: {activeView}</p>
            <p className="text-sm" style={{color: 'var(--text-muted)'}}>Debug: Screen content is null/empty</p>
          </div>
        </div>
      );
    }
    
    return (
      <div className="min-h-screen flex flex-col bg-white dark:bg-black text-gray-900 dark:text-white">
        <div className="flex flex-1 relative">
          {/* Sidebar */}
          <Sidebar 
            activeView={activeView} 
            setActiveView={handleViewChange}
            isMobileOpen={isMobileMenuOpen}
            onMobileClose={handleMobileMenuClose}
          />
          
          {/* Main Content */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Header */}
            <Header
              title={getScreenTitle()}
              lastUpdated={lastUpdated}
              autoRefresh={autoRefresh}
              toggleAutoRefresh={toggleAutoRefresh}
              onLogout={handleLogout}
              user={userProfile ? {
                name: userProfile.name,
                email: userProfile.email
              } : undefined}
              onProfileClick={handleProfileClick}
              onMobileMenuToggle={handleMobileMenuToggle}
            />
            
            {/* Content Area */}
            <div className="flex-1 p-4 md:p-6 overflow-y-auto">
              {screenContent}
            </div>
          </div>
        </div>
        
        {/* Global Footer */}
        <div className="py-4" style={{backgroundColor: 'var(--sidebar-bg)'}}>
          <div className="text-center">
            <div className="text-xs" style={{color: 'var(--text-muted)'}}>scnz.</div>
          </div>
        </div>
        
        {/* Add Admin Modal */}
        {showAddAdminModal && (
          <AdminInvitePanel onClose={() => setShowAddAdminModal(false)} />
        )}
      </div>
    );
  } catch (error) {
    console.error('🚨 AdminDashboard: Critical error in main render:', error);
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-600 text-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Dashboard Error</h1>
          <p className="mb-4">Something went wrong while loading the dashboard.</p>
          <p className="text-sm" style={{color: 'var(--text-muted)'}}>{error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-4 px-4 py-2 rounded transition-colors bg-blue-600 hover:bg-blue-700 text-white"
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-hover)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--accent-primary)';
            }}
          >
            Reload Page
          </button>

        </div>
      </div>
    );
  }
};

export default AdminDashboard;

