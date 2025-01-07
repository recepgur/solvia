'use client';

import React, { FC } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Box } from '@chakra-ui/react';

export const WalletButton: FC = () => {
  const { connected } = useWallet();

  return (
    <Box>
      <WalletMultiButton />
    </Box>
  );
};
