import React from 'react';
import type { AppProps } from 'next/app';
import { SolviaWalletProvider } from '@/components/WalletProvider';
import { AuthGuard } from '@/components/AuthGuard';
import '@/styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <SolviaWalletProvider>
      <AuthGuard>
        <Component {...pageProps} />
      </AuthGuard>
    </SolviaWalletProvider>
  );
}

export default MyApp;
