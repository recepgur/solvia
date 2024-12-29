import React, { createContext, useContext, useState, useCallback } from 'react';
import { PublicKey } from '@solana/web3.js';

interface WalletContextType {
  isAuthenticated: boolean;
  publicKey: PublicKey | null;
  authenticate: (publicKey: PublicKey) => Promise<void>;
  logout: () => void;
  error: string | null;
  clearError: () => void;
  isLoading: boolean;
}

const WalletContext = createContext<WalletContextType>({
  isAuthenticated: false,
  publicKey: null,
  authenticate: async () => {},
  logout: () => {},
  error: null,
  clearError: () => {},
  isLoading: false,
});

export const useWalletAuth = () => useContext(WalletContext);

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const authenticate = useCallback(async (publicKey: PublicKey) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Here we could add additional authentication steps
      // For example, verify wallet ownership with signed message
      // or check for specific NFTs/tokens
      
      setIsAuthenticated(true);
      setPublicKey(publicKey);
      
      localStorage.setItem('walletAuth', JSON.stringify({
        isAuthenticated: true,
        publicKey: publicKey.toString(),
        timestamp: Date.now()
      }));
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to authenticate wallet';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    setIsAuthenticated(false);
    setPublicKey(null);
    setError(null);
    localStorage.removeItem('walletAuth');
  }, []);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return (
    <WalletContext.Provider 
      value={{ 
        isAuthenticated, 
        publicKey, 
        authenticate, 
        logout,
        error,
        clearError,
        isLoading
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};
