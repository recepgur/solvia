import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';

const Home: React.FC = () => {
  const { connected } = useWallet();
  const router = useRouter();

  useEffect(() => {
    if (connected) {
      router.push('/chat');
    }
  }, [connected, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h1 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Solvia Messenger
          </h1>
          <p className="mt-2 text-center text-sm text-gray-600">
            Connect your wallet to start messaging
          </p>
        </div>
        <div className="flex justify-center">
          <WalletMultiButton />
        </div>
      </div>
    </div>
  );
};

export default Home;
