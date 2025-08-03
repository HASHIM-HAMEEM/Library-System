import { toast } from 'sonner';

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  LOGIN_ATTEMPTS: {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
    blockDurationMs: 30 * 60 * 1000, // 30 minutes
  },
  API_REQUESTS: {
    maxRequests: 500, // Increased from 100 to 500
    windowMs: 60 * 1000, // 1 minute
  },
};

// In-memory storage for rate limiting (in production, use Redis or database)
const rateLimitStore = new Map<string, {
  attempts: number;
  firstAttempt: number;
  blockedUntil?: number;
}>();

const apiRequestStore = new Map<string, {
  requests: number;
  windowStart: number;
}>();

// Get client identifier (IP address simulation)
const getClientId = (): string => {
  // In a real application, you would get the actual IP address
  // For now, we'll use a combination of user agent and timestamp
  return btoa(navigator.userAgent + window.location.hostname);
};

// Login attempt rate limiting
export const checkLoginRateLimit = (email?: string): boolean => {
  const clientId = email || getClientId();
  const now = Date.now();
  const record = rateLimitStore.get(clientId);

  // Check if currently blocked
  if (record?.blockedUntil && now < record.blockedUntil) {
    const remainingTime = Math.ceil((record.blockedUntil - now) / 1000 / 60);
    toast.error(`Too many failed attempts. Try again in ${remainingTime} minutes.`);
    return false;
  }

  // Clean up expired records
  if (record && now - record.firstAttempt > RATE_LIMIT_CONFIG.LOGIN_ATTEMPTS.windowMs) {
    rateLimitStore.delete(clientId);
    return true;
  }

  return true;
};

// Record failed login attempt
export const recordFailedLogin = (email?: string): void => {
  const clientId = email || getClientId();
  const now = Date.now();
  const record = rateLimitStore.get(clientId);

  if (!record) {
    rateLimitStore.set(clientId, {
      attempts: 1,
      firstAttempt: now,
    });
  } else {
    const updatedRecord = {
      ...record,
      attempts: record.attempts + 1,
    };

    // Block if max attempts reached
    if (updatedRecord.attempts >= RATE_LIMIT_CONFIG.LOGIN_ATTEMPTS.maxAttempts) {
      updatedRecord.blockedUntil = now + RATE_LIMIT_CONFIG.LOGIN_ATTEMPTS.blockDurationMs;
      toast.error('Account temporarily locked due to too many failed attempts.');
      
      // Log security event
      console.warn(`Security Alert: Account locked for ${clientId} after ${updatedRecord.attempts} failed attempts`);
    }

    rateLimitStore.set(clientId, updatedRecord);
  }
};

// Clear failed login attempts on successful login
export const clearFailedLogins = (email?: string): void => {
  const clientId = email || getClientId();
  rateLimitStore.delete(clientId);
};

// API request rate limiting
export const checkApiRateLimit = (): boolean => {
  const clientId = getClientId();
  const now = Date.now();
  const record = apiRequestStore.get(clientId);

  if (!record) {
    apiRequestStore.set(clientId, {
      requests: 1,
      windowStart: now,
    });
    return true;
  }

  // Reset window if expired
  if (now - record.windowStart > RATE_LIMIT_CONFIG.API_REQUESTS.windowMs) {
    apiRequestStore.set(clientId, {
      requests: 1,
      windowStart: now,
    });
    return true;
  }

  // Check if limit exceeded
  if (record.requests >= RATE_LIMIT_CONFIG.API_REQUESTS.maxRequests) {
    toast.error('Too many requests. Please slow down.');
    return false;
  }

  // Increment request count
  record.requests++;
  return true;
};

// Session security validation
export const validateSession = (): boolean => {
  try {
    // Check for session hijacking indicators
    const userAgent = navigator.userAgent;
    const storedUserAgent = sessionStorage.getItem('userAgent');
    
    if (storedUserAgent && storedUserAgent !== userAgent) {
      console.warn('Security Alert: User agent mismatch detected');
      toast.error('Session security violation detected. Please log in again.');
      return false;
    }

    // Store user agent on first validation
    if (!storedUserAgent) {
      sessionStorage.setItem('userAgent', userAgent);
    }

    return true;
  } catch (error) {
    console.error('Session validation error:', error);
    return false;
  }
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .trim()
    .replace(/[<>"'&]/g, (char) => {
      const entities: { [key: string]: string } = {
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
        '&': '&amp;',
      };
      return entities[char] || char;
    });
};

// CSRF token generation and validation
let csrfToken: string | null = null;

export const generateCSRFToken = (): string => {
  const token = btoa(Math.random().toString(36).substring(2) + Date.now().toString(36));
  csrfToken = token;
  sessionStorage.setItem('csrfToken', token);
  return token;
};

export const validateCSRFToken = (token: string): boolean => {
  const storedToken = sessionStorage.getItem('csrfToken');
  return storedToken === token && token === csrfToken;
};

// Security headers for API requests
export const getSecurityHeaders = (): HeadersInit => {
  const token = csrfToken || generateCSRFToken();
  
  return {
    'X-CSRF-Token': token,
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json',
  };
};

// Clean up security data on logout
export const cleanupSecurityData = (): void => {
  sessionStorage.removeItem('userAgent');
  sessionStorage.removeItem('csrfToken');
  csrfToken = null;
  rateLimitStore.clear();
  apiRequestStore.clear();
};

// Security event logging
export const logSecurityEvent = (event: string, details: any = {}): void => {
  const securityLog = {
    timestamp: new Date().toISOString(),
    event,
    details,
    userAgent: navigator.userAgent,
    url: window.location.href,
  };
  
  console.warn('Security Event:', securityLog);
  
  // In production, send to security monitoring service
  // await fetch('/api/security-log', {
  //   method: 'POST',
  //   headers: getSecurityHeaders(),
  //   body: JSON.stringify(securityLog)
  // });
};