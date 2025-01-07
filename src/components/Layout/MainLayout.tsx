'use client';

import React from 'react';
import { Box, Container, Flex, useColorModeValue, Text } from '@chakra-ui/react';
import { WalletButton } from '../WalletButton';
import { LanguageSwitcher } from '../LanguageSwitcher';
import { useTranslations } from 'next-intl';

export const MainLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const t = useTranslations('common');
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const headerBgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box minH="100vh" bg={bgColor}>
      <Flex 
        as="header" 
        bg={headerBgColor} 
        p={4} 
        shadow="sm" 
        borderBottom="1px" 
        borderColor={borderColor}
      >
        <Container maxW="7xl">
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={4}>
              <Text fontSize="2xl" fontWeight="bold">{t('app_name')}</Text>
              <LanguageSwitcher />
            </Flex>
            <WalletButton />
          </Flex>
        </Container>
      </Flex>
      <Container maxW="7xl" py={8}>
        {children}
      </Container>
    </Box>
  );
};
