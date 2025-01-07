'use client';

import React from 'react';
import { ChakraProvider } from '@chakra-ui/react';
import { NextIntlClientProvider } from 'next-intl';
import { WalletProvider } from '@/contexts/WalletContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <NextIntlClientProvider messages={{}}>
      <ChakraProvider>
        <WalletProvider>
          {children}
        </WalletProvider>
      </ChakraProvider>
    </NextIntlClientProvider>
  );
}
