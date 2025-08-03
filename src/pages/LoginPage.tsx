import React, { useState, useEffect, useCallback } from 'react';
import { Eye, EyeOff, Mail, Lock, LogIn, Shield, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '../stores/authStore';
import { useNavigate } from 'react-router-dom';
import { checkLoginRateLimit, sanitizeInput } from '../utils/securityMiddleware';
import useSecurity from '../hooks/useSecurity';
import { useLogger, useAuthLogger, useFormLogger } from '../hooks/useLogger';

const LoginPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockTimeRemaining, setBlockTimeRemaining] = useState(0);
  const [sessionTimeout, setSessionTimeout] = useState<NodeJS.Timeout | null>(null);

  const { signIn, user, userProfile } = useAuthStore();
  const { validateSessionIntegrity } = useSecurity();
  const navigate = useNavigate();
  
  // Initialize logging hooks
  const { logClick, logAction, logError, logInfo, logUserInteraction } = useLogger('LoginPage');
  const { logAuthAction, logAuthError, logAuthSuccess } = useAuthLogger('LoginPage');
  const { logFieldChange, logSubmit, logValidationError } = useFormLogger('loginForm', 'LoginPage');

  // Session timeout management
  useEffect(() => {
    if (user && userProfile?.role === 'admin') {
      const timeout = setTimeout(() => {
        toast.warning('Session expired due to inactivity');
      }, 30 * 60 * 1000); // 30 minutes
      
      setSessionTimeout(timeout);
      
      return () => {
        if (timeout) clearTimeout(timeout);
      };
    }
  }, [user, userProfile?.role]);

  // Check if user is already logged in and redirect
  useEffect(() => {
    if (user && userProfile?.role === 'admin') {
      navigate('/admin');
    }
  }, [user, userProfile?.role, navigate]);

  // Check rate limiting on component mount
  useEffect(() => {
    if (!checkLoginRateLimit()) {
      setIsBlocked(true);
    }
  }, []);

  // Rate limiting effect
  useEffect(() => {
    if (isBlocked && blockTimeRemaining > 0) {
      const timer = setInterval(() => {
        setBlockTimeRemaining(prev => {
          if (prev <= 1) {
            setIsBlocked(false);
            setLoginAttempts(0);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [isBlocked, blockTimeRemaining]);



  const resetSessionTimeout = useCallback(() => {
    if (sessionTimeout) {
      clearTimeout(sessionTimeout);
      const newTimeout = setTimeout(() => {
        toast.warning('Session expired due to inactivity');
      }, 30 * 60 * 1000);
      setSessionTimeout(newTimeout);
    }
  }, [sessionTimeout]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    logClick('submit_login_form');
    logSubmit(formData);
    
    if (isBlocked) {
      logAction('login_blocked', { reason: 'rate_limited', timeRemaining: blockTimeRemaining });
      toast.error(`Too many failed attempts. Please wait ${blockTimeRemaining} seconds.`);
      return;
    }
    
    if (!formData.email || !formData.password) {
      logValidationError('required_fields', 'Please fill in all fields');
      toast.error('Please fill in all fields');
      return;
    }

    // Sanitize email input
    const sanitizedEmail = sanitizeInput(formData.email.toLowerCase().trim());
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedEmail)) {
      logValidationError('invalid_email', 'Please enter a valid email address');
      toast.error('Please enter a valid email address');
      return;
    }

    // Check rate limiting
    if (!checkLoginRateLimit(sanitizedEmail)) {
      setIsBlocked(true);
      setLoginAttempts(prev => prev + 1);
      logAction('rate_limit_exceeded', { email: sanitizedEmail });
      return;
    }

    // Validate session integrity
    if (!validateSessionIntegrity()) {
      logError('session_integrity_failed');
      return;
    }
    
    setLoading(true);
    logAction('login_attempt_started', { email: sanitizedEmail });

    try {
      const { error } = await signIn(sanitizedEmail, formData.password);
      if (error) {
        const newAttempts = loginAttempts + 1;
        setLoginAttempts(newAttempts);
        logAuthError(error, { attempts: newAttempts, email: sanitizedEmail });
        
        // Check if we should block after this attempt
        if (!checkLoginRateLimit(sanitizedEmail)) {
          setIsBlocked(true);
          setBlockTimeRemaining(300); // 5 minutes
          logAction('account_blocked', { attempts: newAttempts, blockDuration: 300 });
        }
        
        toast.error(error);
      } else {
        setLoginAttempts(0);
        setIsBlocked(false);
        logAuthSuccess('login_successful', { email: sanitizedEmail });
        // Don't show welcome message here - let the dashboard handle it after profile is loaded
        // Redirect will be handled by useEffect
      }
    } catch (error: any) {
      setLoginAttempts(prev => prev + 1);
      logError('login_unexpected_error', { error: error.message, email: sanitizedEmail });
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
      logAction('login_attempt_completed');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    logClick('submit_forgot_password');
    logAction('forgot_password_attempt', { email: forgotEmail });
    
    if (!forgotEmail) {
      logValidationError('forgot_email', 'Please enter your email address');
      toast.error('Please enter your email address');
      return;
    }
    
    setForgotLoading(true);
    
    try {
      // Simulate password reset email sending
      await new Promise(resolve => setTimeout(resolve, 2000));
      logAction('forgot_password_success', { email: forgotEmail });
      toast.success('Password reset link sent to your email');
      setShowForgotPassword(false);
      setForgotEmail('');
    } catch (error: any) {
      logError('forgot_password_error', { error: error.message, email: forgotEmail });
      toast.error('Failed to send password reset email');
    } finally {
      setForgotLoading(false);
      logAction('forgot_password_completed');
    }
  };





  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6"
         style={{
           background: 'linear-gradient(to bottom right, var(--bg-secondary), var(--bg-primary), var(--bg-secondary))'
         }}>
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, #ffffff 1px, transparent 1px),
                           radial-gradient(circle at 75% 75%, #ffffff 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}></div>
      </div>
      
      <div className="relative w-full max-w-md">
        {/* Main Container */}
        <div className="backdrop-blur-xl rounded-2xl p-6 sm:p-8 shadow-2xl"
             style={{
               backgroundColor: 'var(--bg-secondary)',
               border: `1px solid var(--border-color)`,
               boxShadow: `0 25px 50px -12px var(--shadow-color)`
             }}>
          {/* Minimalistic Logo & Header */}
          <div className="text-center mb-6 sm:mb-8">
            {/* Custom Minimalistic Logo */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-4 sm:mb-6 relative">
              <div className="w-full h-full rounded-xl bg-gradient-to-br from-white to-gray-300 flex items-center justify-center shadow-lg">
                {/* Minimalistic G Logo */}
                <svg width="28" height="28" viewBox="0 0 32 32" className="text-black sm:w-8 sm:h-8">
                  <path 
                    d="M16 4C9.373 4 4 9.373 4 16s5.373 12 12 12c3.314 0 6.314-1.343 8.485-3.515L21.414 21.414C20.047 22.781 18.121 23.6 16 23.6c-4.198 0-7.6-3.402-7.6-7.6S11.802 8.4 16 8.4c2.121 0 4.047.819 5.414 2.186L24.485 7.515C22.314 5.343 19.314 4 16 4z" 
                    fill="currentColor"
                  />
                  <path 
                    d="M16 12v4h6v-2h-4v-2z" 
                    fill="currentColor"
                  />
                </svg>
              </div>
              {/* Subtle glow effect */}
              <div className="absolute inset-0 rounded-xl bg-white/20 blur-xl -z-10"></div>
            </div>
            
            <h1 className="text-xl sm:text-2xl font-semibold mb-2"
                style={{color: 'var(--text-primary)'}}>
              Welcome back
            </h1>
            <p className="text-sm" style={{color: 'var(--text-secondary)'}}>
              Sign in to your admin dashboard
            </p>
          </div>

          {/* Modern Form */}
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            {/* Email Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                Email
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => {
                    const newEmail = sanitizeInput(e.target.value);
                    setFormData({
                      ...formData,
                      email: newEmail
                    });
                    logFieldChange('email', newEmail);
                    logUserInteraction('input_change', 'email_field', { value: newEmail });
                  }}
                  className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 backdrop-blur-sm text-sm sm:text-base"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    border: `1px solid var(--border-color)`,
                    color: 'var(--text-primary)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    e.currentTarget.style.boxShadow = `0 0 0 2px var(--accent-primary)20`;
                    logUserInteraction('focus', 'email_field');
                    resetSessionTimeout();
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.boxShadow = 'none';
                    logUserInteraction('blur', 'email_field');
                  }}
                  placeholder="Enter your email"
                  required
                  disabled={isBlocked}
                  maxLength={254}
                />
                <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{color: 'var(--text-muted)'}} />
              </div>
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <label className="block text-sm font-medium" style={{color: 'var(--text-secondary)'}}>
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => {
                    const newPassword = e.target.value;
                    setFormData({
                      ...formData,
                      password: newPassword
                    });
                    logFieldChange('password', '***hidden***');
                    logUserInteraction('input_change', 'password_field', { hasValue: !!newPassword });
                  }}
                  className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 backdrop-blur-sm pr-10 sm:pr-12 text-sm sm:text-base"
                  style={{
                    backgroundColor: 'var(--bg-tertiary)',
                    border: `1px solid var(--border-color)`,
                    color: 'var(--text-primary)'
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'var(--accent-primary)';
                    e.currentTarget.style.boxShadow = `0 0 0 2px var(--accent-primary)20`;
                    logUserInteraction('focus', 'password_field');
                    resetSessionTimeout();
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-color)';
                    e.currentTarget.style.boxShadow = 'none';
                    logUserInteraction('blur', 'password_field');
                  }}
                  placeholder="Enter your password"
                  required
                  disabled={isBlocked}
                  maxLength={128}
                />
                <button
                  type="button"
                  onClick={() => {
                    const newShowPassword = !showPassword;
                    setShowPassword(newShowPassword);
                    logClick('toggle_password_visibility', { visible: newShowPassword });
                    logUserInteraction('click', 'password_toggle_button', { action: newShowPassword ? 'show' : 'hide' });
                  }}
                  className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 transition-colors"
                  style={{ color: 'var(--text-muted)' }}
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Warning Messages */}
            {loginAttempts > 0 && !isBlocked && (
              <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm">
                <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-red-400">
                  {loginAttempts} failed attempt{loginAttempts > 1 ? 's' : ''}. Account will be locked after 5 attempts.
                </span>
              </div>
            )}

            {isBlocked && (
              <div className="flex items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl bg-red-500/10 border border-red-500/20 backdrop-blur-sm">
                <Shield className="h-4 w-4 text-red-400 flex-shrink-0" />
                <span className="text-xs sm:text-sm text-red-400">
                  Account temporarily blocked. Try again in {blockTimeRemaining} seconds.
                </span>
              </div>
            )}

            {/* Modern Submit Button */}
            <button
              type="submit"
              disabled={loading || isBlocked}
              className="w-full py-2.5 sm:py-3 font-medium rounded-xl focus:outline-none focus:ring-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'white',
                boxShadow: '0 4px 14px 0 var(--accent-primary)40'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
              onClick={() => {
                logClick('login_submit_button', { 
                  disabled: loading || isBlocked,
                  loading,
                  isBlocked,
                  email: formData.email 
                });
                resetSessionTimeout();
              }}
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}></div>
                  <span className="text-sm sm:text-base">Signing in...</span>
                </div>
              ) : (
                'Sign in'
              )}
            </button>

            {/* Forgot Password Link */}
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(true);
                  logClick('show_forgot_password');
                  logUserInteraction('click', 'forgot_password_link');
                }}
                className="text-xs sm:text-sm transition-colors duration-200"
                style={{ color: 'var(--text-muted)' }}
                onMouseEnter={(e) => e.currentTarget.style.color = 'var(--text-secondary)'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
              >
                Forgot your password?
              </button>
            </div>
          </form>

          {/* Security Notice */}
          <div className="mt-4 sm:mt-6 p-3 sm:p-4 rounded-xl backdrop-blur-sm" style={{ backgroundColor: 'var(--bg-secondary)', border: `1px solid var(--border-color)` }}>
            <div className="flex items-center justify-center gap-2">
              <Shield className="h-3 w-3 sm:h-4 sm:w-4" style={{ color: 'var(--text-muted)' }} />
              <span className="text-xs text-center" style={{ color: 'var(--text-muted)' }}>
                Secure admin access • Auto-logout after 30 minutes
              </span>
            </div>
          </div>
        </div>

        {/* Modern Footer */}
        <div className="text-center mt-4 sm:mt-6">
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            GStore Admin Portal
          </p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
            Secure • Reliable • Modern
          </p>
        </div>
      </div>

      {/* Modern Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 z-50" style={{ backgroundColor: 'rgba(0,0,0,0.8)' }}>
          <div className="backdrop-blur-xl rounded-2xl w-full max-w-md p-6 sm:p-8 shadow-2xl" style={{ backgroundColor: 'var(--bg-primary)', border: `1px solid var(--border-color)` }}>
            <div className="text-center mb-4 sm:mb-6">
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 rounded-xl flex items-center justify-center shadow-lg" style={{ background: 'linear-gradient(135deg, var(--accent-primary), var(--accent-secondary))' }}>
                <Mail className="h-5 w-5 sm:h-6 sm:w-6" style={{ color: 'white' }} />
              </div>
              <h2 className="text-lg sm:text-xl font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Reset Password</h2>
              <p className="text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
                Enter your email to receive a password reset link
              </p>
            </div>

            <form onSubmit={handleForgotPassword} className="space-y-3 sm:space-y-4">
              <div className="space-y-2">
                <label className="block text-xs sm:text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                  Email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => {
                      const newEmail = e.target.value;
                      setForgotEmail(newEmail);
                      logFieldChange('forgot_email', newEmail);
                      logUserInteraction('input_change', 'forgot_email_field', { value: newEmail });
                    }}
                    onFocus={(e) => {
                      logUserInteraction('focus', 'forgot_email_field');
                      e.currentTarget.style.borderColor = 'var(--accent-primary)';
                      e.currentTarget.style.boxShadow = `0 0 0 2px var(--accent-primary)20`;
                    }}
                    onBlur={(e) => {
                      logUserInteraction('blur', 'forgot_email_field');
                      e.currentTarget.style.borderColor = 'var(--border-color)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    className="w-full px-3 py-2.5 sm:px-4 sm:py-3 rounded-xl focus:outline-none focus:ring-2 transition-all duration-200 backdrop-blur-sm text-sm sm:text-base"
                    style={{
                      backgroundColor: 'var(--bg-tertiary)',
                      border: `1px solid var(--border-color)`,
                      color: 'var(--text-primary)'
                    }}
                    placeholder="Enter your email"
                    required
                  />
                  <Mail className="absolute right-3 sm:right-4 top-1/2 transform -translate-y-1/2 h-4 w-4" style={{ color: 'var(--text-muted)' }} />
                </div>
              </div>

              <div className="flex gap-2 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword(false);
                    setForgotEmail('');
                    logClick('cancel_forgot_password');
                    logUserInteraction('click', 'cancel_forgot_password_button');
                  }}
                  className="flex-1 py-2.5 sm:py-3 px-3 sm:px-4 rounded-xl transition-all duration-200 backdrop-blur-sm text-sm sm:text-base"
                  style={{
                    border: `1px solid var(--border-color)`,
                    color: 'var(--text-secondary)',
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    e.currentTarget.style.color = 'var(--text-primary)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = 'var(--text-secondary)';
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={forgotLoading}
                  className="flex-1 py-2.5 sm:py-3 font-medium rounded-xl disabled:opacity-50 transition-all duration-200 shadow-lg text-sm sm:text-base"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'white'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '0.9';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                >
                  {forgotLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: 'white' }}></div>
                      <span className="text-sm sm:text-base">Sending...</span>
                    </div>
                  ) : (
                    'Send Link'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginPage;