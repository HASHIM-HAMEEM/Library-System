import { useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { useAuthStore } from './stores/authStore';
import LoginPage from './pages/LoginPage';
import AdminDashboard from './pages/AdminDashboard';
import AdminQRScanner from './pages/AdminQRScanner';
import AdminInvitePage from './pages/AdminInvitePage';



import LoadingSpinner from './components/LoadingSpinner';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';

// Stable redirect components to prevent re-renders
const RedirectToAdmin = () => <Navigate to="/admin" replace />;
const RedirectToLogin = () => <Navigate to="/login" replace />;



// Home route component with admin-only logic
const HomeRoute = () => {
  const { user, userProfile } = useAuthStore();
  
  if (user && userProfile && userProfile.role === 'admin') {
    return <RedirectToAdmin />;
  }
  
  return <RedirectToLogin />;
};

// Catch-all route component with admin-only logic
const CatchAllRoute = () => {
  const { user, userProfile } = useAuthStore();
  
  if (user && userProfile && userProfile.role === 'admin') {
    return <RedirectToAdmin />;
  }
  
  return <RedirectToLogin />;
};

// Public route wrapper to prevent authenticated admins from accessing public pages
const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, userProfile } = useAuthStore();
  
  if (user && userProfile && userProfile.role === 'admin') {
    return <RedirectToAdmin />;
  }
  
  return <>{children}</>
};

function App() {
  const { loading, initialize } = useAuthStore();
  const initializeRef = useRef(false);

  useEffect(() => {
    if (!initializeRef.current) {
      initializeRef.current = true;
      initialize();
    }
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } />


          

          
          {/* Protected Admin Routes */}
          <Route path="/admin" element={
            <ProtectedRoute requiredRole="admin">
              <ErrorBoundary>
                <AdminDashboard />
              </ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/admin/pending-users" element={
            <ProtectedRoute requiredRole="admin">
              <ErrorBoundary>
                <AdminDashboard />
              </ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/admin/analytics" element={
            <ProtectedRoute requiredRole="admin">
              <ErrorBoundary>
                <AdminDashboard />
              </ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/admin/admin-management" element={
            <ProtectedRoute requiredRole="admin">
              <ErrorBoundary>
                <AdminDashboard />
              </ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/admin/qr-scanner" element={
            <ProtectedRoute requiredRole="admin">
              <ErrorBoundary>
                <AdminDashboard />
              </ErrorBoundary>
            </ProtectedRoute>
          } />
          <Route path="/admin/invite" element={
            <ProtectedRoute requiredRole="admin">
              <AdminInvitePage />
            </ProtectedRoute>
          } />
          

          
          {/* Default redirect */}
          <Route path="/" element={<HomeRoute />} />
          
          {/* Catch all route */}
          <Route path="*" element={<CatchAllRoute />} />
        </Routes>
        
        <Toaster 
          position="top-right" 
          theme="light"
          toastOptions={{
            style: {
              background: 'white',
              color: 'black',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }
          }}
        />
      </div>
    </Router>
  );
}

export default App;
