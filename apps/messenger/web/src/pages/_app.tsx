import React from 'react';
import type { AppProps } from 'next/app';
import { SolviaWalletProvider } from '@/components/WalletProvider';
import { AuthGuard } from '@/components/AuthGuard';
import { CallNotification } from '@/components/CallNotification';
import { useCallNotification } from '@/hooks/useCallNotification';
import '@/styles/globals.css';

function MyApp({ Component, pageProps }: AppProps) {
  const { incomingCall, onAcceptCall, onRejectCall } = useCallNotification();

  return (
    <SolviaWalletProvider>
      <AuthGuard>
        <Component {...pageProps} />
        {incomingCall && (
          <CallNotification
            call={incomingCall}
            onAccept={onAcceptCall}
            onReject={onRejectCall}
          />
        )}
      </AuthGuard>
    </SolviaWalletProvider>
  );
}

export default MyApp;
