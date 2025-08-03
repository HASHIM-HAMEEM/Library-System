import { useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import {
  validateSession,
  checkApiRateLimit,
  logSecurityEvent,
  cleanupSecurityData,
} from '../utils/securityMiddleware';
import { toast } from 'sonner';

// Session timeout configuration
const getSessionTimeout = () => {
  const stored = localStorage.getItem('admin_session_timeout');
  const timeoutMinutes = stored ? parseInt(stored, 10) : 30; // Default 30 minutes
  return timeoutMinutes * 60 * 1000; // Convert to milliseconds
};

const ACTIVITY_CHECK_INTERVAL = 60 * 1000; // 1 minute
const getInactivityWarningTime = () => 5 * 60 * 1000; // 5 minutes before timeout

export const useSecurity = () => {
  const { user, signOut } = useAuthStore();
  const navigate = useNavigate();
  const lastActivityRef = useRef<number>(Date.now());
  const warningShownRef = useRef<boolean>(false);
  const timeoutIdRef = useRef<NodeJS.Timeout | null>(null);

  // Update last activity timestamp
  const updateActivity = useCallback(() => {
    lastActivityRef.current = Date.now();
    warningShownRef.current = false;
    
    if (user) {
      localStorage.setItem('admin_last_activity', lastActivityRef.current.toString());
    }
  }, [user]);

  // Check API rate limits before making requests
  const checkRateLimit = useCallback(() => {
    return checkApiRateLimit();
  }, []);

  // Secure API request wrapper
  const secureApiRequest = useCallback(async (
    requestFn: () => Promise<any>,
    options: { skipRateLimit?: boolean; skipSessionCheck?: boolean } = {}
  ) => {
    try {
      // Check rate limiting
      if (!options.skipRateLimit && !checkRateLimit()) {
        throw new Error('Rate limit exceeded');
      }

      // Validate session
      if (!options.skipSessionCheck && !validateSession()) {
        throw new Error('Session validation failed');
      }

      // Update activity
      updateActivity();

      // Execute the request
      return await requestFn();
    } catch (error: any) {
      logSecurityEvent('api_request_error', {
        error: error.message,
        userId: user?.id,
      });
      throw error;
    }
  }, [updateActivity, checkRateLimit, user?.id]);

  // Setup security monitoring
  useEffect(() => {
    if (!user) {
      // Clear any existing timeouts
      if (timeoutIdRef.current) {
        clearInterval(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
      return;
    }

    // Store user ID for stable reference
    const userId = user.id;

    // Initialize last activity from localStorage
    const storedActivity = localStorage.getItem('admin_last_activity');
    if (storedActivity) {
      lastActivityRef.current = parseInt(storedActivity, 10);
    }

    // Set up activity monitoring
    const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    const handleActivity = () => {
      lastActivityRef.current = Date.now();
      warningShownRef.current = false;
      localStorage.setItem('admin_last_activity', lastActivityRef.current.toString());
    };
    
    activityEvents.forEach(event => {
      document.addEventListener(event, handleActivity, { passive: true });
    });

    // Set up session timeout checking
    const checkTimeout = () => {
      const now = Date.now();
      const timeSinceActivity = now - lastActivityRef.current;
      const sessionTimeout = getSessionTimeout();
      const inactivityWarningTime = getInactivityWarningTime();
      const timeUntilTimeout = sessionTimeout - timeSinceActivity;

      // Show warning 5 minutes before timeout
      if (timeUntilTimeout <= inactivityWarningTime && !warningShownRef.current) {
        warningShownRef.current = true;
        const warningMinutes = Math.ceil(timeUntilTimeout / (60 * 1000));
        toast.warning(`Your session will expire in ${warningMinutes} minutes due to inactivity.`, {
          duration: 10000,
          action: {
            label: 'Stay Active',
            onClick: handleActivity,
          },
        });
      }

      // Force logout on timeout
      if (timeSinceActivity >= sessionTimeout) {
        logSecurityEvent('session_timeout', {
          userId,
          inactiveTime: timeSinceActivity,
          sessionTimeoutMinutes: sessionTimeout / (60 * 1000),
        });
        
        toast.error('Session expired due to inactivity. Please log in again.');
        window.location.href = '/login';
      }
    };
    
    timeoutIdRef.current = setInterval(checkTimeout, ACTIVITY_CHECK_INTERVAL);

    // Set up page visibility monitoring
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Page became visible, just update activity without excessive validation
        handleActivity();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibility);
    
    // Set up beforeunload monitoring
    const handleUnload = () => {
      logSecurityEvent('page_unload', {
        userId,
        sessionDuration: Date.now() - lastActivityRef.current,
      });
    };
    
    window.addEventListener('beforeunload', handleUnload);

    // Initial activity setup - removed excessive session validation

    return () => {
      // Cleanup event listeners
      activityEvents.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
      
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('beforeunload', handleUnload);
      
      // Clear timeout
      if (timeoutIdRef.current) {
        clearInterval(timeoutIdRef.current);
        timeoutIdRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutIdRef.current) {
        clearInterval(timeoutIdRef.current);
      }
    };
  }, []);

  // Validate session integrity function
  const validateSessionIntegrity = useCallback(() => {
    if (!user) return true;

    if (!validateSession()) {
      logSecurityEvent('session_integrity_violation', {
        userId: user.id,
      });
      
      toast.error('Session security violation detected. Please log in again.');
      window.location.href = '/login';
      return false;
    }

    return true;
  }, [user]);

  return {
    updateActivity,
    validateSessionIntegrity,
    checkRateLimit,
    secureApiRequest,
    isSessionValid: () => validateSession(),
  };
};

export default useSecurity;