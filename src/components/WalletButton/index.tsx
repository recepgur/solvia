'use client';

import React, { FC, useCallback, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Box, useToast, Spinner } from '@chakra-ui/react';

export const WalletButton: FC = () => {
  const { connected, connecting, disconnecting, publicKey, wallet } = useWallet();
  const toast = useToast();

  const handleConnectionChange = useCallback(() => {
    if (connected && publicKey) {
      toast({
        title: 'Wallet Connected',
        description: `Connected to ${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`,
        status: 'success',
        duration: 3000,
        isClosable: true,
      });
    }
  }, [connected, publicKey, toast]);

  const handleError = useCallback((error: Error) => {
    toast({
      title: 'Connection Error',
      description: error.message,
      status: 'error',
      duration: 5000,
      isClosable: true,
    });
  }, [toast]);

  useEffect(() => {
    handleConnectionChange();
  }, [connected, handleConnectionChange]);

  return (
    <Box position="relative">
      <WalletMultiButton />
      {(connecting || disconnecting) && (
        <Box
          position="absolute"
          top="0"
          left="0"
          right="0"
          bottom="0"
          display="flex"
          alignItems="center"
          justifyContent="center"
          bg="blackAlpha.300"
          borderRadius="md"
          backdropFilter="blur(2px)"
        >
          <Spinner size="sm" color="blue.500" mr={2} />
          {connecting ? 'Connecting...' : 'Disconnecting...'}
        </Box>
      )}
    </Box>
  );
};
