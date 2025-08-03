// Comprehensive Debug Logger for GStore Application

type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'trace';
type LogCategory = 'auth' | 'api' | 'ui' | 'navigation' | 'database' | 'security' | 'qr' | 'general';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  component?: string;
  action?: string;
}

class Logger {
  private sessionId: string;
  private isEnabled: boolean = true;
  private logs: LogEntry[] = [];
  private maxLogs: number = 1000;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.setupGlobalErrorHandling();
    this.log('info', 'general', 'Logger initialized', { sessionId: this.sessionId });
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private setupGlobalErrorHandling(): void {
    // Capture unhandled errors
    window.addEventListener('error', (event) => {
      this.log('error', 'general', 'Unhandled error', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error?.stack
      });
    });

    // Capture unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.log('error', 'general', 'Unhandled promise rejection', {
        reason: event.reason,
        promise: event.promise
      });
    });
  }

  log(level: LogLevel, category: LogCategory, message: string, data?: any, component?: string, action?: string): void {
    if (!this.isEnabled) return;

    const logEntry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      sessionId: this.sessionId,
      component,
      action
    };

    // Add user ID if available
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        logEntry.userId = user.id;
      }
    } catch (e) {
      // Ignore localStorage errors
    }

    this.logs.push(logEntry);

    // Maintain max logs limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console output with styling
    const style = this.getConsoleStyle(level);
    const prefix = `[${level.toUpperCase()}][${category.toUpperCase()}]`;
    
    console.groupCollapsed(`%c${prefix} ${message}`, style);
    if (data) {
      console.log('Data:', data);
    }
    if (component) {
      console.log('Component:', component);
    }
    if (action) {
      console.log('Action:', action);
    }
    console.log('Timestamp:', logEntry.timestamp);
    console.log('Session ID:', this.sessionId);
    console.groupEnd();

    // Store in localStorage for persistence
    this.persistLogs();
  }

  private getConsoleStyle(level: LogLevel): string {
    const styles = {
      debug: 'color: #888; font-weight: normal;',
      info: 'color: #2196F3; font-weight: bold;',
      warn: 'color: #FF9800; font-weight: bold;',
      error: 'color: #F44336; font-weight: bold; background: #ffebee;',
      trace: 'color: #9C27B0; font-weight: normal;'
    };
    return styles[level] || styles.info;
  }

  private persistLogs(): void {
    try {
      const recentLogs = this.logs.slice(-100); // Keep last 100 logs in localStorage
      localStorage.setItem('debug_logs', JSON.stringify(recentLogs));
    } catch (e) {
      console.warn('Failed to persist logs to localStorage:', e);
    }
  }

  // Convenience methods
  debug(category: LogCategory, message: string, data?: any, component?: string, action?: string): void {
    this.log('debug', category, message, data, component, action);
  }

  info(category: LogCategory, message: string, data?: any, component?: string, action?: string): void {
    this.log('info', category, message, data, component, action);
  }

  warn(category: LogCategory, message: string, data?: any, component?: string, action?: string): void {
    this.log('warn', category, message, data, component, action);
  }

  error(category: LogCategory, message: string, data?: any, component?: string, action?: string): void {
    this.log('error', category, message, data, component, action);
  }

  trace(category: LogCategory, message: string, data?: any, component?: string, action?: string): void {
    this.log('trace', category, message, data, component, action);
  }

  // Specific logging methods for common actions
  logButtonClick(buttonName: string, component: string, data?: any): void {
    this.info('ui', `Button clicked: ${buttonName}`, data, component, 'button_click');
  }

  logNavigation(from: string, to: string, data?: any): void {
    this.info('navigation', `Navigation: ${from} → ${to}`, data, 'Router', 'navigate');
  }

  logApiCall(method: string, url: string, data?: any): void {
    this.info('api', `API Call: ${method} ${url}`, data, 'API', 'request');
  }

  logApiResponse(method: string, url: string, status: number, data?: any): void {
    const level = status >= 400 ? 'error' : 'info';
    this.log(level, 'api', `API Response: ${method} ${url} - ${status}`, data, 'API', 'response');
  }

  logAuthEvent(event: string, data?: any): void {
    this.info('auth', `Auth Event: ${event}`, data, 'AuthStore', event);
  }

  logDatabaseEvent(event: string, table?: string, data?: any): void {
    this.info('database', `Database Event: ${event}${table ? ` (${table})` : ''}`, data, 'Database', event);
  }

  logSecurityEvent(event: string, data?: any): void {
    this.warn('security', `Security Event: ${event}`, data, 'Security', event);
  }

  logQREvent(event: string, data?: any): void {
    this.info('qr', `QR Event: ${event}`, data, 'QRService', event);
  }

  // Utility methods
  getLogs(category?: LogCategory, level?: LogLevel): LogEntry[] {
    let filteredLogs = this.logs;
    
    if (category) {
      filteredLogs = filteredLogs.filter(log => log.category === category);
    }
    
    if (level) {
      filteredLogs = filteredLogs.filter(log => log.level === level);
    }
    
    return filteredLogs;
  }

  exportLogs(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  clearLogs(): void {
    this.logs = [];
    localStorage.removeItem('debug_logs');
    this.info('general', 'Logs cleared');
  }

  enable(): void {
    this.isEnabled = true;
    this.info('general', 'Logger enabled');
  }

  disable(): void {
    this.isEnabled = false;
  }

  getSessionId(): string {
    return this.sessionId;
  }
}

// Create singleton instance
export const logger = new Logger();

// Export types for use in other files
export type { LogLevel, LogCategory, LogEntry };

// Helper function to create component-specific loggers
export function createComponentLogger(componentName: string) {
  return {
    debug: (message: string, data?: any, action?: string) => 
      logger.debug('ui', message, data, componentName, action),
    info: (message: string, data?: any, action?: string) => 
      logger.info('ui', message, data, componentName, action),
    warn: (message: string, data?: any, action?: string) => 
      logger.warn('ui', message, data, componentName, action),
    error: (message: string, data?: any, action?: string) => 
      logger.error('ui', message, data, componentName, action),
    logClick: (buttonName: string, data?: any) => 
      logger.logButtonClick(buttonName, componentName, data)
  };
}

// Performance logging utilities
export function logPerformance(name: string, fn: () => any) {
  const start = performance.now();
  logger.trace('general', `Performance start: ${name}`);
  
  try {
    const result = fn();
    const end = performance.now();
    logger.info('general', `Performance end: ${name}`, { duration: `${(end - start).toFixed(2)}ms` });
    return result;
  } catch (error) {
    const end = performance.now();
    logger.error('general', `Performance error: ${name}`, { 
      duration: `${(end - start).toFixed(2)}ms`,
      error: error.message 
    });
    throw error;
  }
}

export async function logAsyncPerformance<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  logger.trace('general', `Async performance start: ${name}`);
  
  try {
    const result = await fn();
    const end = performance.now();
    logger.info('general', `Async performance end: ${name}`, { duration: `${(end - start).toFixed(2)}ms` });
    return result;
  } catch (error) {
    const end = performance.now();
    logger.error('general', `Async performance error: ${name}`, { 
      duration: `${(end - start).toFixed(2)}ms`,
      error: error.message 
    });
    throw error;
  }
}