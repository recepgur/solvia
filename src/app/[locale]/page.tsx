'use client';

import { Box, Container, Heading, Text, VStack, useColorModeValue } from '@chakra-ui/react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletButton } from '@/components/WalletButton';
import { ChatInterface } from '@/components/ChatInterface';
import { useTranslations } from 'next-intl';

export default function Home() {
  const { connected, publicKey } = useWallet();
  const t = useTranslations();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={8} align="center" justify="center">
        <Heading 
          size="2xl" 
          bgGradient="linear(to-r, blue.400, purple.500)"
          bgClip="text"
          mb={4}
        >
          Solvio Messenger
        </Heading>
        
        {connected && publicKey ? (
          <ChatInterface />
        ) : (
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
            <VStack spacing={6}>
              <Text fontSize="lg">
                {t('common.connect_wallet')}
              </Text>
              <Text fontSize="sm" color="gray.500">
                {t('common.loading')}
              </Text>
              <Box mt={4}>
                <WalletButton />
              </Box>
            </VStack>
          </Box>
        )}
      </VStack>
    </Container>
  );
}
