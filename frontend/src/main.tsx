// Import polyfills first
// Import and initialize polyfills before React
import './polyfills';

console.log('[main.tsx] Starting application initialization...');

// Verify critical globals are available
if (typeof window === 'undefined' || !window.Buffer || !window.stream?.Readable || !(window as any).process?.env) {
  console.error('[main.tsx] Critical globals not initialized');
  throw new Error('Application initialization failed: Required globals not available');
}

// Set production mode for wallet UI
if (process.env.NODE_ENV === 'production') {
  console.log('[main.tsx] Running in production mode');
}

// Initialize loading state
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Show initial loading state
rootElement.innerHTML = `
  <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#1a1b23;color:#fff;">
    <div style="text-align:center;">
      <h1 style="color:#00a884;font-size:24px;margin-bottom:16px;">Loading Solvio...</h1>
      <p style="color:#aaa;font-size:14px;">Initializing secure environment</p>
    </div>
  </div>
`;

// Verify critical dependencies
try {
  // Import and verify crypto
  const crypto = require('crypto-browserify');
  if (!crypto) {
    throw new Error('Failed to load crypto-browserify');
  }
  
  // Verify Buffer is available globally
  if (!window.Buffer || !window.Buffer.from) {
    throw new Error('Buffer not properly initialized');
  }

  // Test Buffer functionality
  const testBuffer = Buffer.from('test');
  testBuffer.slice(0, 2);
  
  console.log('[main.tsx] Critical dependencies verified successfully');
} catch (error) {
  console.error('[main.tsx] Critical initialization error:', error);
  if (rootElement) {
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    rootElement.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;background:#1a1b23;color:#fff;padding:20px;text-align:center;">
        <h1 style="color:#ff4444;margin-bottom:20px;">Initialization Error</h1>
        <p style="color:#aaa;max-width:600px;">We encountered an error while initializing the application. Please refresh the page or try again later.</p>
        <pre style="background:#2d2e3d;padding:15px;border-radius:5px;margin-top:20px;max-width:90%;overflow-x:auto;">${errorMessage}</pre>
      </div>
    `;
  }
  throw error;
}

console.log('[main.tsx] Starting initialization...');

// React imports
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { LanguageProvider } from './contexts/LanguageContext'
import './env-check'

// Solana imports
import '@solana/wallet-adapter-react-ui/styles.css'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl, Cluster } from '@solana/web3.js'

// Initialize app with proper error handling
try {
  console.log('[main.tsx] Starting app initialization...');
  
  // Verify environment variables
  const requiredEnvVars = {
    NODE_ENV: process.env.NODE_ENV,
    VITE_SOLANA_NETWORK: process.env.VITE_SOLANA_NETWORK
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }

  console.log('[main.tsx] Environment:', {
    ...requiredEnvVars,
    VITE_MOCK_DATA: process.env.VITE_MOCK_DATA
  });

  // Initialize wallet adapters with error handling
  const walletAdapters = [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter()
  ];

  // Set up Solana network endpoint
  const network = (process.env.VITE_SOLANA_NETWORK || 'devnet') as Cluster;
  const endpoint = clusterApiUrl(network);

  // Error handling for wallet connection
  const handleWalletError = (error: Error) => {
    console.error('[main.tsx] Wallet error:', error);
  };

  // Loading component
  const LoadingFallback = () => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#1a1b23] to-[#2d2e3d]">
      <div className="animate-pulse">
        <p className="text-2xl font-semibold text-[#00a884] mb-4">Loading Solvio...</p>
        <p className="text-sm text-gray-400">Initializing secure environment</p>
      </div>
    </div>
  );

  // Create root element
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  // Create React root and render app with loading state
  const root = createRoot(rootElement);
  
  // Show loading state first
  root.render(<LoadingFallback />);
  
  // Initialize wallet and render full app
  console.log('[main.tsx] Initializing wallet providers...');
  setTimeout(() => {
    root.render(
      <StrictMode>
        <ErrorBoundary>
          <ConnectionProvider endpoint={endpoint}>
            <WalletProvider 
              wallets={walletAdapters} 
              onError={handleWalletError}
              autoConnect={process.env.NODE_ENV === 'production'}
            >
              <WalletModalProvider>
                <LanguageProvider>
                  <App />
                </LanguageProvider>
              </WalletModalProvider>
            </WalletProvider>
          </ConnectionProvider>
        </ErrorBoundary>
      </StrictMode>
    );
    console.log('[main.tsx] Wallet providers initialized');
  }, 1000); // Give time for polyfills and initialization

  console.log('[main.tsx] App initialization completed successfully');
} catch (error) {
  console.error('[main.tsx] Critical initialization error:', error);
  throw error;
}
