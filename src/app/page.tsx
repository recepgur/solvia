'use client';

import { Box, Heading, Text, VStack } from '@chakra-ui/react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from '@/components/WalletButton';

export default function Home() {
  const { connected, connecting } = useWallet();

  return (
    <VStack spacing={4} align="center" justify="center" minH="80vh">
      <Heading>Welcome to Blockchain Messenger</Heading>
      {connecting ? (
        <Text>Connecting...</Text>
      ) : connected ? (
        <Text>Connected to Solana wallet</Text>
      ) : (
        <Box>
          <Text mb={4}>Please connect your wallet to start messaging</Text>
          <WalletButton />
        </Box>
      )}
    </VStack>
  );
}
