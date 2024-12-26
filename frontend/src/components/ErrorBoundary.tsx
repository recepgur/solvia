import { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('React Error Boundary caught an error:', {
      error,
      message: error.message,
      stack: error.stack,
      type: error.name,
      componentStack: errorInfo.componentStack
    });
    
    // Log initialization state
    if (typeof window !== 'undefined') {
      console.error('Environment state:', {
        hasBuffer: typeof Buffer !== 'undefined',
        hasCrypto: typeof window.crypto !== 'undefined',
        hasProcess: typeof process !== 'undefined',
        isDevelopment: process.env.NODE_ENV === 'development',
        mockData: process.env.VITE_MOCK_DATA
      });
    }
  }

  public render() {
    if (this.state.hasError) {
      // Check for crypto-related errors
      const errorString = this.state.error?.toString() || '';
      const isCryptoError = errorString.includes('crypto') || 
                           errorString.includes('slice') || 
                           errorString.includes('browserify-sign');
      
      if (isCryptoError) {
        console.warn('Crypto initialization error detected, attempting recovery...');
        // Attempt to reinitialize crypto
        if (typeof window !== 'undefined' && window.crypto) {
          try {
            const testArray = new Uint8Array(8);
            window.crypto.getRandomValues(testArray);
            // If we get here, crypto is actually working
            console.log('Crypto API verified after error');
            // Clear the error state and retry rendering
            this.setState({ hasError: false, error: null });
            return this.props.children;
          } catch (e) {
            console.error('Crypto reinitialization failed:', e);
          }
        }
      }

      return (
        <div style={{ 
          padding: '20px', 
          color: '#00a884', 
          background: '#1a1b23', 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <h1 style={{ fontSize: '24px', marginBottom: '16px' }}>
            {isCryptoError ? 'Initializing Secure Connection...' : 'Something went wrong'}
          </h1>
          {!isCryptoError && (
            <pre style={{ 
              whiteSpace: 'pre-wrap',
              maxWidth: '800px',
              overflow: 'auto',
              padding: '16px',
              background: '#2d2e3d',
              borderRadius: '8px'
            }}>
              {this.state.error?.toString()}
            </pre>
          )}
          {isCryptoError && (
            <p style={{ color: '#888', textAlign: 'center' }}>
              Please wait while we establish a secure connection...
            </p>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
