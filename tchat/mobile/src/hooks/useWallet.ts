import { useState, useEffect, useCallback } from 'react';
import WalletManager from '../utils/wallet';

export function useWallet() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const walletManager = new WalletManager();

  const connect = useCallback(async () => {
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
  }, []);

  const disconnect = useCallback(() => {
    walletManager.disconnect();
    setWallet(null);
  }, []);

  useEffect(() => {
    connect();
  }, [connect]);

  return {
    wallet,
    loading,
    error,
    connect,
    disconnect,
    signMessage: walletManager.signMessage.bind(walletManager),
    sendTransaction: walletManager.sendTransaction.bind(walletManager),
  };
}
