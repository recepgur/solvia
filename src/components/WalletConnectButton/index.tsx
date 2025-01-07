'use client';

import React from 'react';
import { useWallet } from '../../contexts/WalletContext';
import { useTranslations } from 'next-intl';

const WalletConnectButton: React.FC = () => {
  const { connected, publicKey, connect, disconnect } = useWallet();
  const t = useTranslations('common');

  const handleClick = () => {
    if (connected) {
      disconnect();
    } else {
      connect();
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`px-4 py-2 rounded-lg font-medium ${
        connected ? 'bg-green-500' : 'bg-blue-500'
      } text-white hover:opacity-90 transition-opacity`}
    >
      {connected ? (
        <span>
          {publicKey?.slice(0, 4)}...{publicKey?.slice(-4)}
        </span>
      ) : (
        t('connect_wallet')
      )}
    </button>
  );
};

export default WalletConnectButton;
