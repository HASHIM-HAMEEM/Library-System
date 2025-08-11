import React, { useEffect } from 'react';
import { BarChart3, Users, UserCheck, QrCode, Home, Activity } from 'lucide-react';
import { ActiveView } from '../types/dashboard';
import { useLogger, useNavigationLogger } from '../hooks/useLogger';

interface SidebarProps {
  activeView: ActiveView;
  setActiveView: (view: ActiveView) => void;
  isMobileOpen?: boolean;
  onMobileClose?: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, setActiveView, isMobileOpen = false, onMobileClose }) => {
  // Initialize logging hooks
  const { logClick, logAction, logInfo, logUserInteraction } = useLogger('Sidebar');
  const { logNavigate } = useNavigationLogger('Sidebar');
  
  // Log component mount
  useEffect(() => {
    logInfo('Sidebar mounted', { activeView });
  }, [logInfo]);
  
  // Log active view changes
  useEffect(() => {
    logAction('active_view_updated', { activeView });
  }, [activeView, logAction]);
  
  const navigationItems = [
    {
      id: 'overview' as ActiveView,
      label: 'Overview',
      icon: Home,
      description: 'Dashboard overview'
    },
    {
      id: 'analytics' as ActiveView,
      label: 'Analytics',
      icon: BarChart3,
      description: 'Data analytics'
    },
    {
      id: 'admin-management' as ActiveView,
      label: 'Admin Management',
      icon: Users,
      description: 'Manage admin users'
    },
    {
      id: 'qr-scanner' as ActiveView,
      label: 'QR Scanner',
      icon: QrCode,
      description: 'Scan QR codes'
    },
    {
      id: 'pending-users' as ActiveView,
      label: 'Pending Users',
      icon: UserCheck,
      description: 'User verification requests'
    }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div 
          className="mobile-overlay active md:hidden" 
          onClick={onMobileClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        w-64 h-full transition-transform duration-300 ease-in-out
        md:translate-x-0 md:static md:z-auto
        fixed top-0 left-0 z-[1000]
        bg-white dark:bg-black
        ${isMobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Logo/Brand */}
        <div className="p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center bg-white dark:bg-black border border-gray-200 dark:border-gray-700">
              <Activity className="w-4 h-4 md:w-5 md:h-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="font-bold text-base md:text-lg text-gray-900 dark:text-white">Library</h2>
              <p className="text-xs text-gray-700 dark:text-gray-300">fin.</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="px-3 md:px-4 mt-8 md:mt-16">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    logClick('sidebar_navigation_button', {
                      itemId: item.id,
                      itemLabel: item.label,
                      previousView: activeView,
                      newView: item.id,
                      isActive
                    });
                    logUserInteraction('navigation', 'sidebar_menu', {
                      action: 'menu_item_click',
                      from: activeView,
                      to: item.id,
                      label: item.label
                    });
                    logNavigate(item.id, {
                      source: 'sidebar',
                      label: item.label,
                      description: item.description
                    });
                    setActiveView(item.id);
                    // Close mobile menu after selection
                    if (onMobileClose) {
                      onMobileClose();
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 md:px-4 py-2 md:py-3 transition-colors text-left rounded-lg border border-gray-200 dark:border-gray-700 ${
                    isActive 
                      ? 'bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white' 
                      : 'bg-white dark:bg-black text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-900 hover:text-gray-900 dark:hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 md:w-5 md:h-5 flex-shrink-0" />
                  <div className="font-medium text-sm md:text-base">{item.label}</div>
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </>
  );
};

export default Sidebar;