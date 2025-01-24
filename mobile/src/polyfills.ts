import { Buffer } from 'buffer';
import 'react-native-get-random-values';

console.log('Initializing polyfills...');

// Define browser object that will be exported
const browserPolyfill = {
  runtime: {
    connect: () => ({}),
    sendMessage: () => {},
    onMessage: {
      addListener: () => {},
      removeListener: () => {}
    }
  },
  storage: {
    local: {
      get: async () => ({}),
      set: async () => {}
    }
  }
};

// Provide nanoid implementation
const nanoid = (size = 21) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < size; i++) {
    id += charset[Math.floor(Math.random() * charset.length)];
  }
  return id;
};

// Add nanoid to global scope
if (typeof window !== 'undefined') {
  (window as any).nanoid = nanoid;
}

// Initialize global object and process for web environment
let g: any;

function initializePolyfills() {
  if (typeof window === 'undefined') {
    console.warn('Window object not available - skipping polyfill initialization');
    return;
  }

  console.log('Starting polyfill initialization...');
  g = window;

  // Initialize browser object globally first
  if (!(window as any).browser) {
    (window as any).browser = browserPolyfill;
    console.log('Browser object initialized globally');
  }
  
  try {
    // Set up global object and browser
    console.log('Setting up global object...');
    g.global = window;
    g.Buffer = Buffer;
    
    // Initialize browser object
    console.log('Initializing browser object...');
    if (!g.browser) {
      g.browser = browserPolyfill;
      console.log('Browser polyfill initialized:', g.browser);
    } else {
      console.log('Browser object already exists:', g.browser);
    }
    
    // Set up process
    console.log('Setting up process object...');
    g.process = {
      env: { NODE_ENV: process.env.NODE_ENV },
      version: '',
      nextTick: (cb: Function) => setTimeout(cb, 0)
    };
    console.log('Process object initialized');
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error during polyfill initialization:', error);
      console.error('Error stack:', error.stack);
    } else {
      console.error('Unknown error during polyfill initialization:', error);
    }
  }

  try {
    // Set up window.solana for Phantom wallet
    console.log('Setting up Solana wallet polyfill...');
    if (!g.solana) {
      g.solana = {
        isPhantom: false,
        connect: async () => {
          throw new Error('Phantom wallet not installed');
        },
        disconnect: async () => {},
        signMessage: async (message: Uint8Array) => {
          throw new Error('Phantom wallet not installed');
        },
        signTransaction: async (transaction: any) => {
          throw new Error('Phantom wallet not installed');
        },
        signAllTransactions: async (transactions: any[]) => {
          throw new Error('Phantom wallet not installed');
        },
        request: async (method: string, params: any) => {
          throw new Error('Phantom wallet not installed');
        }
      };
      console.log('Solana wallet polyfill initialized');
    }

    // Crypto polyfill
    console.log('Setting up crypto polyfill...');
    if (!g.crypto) {
      g.crypto = {
        getRandomValues: (buffer: Uint8Array) => {
          for (let i = 0; i < buffer.length; i++) {
            buffer[i] = Math.floor(Math.random() * 256);
          }
          return buffer;
        },
        subtle: {}
      };
      console.log('Crypto polyfill initialized');
    }

    // TextEncoder polyfill
    console.log('Setting up TextEncoder polyfill...');
    if (!g.TextEncoder) {
      g.TextEncoder = class TextEncoder {
        encode(str: string): Uint8Array {
          const arr = new Uint8Array(str.length);
          for (let i = 0; i < str.length; i++) {
            arr[i] = str.charCodeAt(i);
          }
          return arr;
        }
      };
      console.log('TextEncoder polyfill initialized');
    }

    // Additional React Native Web compatibility
    console.log('Setting up React Native Web compatibility...');
    const defaultLocale = {
      languageTag: 'en-US',
      textDirection: 'ltr',
      calendar: 'gregory',
      numberingSystem: 'latn',
      timeZone: 'UTC',
    };

    // Extend navigator instead of replacing
    Object.defineProperties(g.navigator, {
      product: { value: 'ReactNative' },
      userAgent: { value: 'ReactNative' },
      platform: { value: 'web' },
      language: { value: 'en-US' },
      languages: { value: ['en-US'] },
      onLine: { value: true },
      getGamepads: { value: () => [] },
      scheduling: { value: {} },
      keyboard: { value: {} },
      clipboard: { value: {} },
      credentials: { value: {} },
      storage: { value: {} },
      serviceWorker: { value: {} },
      permissions: { value: {} },
      // Add locale-specific functions
      useLocale: { value: () => defaultLocale },
      getLocale: { value: () => defaultLocale },
      getPreferredLanguages: { value: () => ['en-US'] },
      formatLocale: { value: (l: string) => l }
    });
    g.__DEV__ = process.env.NODE_ENV !== 'production';
    console.log('React Native Web compatibility initialized');

    // WebRTC polyfills
    console.log('Setting up WebRTC polyfills...');
    if (!g.RTCPeerConnection) {
      g.RTCPeerConnection = g.RTCPeerConnection || g.webkitRTCPeerConnection || g.mozRTCPeerConnection;
    }
    if (!g.RTCSessionDescription) {
      g.RTCSessionDescription = g.RTCSessionDescription || g.webkitRTCSessionDescription || g.mozRTCSessionDescription;
    }
    if (!g.RTCIceCandidate) {
      g.RTCIceCandidate = g.RTCIceCandidate || g.webkitRTCIceCandidate || g.mozRTCIceCandidate;
    }
    console.log('WebRTC polyfills initialized');
  } catch (error: unknown) {
    if (error instanceof Error) {
      console.error('Error during additional polyfill initialization:', error);
      console.error('Error stack:', error.stack);
      // Re-throw to ensure calling code knows initialization failed
      throw new Error('Polyfill initialization failed: ' + error.message);
    } else {
      console.error('Unknown error during additional polyfill initialization:', error);
      throw new Error('Polyfill initialization failed: Unknown error');
    }
  }
}

// Initialize polyfills when DOM is ready
function initializeWhenReady() {
  if (typeof window === 'undefined') {
    console.warn('Window object not available - waiting for initialization');
    setTimeout(initializeWhenReady, 100);
    return;
  }

  if (document.readyState === 'complete') {
    try {
      initializePolyfills();
      console.log('All polyfills initialized successfully');
    } catch (error) {
      console.error('Failed to initialize polyfills:', error);
    }
  } else {
    document.addEventListener('DOMContentLoaded', () => {
      try {
        initializePolyfills();
        console.log('All polyfills initialized successfully');
      } catch (error) {
        console.error('Failed to initialize polyfills:', error);
      }
    });
  }
}

// Start initialization process
initializeWhenReady();

// Export for module usage
export { browserPolyfill as browser };
export default browserPolyfill;
