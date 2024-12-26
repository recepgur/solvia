// Import polyfills first
import './polyfills';

console.log('[main.tsx] Starting application initialization...');

// React and Solana imports
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Cluster } from '@solana/web3.js'
import './styles/index.css'
import './env-check'

// App imports
import App from './App'
import ErrorBoundary from './components/ErrorBoundary'
import { LanguageProvider } from './contexts/LanguageContext'

// Solana imports
import '@solana/wallet-adapter-react-ui/styles.css'
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets'
import { clusterApiUrl } from '@solana/web3.js'

// Set production mode for wallet UI
if (process.env.NODE_ENV === 'production') {
  console.log('[main.tsx] Running in production mode');
}

// Initialize loading state
const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

// Root element is already showing loading state from polyfills.ts
console.log('[main.tsx] Root element ready for React initialization');

// Verify critical dependencies
try {
  // Verify crypto is available
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

  // Loading state is handled by polyfills.ts

  // Create root element
  const rootElement = document.getElementById('root');
  if (!rootElement) throw new Error('Root element not found');

  // Create React root and render app with loading state
  const root = createRoot(rootElement);
  
  // Initialize wallet and render full app immediately
  console.log('[main.tsx] Rendering application with wallet providers...');
  console.log('[main.tsx] Initializing wallet providers...');
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <ConnectionProvider endpoint={endpoint}>
          <WalletProvider 
            wallets={walletAdapters} 
            onError={handleWalletError}
            autoConnect={false}
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

  console.log('[main.tsx] App initialization completed successfully');
} catch (error) {
  console.error('[main.tsx] Critical initialization error:', error);
  throw error;
}
