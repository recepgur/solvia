'use client';

import React from 'react';
import { Button, Text } from '@chakra-ui/react';
import { useWallet } from '@/contexts/WalletContext';
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
    <Button
      onClick={handleClick}
      colorScheme={connected ? 'green' : 'blue'}
      variant="solid"
    >
      {connected ? (
        <Text>
          {publicKey?.slice(0, 4)}...{publicKey?.slice(-4)}
        </Text>
      ) : (
        t('connect_wallet')
      )}
    </Button>
  );
};

export default WalletConnectButton;
