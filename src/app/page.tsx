'use client';

import { Box, Container, Heading, Text, VStack, useColorModeValue, Button } from '@chakra-ui/react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from '@/components/WalletButton';
import { useEffect, useState } from 'react';

export default function Home() {
  const { connected, publicKey, wallet } = useWallet();
  const [isLoading, setIsLoading] = useState(false);
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  useEffect(() => {
    if (connected && publicKey) {
      setIsLoading(true);
      // Simulate loading user data
      setTimeout(() => {
        setIsLoading(false);
      }, 1000);
    }
  }, [connected, publicKey]);

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="center" justify="center" minH="80vh">
        <Heading 
          size="2xl" 
          bgGradient="linear(to-r, blue.400, purple.500)"
          bgClip="text"
        >
          Blockchain Messenger
        </Heading>
        
        <Box
          p={8}
          bg={bgColor}
          borderRadius="xl"
          borderWidth="1px"
          borderColor={borderColor}
          shadow="lg"
          w="full"
          maxW="md"
          textAlign="center"
        >
          {connected && publicKey ? (
            <VStack spacing={4}>
              <Text fontSize="lg" fontWeight="bold">
                Connected Wallet
              </Text>
              <Text fontSize="md" color="gray.500">
                {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
              </Text>
              {isLoading ? (
                <Text>Loading your messages...</Text>
              ) : (
                <VStack spacing={4}>
                  <Text>Your secure messaging interface will appear here</Text>
                  <Button colorScheme="blue" size="lg" width="full">
                    Start Messaging
                  </Button>
                </VStack>
              )}
            </VStack>
          ) : (
            <VStack spacing={6}>
              <Text fontSize="lg">
                Connect your Solana wallet to start messaging
              </Text>
              <Text fontSize="sm" color="gray.500">
                Secure, decentralized communication awaits
              </Text>
              <Box mt={4}>
                <WalletButton />
              </Box>
            </VStack>
          )}
        </Box>
      </VStack>
    </Container>
  );
}
