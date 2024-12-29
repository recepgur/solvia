import React, { useCallback, useEffect, useState } from 'react';
import { useWallet, Wallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Connection, PublicKey } from '@solana/web3.js';
import LoadingSpinner from './ui/LoadingSpinner';
import { useWalletAuth } from '../contexts/WalletContext';
import '@solana/wallet-adapter-react-ui/styles.css';

interface SolvioWalletProps {
  onConnect?: (publicKey: PublicKey) => void;
  onDisconnect?: () => void;
}

const SolvioWallet: React.FC<SolvioWalletProps> = ({
  onConnect,
  onDisconnect
}) => {
  const { publicKey, connected, disconnect, connecting, wallet } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const { authenticate, logout, error: authError, clearError, isLoading: authLoading } = useWalletAuth();
  const [balance, setBalance] = useState<number | null>(null);

  const fetchBalance = useCallback(async (pubKey: PublicKey) => {
    try {
      const connection = new Connection(import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com');
      const balance = await connection.getBalance(pubKey);
      setBalance(balance / 1e9); // Convert lamports to SOL
    } catch (error) {
      console.error('Failed to fetch balance:', error);
    }
  }, []);

  useEffect(() => {
    if (connected && publicKey) {
      authenticate(publicKey);
      onConnect?.(publicKey);
      fetchBalance(publicKey);
    } else {
      logout();
      onDisconnect?.();
      setBalance(null);
    }
  }, [connected, publicKey, authenticate, logout, onConnect, onDisconnect, fetchBalance]);

  const handleError = (error: Error) => {
    console.error('Wallet error:', error);
    setError(error.message);
  };

  useEffect(() => {
    if (wallet && 'on' in wallet && 'off' in wallet) {
      const walletWithEvents = wallet as Wallet & {
        on: (event: string, callback: (error: Error) => void) => void;
        off: (event: string, callback: (error: Error) => void) => void;
      };
      
      walletWithEvents.on('error', handleError);
      return () => {
        walletWithEvents.off('error', handleError);
      };
    }
  }, [wallet]);

  return (
    <div className="flex flex-col items-center gap-4 p-4 bg-white rounded-lg shadow">
      {(error || authError) && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error || authError}</span>
          <button
            className="absolute top-0 right-0 px-4 py-3"
            onClick={() => {
              setError(null);
              clearError();
            }}
          >
            <span className="text-red-500">&times;</span>
          </button>
        </div>
      )}
      {(connecting || authLoading) ? (
        <div className="flex items-center justify-center p-4">
          <LoadingSpinner />
          <span className="ml-2">Connecting wallet...</span>
        </div>
      ) : (
        <WalletMultiButton className="wallet-adapter-button" />
      )}
      
      {connected && publicKey && (
        <div className="text-center">
          <p className="text-sm text-gray-600">Connected Address:</p>
          <p className="text-xs font-mono break-all">{publicKey.toString()}</p>
          {balance !== null ? (
            <p className="mt-2 text-sm">
              Balance: {balance.toFixed(4)} SOL
            </p>
          ) : (
            <p className="mt-2 text-sm text-gray-500">Loading balance...</p>
          )}
          <div className="mt-4 flex flex-col gap-2">
            <button
              onClick={() => {
                disconnect();
                logout();
              }}
              className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
            >
              Disconnect
            </button>
            <button
              onClick={() => fetchBalance(publicKey)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            >
              Refresh Balance
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SolvioWallet;
