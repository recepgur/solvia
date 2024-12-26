// Verify and initialize global objects
if (typeof window !== 'undefined') {
  console.log('[env-check] Starting environment initialization...');
  
  // Initialize required globals first
  window.global = window;
  window.process = window.process || { env: {} };
  
  // Initialize Buffer
  try {
    if (typeof window.Buffer === 'undefined') {
      const { Buffer } = require('buffer');
      window.Buffer = Buffer;
      (window as any).global = window;
      global.Buffer = Buffer;
      console.log('[env-check] Buffer initialized successfully');
    }
  } catch (e) {
    console.error('[env-check] Buffer initialization failed:', e);
  }
  
  // Initialize crypto
  try {
    if (!window.crypto) {
      console.warn('[env-check] Web Crypto API not available');
    } else {
      // Verify crypto functionality
      const testArray = new Uint8Array(8);
      window.crypto.getRandomValues(testArray);
      if (window.crypto.subtle) {
        console.log('[env-check] Full crypto API available (including subtle)');
      } else {
        console.log('[env-check] Basic crypto API available');
      }
    }
  } catch (e) {
    console.error('[env-check] Crypto verification failed:', e);
  }
}

// Environment status check
const getEnvironmentStatus = () => {
  const status = {
    NODE_ENV: process.env.NODE_ENV,
    VITE_MOCK_DATA: process.env.VITE_MOCK_DATA,
    VITE_SOLANA_NETWORK: process.env.VITE_SOLANA_NETWORK,
    cryptoAvailable: false,
    bufferAvailable: false
  };

  if (typeof window !== 'undefined') {
    status.cryptoAvailable = !!window.crypto;
    status.bufferAvailable = !!window.Buffer;
  }

  return status;
};

console.log('[env-check] Environment status:', getEnvironmentStatus());

// Development mode initialization
if (process.env.NODE_ENV === 'development') {
  console.log('[env-check] Development mode detected');
  
  if (process.env.VITE_MOCK_DATA === 'true') {
    console.log('[env-check] Mock data enabled');
    try {
      window.localStorage.setItem('mock_initialized', 'true');
      window.localStorage.setItem('dev_mode', 'true');
    } catch (e) {
      console.error('[env-check] LocalStorage initialization failed:', e);
    }
  }
  
  // Error tracking
  let errorCount = 0;
  
  // Handle promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    errorCount++;
    const message = event.reason?.message || '';
    
    // Handle slice errors as critical
    if (message.includes('slice')) {
      console.error(`[env-check] Critical slice error (${errorCount}):`, message);
      // Don't prevent default - let the error propagate
      return;
    }
    
    // Non-critical errors
    if (message.includes('readable-stream') || 
        message.includes('browserify-sign') ||
        message.includes('crypto') ||
        message.includes('WebSocket')) {
      console.warn(`[env-check] Non-critical error (${errorCount}):`, message);
      event.preventDefault();
      return;
    }

    console.warn(`[env-check] Unhandled rejection (${errorCount}):`, event.reason);
  });

  // Handle general errors
  window.addEventListener('error', (event) => {
    errorCount++;
    const error = event.error;
    const location = `${event.filename}:${event.lineno}`;
    
    // React initialization errors
    if (location.includes('main.tsx') || 
        location.includes('App.tsx') ||
        error?.toString().includes('React')) {
      console.error(`[env-check] React error (${errorCount}):`, {
        location,
        message: error?.message,
        stack: error?.stack
      });
      return;
    }
    
    // Handle slice errors as critical
    const errorString = error?.toString() || '';
    if (errorString.includes('slice')) {
      console.error(`[env-check] Critical slice error (${errorCount}):`, {
        type: 'initialization',
        location,
        message: error?.message
      });
      // Don't prevent default - let the error propagate
      return;
    }
    
    // Non-critical errors
    if (errorString.includes('readable-stream') ||
        errorString.includes('browserify-sign') ||
        errorString.includes('crypto')) {
      console.warn(`[env-check] Non-critical error (${errorCount}):`, {
        type: 'crypto',
        location,
        message: error?.message
      });
      event.preventDefault();
      return;
    }
    
    console.warn(`[env-check] Error (${errorCount}):`, {
      location,
      type: event.type,
      message: error?.message
    });
  });
}
