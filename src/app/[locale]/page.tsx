'use client';

import React from 'react';
import { Box, Container, VStack } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import WalletConnectButton from '@/components/WalletConnectButton';
import ChatInterface from '@/components/ChatInterface';
import CallInterface from '@/components/CallInterface';
import LanguageSwitcher from '@/components/LanguageSwitcher';

export default function Home() {
  const t = useTranslations('common');
  const [isCallActive, setIsCallActive] = React.useState(false);

  return (
    <Container maxW="container.xl" p={4}>
      <VStack spacing={4} align="stretch">
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <WalletConnectButton />
          <LanguageSwitcher />
        </Box>
        
        <ChatInterface onStartCall={() => setIsCallActive(true)} />
        
        <CallInterface 
          isActive={isCallActive}
          onEndCall={() => setIsCallActive(false)}
        />
      </VStack>
    </Container>
  );
}
