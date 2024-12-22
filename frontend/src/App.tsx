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

  // Log wallet and verification state
  useEffect(() => {
    console.log('Wallet and verification state:', {
      publicKey: publicKey?.toString(),
      connected,
      connecting,
      hasPaid,
      isVerifying,
      verificationError: verificationError ? String(verificationError) : undefined,
      endpoint,
    });
  }, [publicKey, connected, connecting, hasPaid, isVerifying, verificationError, endpoint]);
  
  // Debug wallet and verification state
  useEffect(() => {
    console.log('Environment variables:', {
      network: import.meta.env.VITE_SOLANA_NETWORK,
      tokenAddress: import.meta.env.VITE_SOLVIO_TOKEN_ADDRESS,
      feeVault: import.meta.env.VITE_FEE_VAULT,
    });
    
    console.log('Wallet state:', {
      publicKey: publicKey?.toString(),
      hasPaid,
      isVerifying,
      verificationError,
      connected: !!publicKey,
      endpoint,
    });

    if (verificationError) {
      console.error('Verification error details:', verificationError);
    }
  }, [publicKey, hasPaid, isVerifying, verificationError, endpoint]);
  
  // Handle fee payment
  const handleFeePayment = async () => {
    try {
      await payFee();
    } catch (error) {
      console.error('Failed to pay access fee:', error);
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
                <button
                  onClick={() => window.location.reload()}
                  className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Reload Page
                </button>
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
