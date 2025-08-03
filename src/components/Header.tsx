import React, { useEffect } from 'react';
import { LogOut, User, ChevronDown, Menu } from 'lucide-react';
import { format } from 'date-fns';
import { useLogger, useAuthLogger } from '../hooks/useLogger';
import { ThemeToggle } from './ThemeToggle';

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
    <div style={{ backgroundColor: 'var(--bg-primary)' }}>
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
        
        {/* Spacer for mobile to push profile to right */}
        <div className="flex-1 md:hidden"></div>
        
        {/* Right side controls */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Theme Toggle */}
          <ThemeToggle size="sm" className="border border-gray-600" />
          
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
            className="w-10 h-10 rounded-full flex items-center justify-center transition-colors"
            style={{
              backgroundColor: 'var(--bg-tertiary)',
              color: 'var(--text-secondary)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--text-primary)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--text-secondary)';
            }}
          >
            <User className="w-5 h-5" />
          </button>

          {/* Profile Dropdown */}
          {showProfileMenu && (
            <div 
              className="absolute right-0 top-full mt-2 w-48 rounded-lg shadow-lg z-50" 
              style={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                boxShadow: '0 10px 15px -3px var(--shadow-color)'
              }}
            >
              <div className="p-3" style={{ borderBottom: '1px solid var(--border-color)' }}>
                 <div className="font-medium" style={{ color: 'var(--text-primary)' }}>{user?.name || 'Admin User'}</div>
                 <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>{user?.email || 'admin@gstore.com'}</div>
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
                  className="w-full text-left px-3 py-2 transition-colors flex items-center gap-2"
                  style={{ color: 'var(--text-secondary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  <User className="w-4 h-4" />
                  Profile Settings
                </button>
                

                
                <div className="mt-2 pt-2" style={{ borderTop: '1px solid var(--border-color)' }}>
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
                    className="w-full text-left px-3 py-2 transition-colors flex items-center gap-2"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--bg-hover)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--text-muted)';
                    }}
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
      </div>

      {/* Secondary Header - Title and Controls */}
      <div className="px-4 md:px-6 py-3 md:py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4">
          {/* Left side - Title and last updated */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <h1 className="text-lg md:text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h1>
            <div className="text-xs md:text-sm" style={{ color: 'var(--text-secondary)' }}>
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
              className="px-2 md:px-3 py-1 md:py-1.5 rounded-lg text-xs md:text-sm font-medium transition-colors"
              style={{
                backgroundColor: autoRefresh ? 'var(--bg-hover)' : 'var(--bg-tertiary)',
                color: autoRefresh ? 'var(--text-primary)' : 'var(--text-secondary)',
                border: autoRefresh ? '1px solid var(--border-color)' : '1px solid transparent'
              }}
              onMouseEnter={(e) => {
                if (!autoRefresh) {
                  e.currentTarget.style.color = 'var(--text-primary)';
                }
              }}
              onMouseLeave={(e) => {
                if (!autoRefresh) {
                  e.currentTarget.style.color = 'var(--text-secondary)';
                }
              }}
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