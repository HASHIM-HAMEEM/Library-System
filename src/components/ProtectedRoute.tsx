import { ReactNode, useMemo, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import LoadingSpinner from './LoadingSpinner';
import { toast } from 'sonner';

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: 'admin';
  allowedRoles?: string[];
}

const ProtectedRoute = ({ children, requiredRole, allowedRoles }: ProtectedRouteProps) => {
  const { user, userProfile, loading } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  
  console.log('🔍 ProtectedRoute: Checking access for:', location.pathname);
  console.log('🔍 ProtectedRoute: Auth state - user:', !!user, 'userProfile:', !!userProfile, 'loading:', loading);
  console.log('🔍 ProtectedRoute: User role:', userProfile?.role, 'Required role:', requiredRole);

  // Use useEffect for navigation to prevent infinite re-renders
  useEffect(() => {
    console.log('🔍 ProtectedRoute: useEffect triggered', {
      user: !!user,
      userProfile: !!userProfile,
      loading,
      requiredRole,
      userRole: userProfile?.role
    });
    
    // Don't do anything while loading
    if (loading) {
      console.log('🔍 ProtectedRoute: Still loading, waiting...');
      return;
    }
    
    // Security: Check authentication
    if (!user || !userProfile) {
      console.warn('🚨 Security: Unauthenticated access attempt to protected route:', location.pathname);
      toast.error('Please log in to access this page');
      navigate('/login', { replace: true });
      return;
    }
    
    // Security: Check role-based access
    if (requiredRole && userProfile.role !== requiredRole) {
      console.warn('🚨 Security: Unauthorized role access attempt:', {
        userRole: userProfile.role,
        requiredRole,
        path: location.pathname,
        userId: userProfile.id
      });
      toast.error('You do not have permission to access this page');
      
      // Redirect to appropriate page based on user role
      navigate('/login', { replace: true });
      return;
    }

    // Security: Validate admin paths
    if (location.pathname.startsWith('/admin') && userProfile.role !== 'admin') {
      console.warn('🚨 Security: Non-admin attempting to access admin route:', {
        userRole: userProfile.role,
        path: location.pathname,
        userId: userProfile.id
      });
      toast.error('Access denied: Admin privileges required');
      navigate('/login', { replace: true });
      return;
    }

    // Security: Log successful access
    console.log('✅ Security: Authorized access granted:', {
      userRole: userProfile.role,
      path: location.pathname,
      userId: userProfile.id
    });
  }, [user?.uid, userProfile?.id, userProfile?.role, loading, requiredRole, location.pathname]);

  // Show loading spinner while checking authentication
  if (loading) {
    return <LoadingSpinner />;
  }

  // Don't render anything if not authenticated (navigation will handle redirect)
  if (!user || !userProfile) {
    console.log('🔍 ProtectedRoute: No user or userProfile, returning null', { user: !!user, userProfile: !!userProfile });
    return null;
  }

  // Check role-based access
  if (requiredRole && userProfile.role !== requiredRole) {
    console.log('🔍 ProtectedRoute: Role mismatch, returning null', { required: requiredRole, actual: userProfile.role });
    return null;
  }

  // Check allowed roles
  if (allowedRoles && !allowedRoles.includes(userProfile.role)) {
    console.log('🔍 ProtectedRoute: Role not in allowed list, returning null', { allowedRoles, actual: userProfile.role });
    return null;
  }

  // Check if user is admin (this app is admin-only)
  if (userProfile.role !== 'admin') {
    console.log('🔍 ProtectedRoute: User is not admin, returning null', { role: userProfile.role });
    return null;
  }

  // All checks passed, render the protected component
  console.log('🔍 ProtectedRoute: All checks passed, rendering children');
  return <>{children}</>;
};

export default ProtectedRoute;