'use client';

import React from 'react';
import { Box, Container, VStack } from '@chakra-ui/react';
import { useTranslations } from 'next-intl';
import WalletConnectButton from '../WalletConnectButton';
import ChatInterface from '../ChatInterface';
import CallInterface from '../CallInterface';
import LanguageSwitcher from '../LanguageSwitcher';

interface ChatInterfaceProps {
  onStartCall: () => void;
}

interface CallInterfaceProps {
  isActive: boolean;
  onEndCall: () => void;
}



export default function HomeContent() {
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
