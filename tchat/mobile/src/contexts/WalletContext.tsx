import React, { createContext, useContext, useState, useEffect } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import WalletManager from '../utils/wallet';

interface WalletContextType {
  wallet: string | null;
  loading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signMessage: (message: string) => Promise<string>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export function WalletProvider({ children }: { children: React.ReactNode | ((props: { wallet: string | null; loading: boolean }) => React.ReactNode) }) {
  const [wallet, setWallet] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const walletManager = new WalletManager();

  const connect = async () => {
    try {
      setLoading(true);
      setError(null);
      const address = await walletManager.connectWallet();
      setWallet(address);
    } catch (error: any) {
      console.error('Wallet connection error:', error);
      // Use the specific error message from WalletManager if available
      setError(error.message || 'Failed to connect wallet');
      
      // Auto-retry if the error was due to a pending request
      if (error.message?.includes('request already pending')) {
        setTimeout(() => {
          connect();
        }, 1000);
      }
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    walletManager.disconnect();
    setWallet(null);
  };

  const signMessage = async (message: string) => {
    if (!wallet) {
      throw new Error('Wallet not connected');
    }
    return walletManager.signMessage(message);
  };

  useEffect(() => {
    connect();
  }, []);

  const contextValue = {
    wallet,
    loading,
    error,
    connect,
    disconnect,
    signMessage,
  };

  return (
    <WalletContext.Provider value={contextValue}>
      {typeof children === 'function'
        ? children({ wallet, loading })
        : children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
}
