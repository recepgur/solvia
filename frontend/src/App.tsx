import React, { useState, useEffect, useMemo } from 'react';
import { initializePolyfills } from './polyfills';
import { LoadingScreen } from './components/ui';
import { WalletProvider } from './contexts/WalletContext';
import { ConnectionProvider, WalletProvider as SolanaWalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  TorusWalletAdapter,
  LedgerWalletAdapter,
  CloverWalletAdapter,
  Coin98WalletAdapter,
  MathWalletAdapter,
  SolongWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import SolvioWallet from './components/SolvioWallet';

interface AppState {
  isLoading: boolean;
  error: string | null;
}

const App: React.FC = () => {
  const [state, setState] = useState<AppState>({
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Ensure polyfills (including Buffer) are initialized
        await initializePolyfills();
        setState({ isLoading: false, error: null });
      } catch (error) {
        console.error('Failed to initialize application:', error);
        setState({
          isLoading: false,
          error: 'Failed to initialize application. Please refresh the page.'
        });
      }
    };

    initializeApp();
  }, []);

  if (state.isLoading) {
    return <LoadingScreen message="Loading application..." />;
  }

  if (state.error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{state.error}</p>
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            onClick={() => {
              setState({ isLoading: true, error: null });
              initializePolyfills().then(() => {
                setState({ isLoading: false, error: null });
              }).catch(error => {
                console.error('Failed to initialize application:', error);
                setState({
                  isLoading: false,
                  error: 'Failed to initialize application. Please try again.'
                });
              });
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const endpoint = import.meta.env.VITE_SOLANA_RPC_URL || clusterApiUrl('devnet');
  const wallets = useMemo(() => [
    new PhantomWalletAdapter(),
    new SolflareWalletAdapter(),
    new TorusWalletAdapter(),
    new LedgerWalletAdapter(),
    new CloverWalletAdapter(),
    new Coin98WalletAdapter(),
    new MathWalletAdapter(),
    new SolongWalletAdapter(),
  ], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <SolanaWalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <WalletProvider>
            <div className="min-h-screen bg-gray-100">
              <div className="container mx-auto px-4 py-8">
                <h1 className="text-2xl font-bold mb-4">Solvio Application</h1>
                <SolvioWallet />
                {/* Add your app components here */}
              </div>
            </div>
          </WalletProvider>
        </WalletModalProvider>
      </SolanaWalletProvider>
    </ConnectionProvider>
  );
};

export default App;
