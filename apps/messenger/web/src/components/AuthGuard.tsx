import React, { FC, ReactNode } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

interface Props {
  children: ReactNode;
}

export const AuthGuard: FC<Props> = ({ children }) => {
  const { connected } = useWallet();

  if (!connected) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Connect your wallet
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Please connect your Solana wallet to access the messenger
            </p>
          </div>
          <div className="flex justify-center">
            <WalletMultiButton />
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
