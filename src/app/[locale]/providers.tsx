'use client';

import React from 'react';
import { NextIntlClientProvider } from 'next-intl';
import { WalletProvider } from '@/contexts/WalletContext';

export function Providers({ children, messages }: { children: React.ReactNode; messages: any }) {
  return (
    <NextIntlClientProvider messages={messages}>
      <WalletProvider>
        {children}
      </WalletProvider>
    </NextIntlClientProvider>
  );
}
