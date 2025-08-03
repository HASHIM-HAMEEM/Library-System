import React, { useEffect } from 'react';
import { LogOut, User, ChevronDown, Menu } from 'lucide-react';
import { format } from 'date-fns';
import { useLogger, useAuthLogger } from '../hooks/useLogger';

interface HeaderProps {
  title: string;
  lastUpdated: Date;
  autoRefresh: boolean;
  toggleAutoRefresh: () => void;
  onLogout: () => void;
  user?: {
    name: string;
    email: string;
  };
  onProfileClick?: () => void;
  onMobileMenuToggle?: () => void;
}

const Header: React.FC<HeaderProps> = ({
  title,
  lastUpdated,
  autoRefresh,
  toggleAutoRefresh,
  onLogout,
  user,
  onProfileClick,
  onMobileMenuToggle
}) => {
  const [showProfileMenu, setShowProfileMenu] = React.useState(false);
  
  // Initialize logging hooks
  const { logClick, logAction, logInfo, logUserInteraction } = useLogger('Header');
  const { logAuthAction } = useAuthLogger('Header');
  
  // Log component mount
  useEffect(() => {
    logInfo('Header mounted', { title, autoRefresh });
  }, [logInfo]);
  
  // Log title changes
  useEffect(() => {
    logAction('title_updated', { title });
  }, [title, logAction]);
  
  // Log auto refresh state changes
  useEffect(() => {
    logAction('auto_refresh_state_changed', { autoRefresh });
  }, [autoRefresh, logAction]);

  return (
    <div className="bg-black">
      {/* Top Header - Mobile Menu Toggle and Profile Icon */}
      <div className="px-4 md:px-6 py-3 flex justify-between items-center">
        {/* Mobile Menu Toggle */}
        <button
          onClick={() => {
            logClick('mobile_menu_toggle');
            logUserInteraction('navigation', 'mobile_menu', {
              action: 'toggle'
            });
            if (onMobileMenuToggle) {
              onMobileMenuToggle();
            }
          }}
          className="mobile-menu-toggle md:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>
        
        {/* Profile Menu */}
        <div className="relative">
          <button
            onClick={() => {
              const newState = !showProfileMenu;
              logClick('profile_menu_toggle', { 
                previousState: showProfileMenu, 
                newState 
              });
              logUserInteraction('menu_toggle', 'profile_menu', {
                action: 'toggle',
                state: newState
              });
              setShowProfileMenu(newState);
            }}
            className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <User className="w-5 h-5" />
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 top-full mt-2 w-48 border border-gray-700 rounded-lg shadow-lg z-50" style={{backgroundColor: '#18181b'}}>
              <div className="p-3 border-b border-gray-700">
                <div className="text-white font-medium">{user?.name || 'Admin User'}</div>
                <div className="text-sm text-gray-400">{user?.email || 'admin@gstore.com'}</div>
              </div>
              
              <div className="py-2">
                <button 
                  onClick={() => {
                    logClick('profile_settings_button');
                    logUserInteraction('navigation', 'profile_menu', {
                      action: 'profile_settings_click'
                    });
                    setShowProfileMenu(false);
                    if (onProfileClick) {
                      onProfileClick();
                    }
                  }}
                  className="w-full text-left px-3 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-2"
                >
                  <User className="w-4 h-4" />
                  Profile Settings
                </button>
                

                
                <div className="border-t border-gray-700 mt-2 pt-2">
                  <button
                    onClick={() => {
                      logClick('logout_button_header');
                      logAuthAction('logout_initiated_from_header');
                      logUserInteraction('auth', 'logout_button', {
                        action: 'logout_click',
                        source: 'header_menu'
                      });
                      setShowProfileMenu(false);
                      onLogout();
                    }}
                    className="w-full text-left px-3 py-2 text-gray-400 hover:bg-gray-800 hover:text-white transition-colors flex items-center gap-2"
                  >
                    <LogOut className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Secondary Header - Title and Controls */}
      <div className="px-4 md:px-6 py-3 md:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          {/* Left side - Title and last updated */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h1 className="text-lg md:text-xl font-semibold text-white">{title}</h1>
            <div className="text-xs md:text-sm text-gray-400">
              Last updated: {format(lastUpdated, 'HH:mm:ss')}
            </div>
          </div>

          {/* Right side - Controls */}
          <div className="flex items-center gap-2 sm:gap-4">
            {/* Auto Refresh Toggle */}
            <button
              onClick={() => {
                logClick('auto_refresh_toggle_button', { 
                  currentState: autoRefresh,
                  newState: !autoRefresh
                });
                logUserInteraction('settings', 'auto_refresh_toggle', {
                  action: 'toggle',
                  from: autoRefresh,
                  to: !autoRefresh
                });
                toggleAutoRefresh();
              }}
              className={`px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                autoRefresh
                  ? 'bg-gray-700 text-white border border-gray-600'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              <span className="hidden sm:inline">Auto Refresh {autoRefresh ? 'ON' : 'OFF'}</span>
              <span className="sm:hidden">{autoRefresh ? 'Auto ON' : 'Auto OFF'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;