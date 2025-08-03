import { useCallback, useEffect, useRef } from 'react';
import { logger, createComponentLogger, LogCategory } from '../utils/logger';

/**
 * Custom hook for component-level logging
 * Provides easy access to logging functionality with automatic component context
 */
export function useLogger(componentName: string) {
  const componentLogger = useRef(createComponentLogger(componentName));
  const renderCount = useRef(0);

  // Track component renders
  useEffect(() => {
    renderCount.current += 1;
    componentLogger.current.debug(`Component rendered (count: ${renderCount.current})`);
  });

  // Track component mount/unmount
  useEffect(() => {
    componentLogger.current.info('Component mounted');
    
    return () => {
      componentLogger.current.info('Component unmounted');
    };
  }, []);

  // Memoized logging functions
  const logClick = useCallback((buttonName: string, data?: any) => {
    componentLogger.current.logClick(buttonName, data);
  }, []);

  const logAction = useCallback((action: string, data?: any) => {
    componentLogger.current.info(`Action: ${action}`, data, action);
  }, []);

  const logError = useCallback((error: string | Error, data?: any) => {
    const errorMessage = error instanceof Error ? error.message : error;
    const errorData = error instanceof Error ? { ...data, stack: error.stack } : data;
    componentLogger.current.error(`Error: ${errorMessage}`, errorData);
  }, []);

  const logWarning = useCallback((warning: string, data?: any) => {
    componentLogger.current.warn(`Warning: ${warning}`, data);
  }, []);

  const logInfo = useCallback((message: string, data?: any) => {
    componentLogger.current.info(message, data);
  }, []);

  const logDebug = useCallback((message: string, data?: any) => {
    componentLogger.current.debug(message, data);
  }, []);

  // Form interaction logging
  const logFormSubmit = useCallback((formName: string, formData?: any) => {
    componentLogger.current.info(`Form submitted: ${formName}`, formData, 'form_submit');
  }, []);

  const logFormChange = useCallback((fieldName: string, value: any) => {
    componentLogger.current.debug(`Form field changed: ${fieldName}`, { value }, 'form_change');
  }, []);

  // Navigation logging
  const logNavigation = useCallback((destination: string, data?: any) => {
    logger.logNavigation(componentName, destination, data);
  }, [componentName]);

  // API call logging
  const logApiCall = useCallback((method: string, url: string, data?: any) => {
    logger.logApiCall(method, url, { ...data, component: componentName });
  }, [componentName]);

  const logApiResponse = useCallback((method: string, url: string, status: number, data?: any) => {
    logger.logApiResponse(method, url, status, { ...data, component: componentName });
  }, [componentName]);

  // State change logging
  const logStateChange = useCallback((stateName: string, oldValue: any, newValue: any) => {
    componentLogger.current.debug(`State changed: ${stateName}`, {
      oldValue,
      newValue,
      action: 'state_change'
    });
  }, []);

  // Effect logging
  const logEffect = useCallback((effectName: string, dependencies?: any[]) => {
    componentLogger.current.debug(`Effect triggered: ${effectName}`, {
      dependencies,
      action: 'effect_trigger'
    });
  }, []);

  // User interaction logging
  const logUserInteraction = useCallback((interactionType: string, target?: string, data?: any) => {
    componentLogger.current.info(`User interaction: ${interactionType}`, {
      target,
      ...data,
      action: 'user_interaction'
    });
  }, []);

  // Performance logging
  const logPerformance = useCallback((operationName: string, duration: number, data?: any) => {
    componentLogger.current.info(`Performance: ${operationName}`, {
      duration: `${duration.toFixed(2)}ms`,
      ...data,
      action: 'performance'
    });
  }, []);

  return {
    // Basic logging
    logClick,
    logAction,
    logError,
    logWarning,
    logInfo,
    logDebug,
    
    // Specific logging
    logFormSubmit,
    logFormChange,
    logNavigation,
    logApiCall,
    logApiResponse,
    logStateChange,
    logEffect,
    logUserInteraction,
    logPerformance,
    
    // Direct access to component logger
    logger: componentLogger.current,
    
    // Component info
    componentName,
    renderCount: renderCount.current
  };
}

/**
 * Hook for tracking form interactions with automatic logging
 */
export function useFormLogger(formName: string, componentName: string) {
  const { logFormSubmit, logFormChange, logError } = useLogger(componentName);

  const logFieldChange = useCallback((fieldName: string, value: any) => {
    logFormChange(fieldName, value);
  }, [logFormChange]);

  const logSubmit = useCallback((formData: any) => {
    logFormSubmit(formName, formData);
  }, [logFormSubmit, formName]);

  const logValidationError = useCallback((fieldName: string, error: string) => {
    logError(`Validation error in ${fieldName}: ${error}`, { fieldName, formName });
  }, [logError, formName]);

  return {
    logFieldChange,
    logSubmit,
    logValidationError
  };
}

/**
 * Hook for tracking API calls with automatic logging
 */
export function useApiLogger(componentName: string) {
  const { logApiCall, logApiResponse, logError } = useLogger(componentName);

  const logRequest = useCallback(async <T>(
    method: string,
    url: string,
    requestData?: any,
    apiCall?: () => Promise<T>
  ): Promise<T | undefined> => {
    logApiCall(method, url, requestData);
    
    if (!apiCall) return undefined;
    
    try {
      const start = performance.now();
      const response = await apiCall();
      const duration = performance.now() - start;
      
      logApiResponse(method, url, 200, { duration: `${duration.toFixed(2)}ms` });
      return response;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logApiResponse(method, url, 500, { error: errorMessage });
      logError(`API call failed: ${method} ${url}`, { error: errorMessage });
      throw error;
    }
  }, [logApiCall, logApiResponse, logError]);

  return {
    logRequest
  };
}

/**
 * Hook for tracking navigation with automatic logging
 */
export function useNavigationLogger(componentName: string) {
  const { logNavigation } = useLogger(componentName);

  const logNavigate = useCallback((destination: string, data?: any) => {
    logNavigation(destination, data);
  }, [logNavigation]);

  return {
    logNavigate
  };
}

/**
 * Hook for tracking authentication events
 */
export function useAuthLogger(componentName: string) {
  const { logAction, logError, logInfo } = useLogger(componentName);

  const logAuthAction = useCallback((action: string, data?: any) => {
    logger.logAuthEvent(action, { ...data, component: componentName });
    logAction(`Auth: ${action}`, data);
  }, [logAction, componentName]);

  const logAuthError = useCallback((error: string | Error, data?: any) => {
    const errorMessage = error instanceof Error ? error.message : error;
    logger.logAuthEvent(`error_${errorMessage}`, { ...data, component: componentName });
    logError(`Auth Error: ${errorMessage}`, data);
  }, [logError, componentName]);

  const logAuthSuccess = useCallback((action: string, data?: any) => {
    logger.logAuthEvent(`success_${action}`, { ...data, component: componentName });
    logInfo(`Auth Success: ${action}`, data);
  }, [logInfo, componentName]);

  return {
    logAuthAction,
    logAuthError,
    logAuthSuccess
  };
}