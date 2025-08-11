import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('🚨 ErrorBoundary: Caught error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('🚨 ErrorBoundary: Component stack trace:', errorInfo.componentStack);
    console.error('🚨 ErrorBoundary: Error details:', error);
    this.setState({ error, errorInfo });
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black text-gray-900 dark:text-white">
          <div className="max-w-md text-center p-6 bg-white dark:bg-black border border-gray-200 dark:border-gray-700 rounded-lg">
            <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">Something went wrong</h1>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              An error occurred while rendering this component.
            </p>
            {this.state.error && (
              <details className="mb-4 text-left">
                <summary className="cursor-pointer text-red-300 hover:text-white">
                  Error Details
                </summary>
                <pre className="mt-2 p-3 bg-red-800 rounded text-xs overflow-auto">
                  {this.state.error.message}
                  {this.state.errorInfo?.componentStack && (
                    <>
                      \n\nComponent Stack:
                      {this.state.errorInfo.componentStack}
                    </>
                  )}
                </pre>
              </details>
            )}
            <button
              onClick={() => {
                this.setState({ hasError: false, error: undefined, errorInfo: undefined });
                window.location.reload();
              }}
              className="px-4 py-2 rounded transition-colors bg-blue-600 hover:bg-blue-700 text-white"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;