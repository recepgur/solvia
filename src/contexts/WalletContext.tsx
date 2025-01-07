'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

interface WalletContextType {
  connected: boolean;
  publicKey: string | null;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

const WalletContext = createContext<WalletContextType>({
  connected: false,
  publicKey: null,
  connect: async () => {},
  disconnect: async () => {},
});

export const useWallet = () => useContext(WalletContext);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== 'undefined' && window.solana?.isPhantom) {
        try {
          // Check connection status by attempting to get the public key
          const publicKey = window.solana.publicKey?.toString();
          if (publicKey) {
            setConnected(true);
            setPublicKey(publicKey);
          }
        } catch (error) {
          console.error('Error checking wallet connection:', error);
          setConnected(false);
          setPublicKey(null);
        }
      }
    };

    checkConnection();
  }, []);

  const connect = async () => {
    try {
      if (typeof window !== 'undefined' && window.solana?.isPhantom) {
        const response = await window.solana.connect();
        setConnected(true);
        setPublicKey(response.publicKey.toString());
      } else {
        window.open('https://phantom.app/', '_blank');
      }
    } catch (error) {
      console.error('Error connecting to wallet:', error);
    }
  };

  const disconnect = async () => {
    try {
      if (typeof window !== 'undefined' && window.solana?.isPhantom) {
        await window.solana.disconnect();
        setConnected(false);
        setPublicKey(null);
      }
    } catch (error) {
      console.error('Error disconnecting wallet:', error);
    }
  };

  return (
    <WalletContext.Provider value={{ connected, publicKey, connect, disconnect }}>
      {children}
    </WalletContext.Provider>
  );
};
