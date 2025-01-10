import React, { FC, ReactNode, useMemo } from 'react';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter, SolflareWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import dynamic from 'next/dynamic';

require('@solana/wallet-adapter-react-ui/styles.css');

interface Props {
  children: ReactNode;
}

const WalletProviderComponent: FC<Props> = ({ children }) => {
  const endpoint = useMemo(() => clusterApiUrl('devnet'), []);
  const wallets = useMemo(
    () => typeof window !== 'undefined' ? [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ] : [],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};

export const SolviaWalletProvider = dynamic(
  () => Promise.resolve(WalletProviderComponent),
  {
    ssr: false
  }
);
