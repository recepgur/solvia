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

export function WalletProvider({ children }: { children: React.ReactNode }) {
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
    } catch (error) {
      console.error('Wallet connection error:', error);
      setError('Failed to connect wallet');
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

  return (
    <WalletContext.Provider
      value={{
        wallet,
        loading,
        error,
        connect,
        disconnect,
        signMessage,
      }}
    >
      {children}
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
