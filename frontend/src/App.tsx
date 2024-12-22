import { useState, useMemo, useEffect } from 'react';
import { Layout } from './components/Layout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { useNetworkStore } from './stores/networkStore';
import { VideoCall } from './components/VideoCall';
import { useWallet } from '@solana/wallet-adapter-react';
import { NFTProfile } from './components/NFTProfile';
import { PrivateRooms } from './components/PrivateRooms';
import { VoiceRooms } from './components/VoiceRooms';
import { GroupChat } from './components/GroupChat';
import { GroupList } from './components/GroupList';
import { CreateGroupModal } from './components/CreateGroupModal';
import { useGroups } from './hooks/useGroups';
import type { Group } from './types/group.types';
import { LanguageProvider } from './contexts/LanguageContext';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import { useTokenVerification } from './hooks/useTokenVerification';
import '@solana/wallet-adapter-react-ui/styles.css';

function App() {
  const [activeView, setActiveView] = useState('video');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>();
  const { groups, createGroup, leaveGroup, sendMessage } = useGroups();
  const selectedGroupData = selectedGroup ? groups.find((g: Group) => g.id === selectedGroup) : undefined;
  // Support multiple networks while maintaining decentralization
  const { network } = useNetworkStore();
  const endpoint = useMemo(() => {
    try {
      // Validate and convert network string to Cluster type
      const validateNetwork = (net: string | null): 'devnet' | 'testnet' | 'mainnet-beta' => {
        switch (net) {
          case 'devnet':
          case 'testnet':
          case 'mainnet-beta':
            return net;
          default:
            console.log('Invalid or missing network, defaulting to devnet');
            return 'devnet';
        }
      };

      const selectedNetwork = validateNetwork(network);
      console.log('Initializing Solana connection with network:', selectedNetwork);
      return clusterApiUrl(selectedNetwork);
    } catch (err) {
      console.error('Error initializing Solana endpoint:', err);
      return clusterApiUrl('devnet');
    }
  }, [network]);
  const wallets = useMemo(() => {
    try {
      console.log('Initializing wallet adapter...');
      const adapter = new PhantomWalletAdapter();
      console.log('Wallet adapter initialized successfully');
      return [adapter];
    } catch (error) {
      console.error('Failed to initialize wallet adapter:', error instanceof Error ? error.message : String(error));
      throw error;
    }
  }, []);

  const { publicKey, connected, connecting } = useWallet();
  
  // Token verification for one-time fee
  const { hasPaid, isLoading: isVerifying, error: verificationError, payFee } = useTokenVerification();

  // Enhanced wallet connection state logging and error handling
  useEffect(() => {
    try {
      if (connecting) {
        console.log('Wallet is connecting...');
        return;
      }

      if (!connected) {
        console.log('Wallet not connected');
        return;
      }

      if (!publicKey) {
        console.warn('Connected but no public key available');
        return;
      }

      console.log('Wallet and verification state:', {
        publicKey: publicKey.toString(),
        connected,
        connecting: false,
        hasPaid,
        isVerifying,
        verificationError: verificationError ? String(verificationError) : undefined,
        endpoint,
      });
    } catch (error) {
      console.error('Error in wallet state management:', error);
    }
  }, [publicKey, connected, connecting, hasPaid, isVerifying, verificationError, endpoint]);
  
  // Enhanced debug logging and error handling for wallet and verification state
  useEffect(() => {
    try {
      // Validate environment configuration
      const envConfig = {
        network: import.meta.env.VITE_SOLANA_NETWORK,
        tokenAddress: import.meta.env.VITE_SOLVIO_TOKEN_ADDRESS,
        feeVault: import.meta.env.VITE_FEE_VAULT,
      };

      if (!envConfig.network || !envConfig.tokenAddress || !envConfig.feeVault) {
        console.error('Missing required environment configuration:', 
          Object.entries(envConfig)
            .filter(([, value]) => !value)
            .map(([key]) => key)
        );
        return;
      }

      console.log('Environment configuration validated:', envConfig);
      
      // Enhanced wallet state logging
      const walletState = {
        publicKey: publicKey?.toString() ?? 'Not available',
        hasPaid,
        isVerifying,
        verificationError: verificationError ? String(verificationError) : undefined,
        connected: connected && !!publicKey,
        endpoint,
      };

      console.log('Current wallet state:', walletState);

      if (verificationError) {
        console.error('Token verification error:', verificationError);
      }
    } catch (error) {
      console.error('Error in wallet verification state management:', error);
    }
  }, [publicKey, hasPaid, isVerifying, verificationError, endpoint, connected]);
  
  // Enhanced fee payment handler with proper wallet checks
  const handleFeePayment = async () => {
    try {
      if (!connected || !publicKey) {
        console.error('Cannot process payment: Wallet not properly connected');
        return;
      }

      if (connecting) {
        console.log('Wallet is still connecting, please wait...');
        return;
      }

      await payFee();
    } catch (error) {
      console.error('Failed to pay access fee:', error instanceof Error ? error.message : String(error));
    }
  };

  const renderView = () => {
    switch (activeView) {
      case 'video':
        return <VideoCall />;
      case 'messages':
        return (
          <>
            {showCreateGroup && (
              <CreateGroupModal
                onClose={() => setShowCreateGroup(false)}
                onSubmit={async (data) => {
                  try {
                    await createGroup(data);
                    setShowCreateGroup(false);
                  } catch (error) {
                    console.error('Error creating group:', error);
                  }
                }}
              />
            )}
            <div className="flex h-full">
              <GroupList
                groups={groups}
                onGroupSelect={setSelectedGroup}
                onCreateGroup={() => setShowCreateGroup(true)}
              />
              {selectedGroup && (
                <GroupChat
                  group={selectedGroupData ?? groups[0]}
                  onLeaveGroup={async (groupId) => {
                    try {
                      await leaveGroup(groupId);
                      setSelectedGroup(undefined);
                    } catch (error) {
                      console.error('Error leaving group:', error);
                    }
                  }}
                  onSendMessage={async (content, replyTo) => {
                    try {
                      await sendMessage(selectedGroup, content, replyTo);
                    } catch (error) {
                      console.error('Error sending message:', error);
                    }
                  }}
                />
              )}
            </div>
          </>
        );
      case 'profile':
        return <NFTProfile />;
      case 'rooms':
        return <PrivateRooms />;
      case 'voice':
        return <VoiceRooms />;
      default:
        return <VideoCall />;
    }
  };

  // Wrap the entire app in error boundaries for better error handling
  return (
    <ErrorBoundary>
      <ConnectionProvider endpoint={endpoint}>
        <ErrorBoundary
          fallback={
            <div className="flex items-center justify-center h-screen">
              <div className="text-center p-8 max-w-md mx-auto bg-white rounded-lg shadow-lg">
                <h2 className="text-2xl font-bold mb-4">Wallet Connection Error</h2>
                <p className="mb-4">Failed to initialize wallet connection. Please try again.</p>
                <div className="space-y-4">
                  <p className="text-sm text-gray-600">
                    Make sure you have a Solana wallet installed and properly configured.
                  </p>
                  <div className="flex justify-center space-x-4">
                    <button
                      onClick={() => window.location.reload()}
                      className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Reload Page
                    </button>
                    <button
                      onClick={() => window.open('https://phantom.app', '_blank')}
                      className="bg-purple-500 text-white px-6 py-2 rounded-lg hover:bg-purple-600 transition-colors"
                    >
                      Get Phantom Wallet
                    </button>
                  </div>
                </div>
              </div>
            </div>
          }
        >
          <WalletProvider wallets={wallets} autoConnect>
            <WalletModalProvider>
              <LanguageProvider>
            {isVerifying ? (
              <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
                  <p>Verifying access...</p>
                </div>
              </div>
            ) : !hasPaid ? (
              <div className="flex items-center justify-center h-screen">
                <div className="text-center p-8 max-w-md mx-auto bg-white rounded-lg shadow-lg">
                  <h2 className="text-2xl font-bold mb-4">Welcome to Solvio</h2>
                  <p className="mb-6">To access the application, a one-time fee of 1 SOLV token is required.</p>
                  {verificationError && (
                    <p className="text-red-500 mb-4">{verificationError}</p>
                  )}
                  {!publicKey ? (
                    <button
                      onClick={() => (document.querySelector('[data-testid="wallet-modal-button"]') as HTMLElement)?.click()}
                      className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Connect Wallet
                    </button>
                  ) : (
                    <button
                      onClick={handleFeePayment}
                      className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                    >
                      Pay Access Fee
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <Layout onViewChange={setActiveView}>
                {renderView()}
              </Layout>
            )}
              </LanguageProvider>
            </WalletModalProvider>
          </WalletProvider>
        </ErrorBoundary>
      </ConnectionProvider>
    </ErrorBoundary>
  );
}

export default App
