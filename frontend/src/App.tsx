import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { Layout } from './components/Layout';
import { IntroScreen } from './components/IntroScreen';
import { useGasFee } from './hooks';
import { VideoCall } from './components/VideoCall';
import { NFTProfile } from './components/NFTProfile';
import { PrivateRooms } from './components/PrivateRooms';
import { VoiceRooms } from './components/VoiceRooms';
import { GroupChat } from './components/GroupChat';
import { GroupList } from './components/GroupList';
import { CreateGroupModal } from './components/CreateGroupModal';
import { useGroups } from './hooks/useGroups';
// Group type is used through selectedGroupData
import EncryptionTest from './components/EncryptionTest';

function App() {
  console.log('[App] Starting component initialization...');
  console.log('App component mounting');
  
  // Development mode check first
  if (process.env.NODE_ENV === 'development') {
    console.log('Development mode - bypassing wallet and fee checks');
  } else {
    console.log('[App] Rendering in production mode, checking if wallet is connected...');
  }

  // Add defensive initialization check and loading state
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(false); // Changed to false to skip intro
  const [activeView, setActiveView] = useState('messages');
  const [showCreateGroup, setShowCreateGroup] = useState(false);

  useEffect(() => {
    const checkInitialization = async () => {
      try {
        console.log('[App] Checking initialization state...');
        
        // Verify required globals
        if (typeof Buffer === 'undefined') throw new Error('Buffer is not initialized');
        if (typeof window.crypto === 'undefined') throw new Error('Crypto API is not available');
        if (typeof process === 'undefined') throw new Error('Process is not initialized');
        
        // Verify environment variables
        if (!process.env.NODE_ENV) throw new Error('NODE_ENV is not set');
        if (!process.env.VITE_SOLANA_NETWORK) throw new Error('VITE_SOLANA_NETWORK is not set');
        
        console.log('[App] Initialization check passed:', {
          hasBuffer: true,
          hasCrypto: true,
          hasProcess: true,
          environment: process.env.NODE_ENV,
          mockData: process.env.VITE_MOCK_DATA
        });
        
        setIsInitializing(false);
      } catch (error) {
        console.error('[App] Initialization check failed:', error);
        setInitError(error instanceof Error ? error.message : 'Unknown initialization error');
        setIsInitializing(false);
      }
    };
    
    checkInitialization();
  }, []);
  // Add defensive wallet initialization check
  const wallet = useWallet();
  const connected = wallet?.connected ?? false;
  const publicKey = wallet?.publicKey;
  
  console.log('[App] Wallet state:', {
    connected,
    publicKey: publicKey?.toString() || 'none',
    initialized: typeof wallet !== 'undefined'
  });

  const { hasPaidFee, isCheckingPayment, error: feeError, payGasFee } = useGasFee();
  
  console.log('[App] Render state:', {
    showIntro,
    connected,
    hasPaidFee,
    isCheckingPayment,
    feeError,
    activeView,
    environment: process.env.NODE_ENV,
    network: process.env.VITE_SOLANA_NETWORK
  });
  
  useEffect(() => {
    console.log('App mounted, showIntro:', showIntro);
    console.log('Active view:', activeView);
    console.log('Wallet connected:', connected);
    console.log('Has paid fee:', hasPaidFee);
    console.log('Is checking payment:', isCheckingPayment);
    console.log('Fee error:', feeError);
  }, [showIntro, activeView, connected, hasPaidFee, isCheckingPayment, feeError]);

  useEffect(() => {
    if (showIntro) {
      const timer = setTimeout(() => {
        setShowIntro(false);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [showIntro]);
  const [selectedGroup, setSelectedGroup] = useState<string>();
  // Initialize hooks with defensive checks
  const groupsHook = useGroups();
  const { groups, loading, error, createGroup, leaveGroup, sendMessage } = groupsHook || {};
  
  console.log('App render state:', {
    groupsHook: groupsHook ? 'initialized' : 'not initialized',
    groups: Array.isArray(groups) ? groups.length : 'not an array',
    loading,
    error,
    selectedGroup,
    environment: process.env.NODE_ENV,
    mockData: process.env.VITE_MOCK_DATA
  });

  // Add defensive check for hook initialization and wallet connection
  if (!groupsHook || !Array.isArray(groups)) {
    console.log('[App] Groups hook or groups array not initialized, checking wallet state...');
    console.log('[App] Wallet connection state:', { connected, publicKey: publicKey?.toString() || 'none' });
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#1a1b23] to-[#2d2e3d]">
        <h1 className="text-3xl font-bold text-[#00a884] mb-6">Welcome to Solvio</h1>
        {!connected ? (
          <>
            <p className="text-xl text-gray-300 mb-8">Connect your wallet to start messaging</p>
            <div className="flex flex-col items-center gap-4">
              <WalletMultiButton className="px-8 py-3 bg-[#00a884] hover:bg-[#008069] text-white rounded-lg text-lg" />
              <p className="text-sm text-gray-400">Supports Phantom and Solflare wallets</p>
            </div>
          </>
        ) : (
          <>
            <p className="text-2xl font-semibold text-[#00a884] mb-4">Initializing Secure Environment</p>
            <p className="text-sm text-gray-400">Please wait while we set up your application</p>
            <button 
              onClick={() => window.location.reload()} 
              className="mt-4 px-4 py-2 bg-[#00a884] hover:bg-[#008069] text-white rounded-lg"
            >
              Retry
            </button>
          </>
        )}
      </div>
    );
  }
  
  // Show error state with retry option
  if (error) {
    console.error('Application error:', error);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#1a1b23] to-[#2d2e3d]">
        <p className="text-2xl font-semibold text-red-500 mb-4">Error</p>
        <p className="text-lg text-gray-300 mb-6">{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="px-6 py-3 bg-[#00a884] hover:bg-[#008069] text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }
  
  // Add defensive initialization check
  if (!Array.isArray(groups)) {
    console.log('[App] Groups not initialized yet, attempting to show wallet connection screen');
    console.log('[App] Wallet connection state:', { 
      connected,
      publicKey: publicKey?.toString() || 'none',
      groupsInitialized: Array.isArray(groups)
    });
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#1a1b23] to-[#2d2e3d]">
        <h1 className="text-2xl font-semibold text-[#00a884] mb-4">Welcome to Solvio</h1>
        <p className="text-sm text-gray-400 mb-6">Connect your wallet to continue</p>
        <WalletMultiButton />
      </div>
    );
  }
  
  // Add defensive check for groups array
  const safeGroups = Array.isArray(groups) ? groups : [];
  
  // Add defensive check for selectedGroupData
  const selectedGroupData = selectedGroup && safeGroups.length > 0 
    ? safeGroups.find((g) => g && typeof g === 'object' && 'id' in g && g.id === selectedGroup) 
    : undefined;
  
  console.log('Selected group data:', selectedGroupData);
  
  // Show initialization or loading state with detailed feedback
  if (isInitializing || loading) {
    const message = isInitializing ? 'Initializing application...' : 'Loading groups...';
    const detail = isInitializing ? 'Setting up secure environment' : 'Initializing secure communication';
    
    console.log('[App] Rendering loading state:', {
      isInitializing,
      loading,
      groups: Array.isArray(groups) ? groups.length : 'not an array',
      error,
      connected,
      environment: process.env.NODE_ENV
    });
    
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#1a1b23] to-[#2d2e3d]">
        <div className="animate-pulse">
          <p className="text-2xl font-semibold text-[#00a884] mb-4">{message}</p>
          <p className="text-sm text-gray-400">{detail}</p>
        </div>
      </div>
    );
  }
  
  // Show initialization error if any
  if (initError) {
    console.error('[App] Initialization error:', initError);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#1a1b23] to-[#2d2e3d]">
        <p className="text-2xl font-semibold text-red-500 mb-4">Initialization Error</p>
        <p className="text-lg text-gray-300 mb-6">{initError}</p>
        <button  
          onClick={() => window.location.reload()} 
          className="px-6 py-3 bg-[#00a884] hover:bg-[#008069] text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }
  
  // Add defensive check for groups initialization
  if (!groups || !Array.isArray(groups)) {
    console.error('Groups not properly initialized:', groups);
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#1a1b23] to-[#2d2e3d]">
        <p className="text-2xl font-semibold text-[#00a884] mb-4">Initializing application...</p>
        <p className="text-sm text-gray-400">Please wait while we set up your secure environment</p>
      </div>
    );
  }

  const renderView = () => {
    switch (activeView) {
      case 'encryption':
        return <EncryptionTest />;
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
                groups={safeGroups}
                onGroupSelect={setSelectedGroup}
                onCreateGroup={() => setShowCreateGroup(true)}
              />
              {selectedGroup && selectedGroupData && Array.isArray(selectedGroupData.messages) && (
                <GroupChat
                  group={selectedGroupData}
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
                  onPromoteToAdmin={async (memberId) => {
                    console.log('Promoting member to admin:', memberId);
                  }}
                  onDemoteFromAdmin={async (memberId) => {
                    console.log('Demoting member from admin:', memberId);
                  }}
                  onMuteMember={async (memberId) => {
                    console.log('Muting member:', memberId);
                  }}
                  onBanMember={async (memberId) => {
                    console.log('Banning member:', memberId);
                  }}
                  currentUserIsAdmin={selectedGroupData.admins?.includes(wallet?.publicKey?.toString() || '') || false}
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
        return (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500">Select a view from the menu</p>
          </div>
        );
    }
  };

  if (showIntro) {
    return <IntroScreen onComplete={() => setShowIntro(false)} />;
  }

  // Check wallet connection in all environments
  if (!connected) {
    console.log('Rendering wallet connection screen');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#1a1b23] to-[#2d2e3d]">
        <h1 className="text-4xl font-bold text-[#00a884] mb-8">Connect Your Wallet</h1>
        <WalletMultiButton className="!bg-[#00a884] hover:!bg-[#008069] text-white" />
      </div>
    );
  }

  // Show fee payment UI in production, but don't block access
  if (process.env.NODE_ENV === 'production' && !hasPaidFee && !isCheckingPayment) {
    console.log('Production mode - showing optional fee payment UI');
    return (
      <Layout onViewChange={setActiveView}>
        <div className="fixed bottom-4 right-4 z-50 bg-[#1a1b23] p-4 rounded-lg shadow-lg border border-[#00a884]">
          <h2 className="text-lg font-semibold text-[#00a884] mb-2">Support Solvio</h2>
          <p className="text-sm text-gray-300 mb-3">Help us maintain the platform by paying a one-time fee</p>
          <button
            onClick={payGasFee}
            className="w-full px-4 py-2 bg-[#00a884] hover:bg-[#008069] text-white rounded-lg text-sm"
          >
            Pay Gas Fee
          </button>
          {feeError && (
            <p className="text-red-500 mt-2 text-xs">{feeError}</p>
          )}
        </div>
        {renderView() || (
          <div className="flex items-center justify-center h-full">
            <p className="text-lg">No content to display</p>
          </div>
        )}
      </Layout>
    );
  }

  console.log('Proceeding to main view');

  // Add debug logging before final render
  console.log('Rendering main view with:', {
    activeView,
    groupsCount: groups?.length,
    isDevelopment: process.env.NODE_ENV === 'development'
  });


  console.log('Final render state:', {
    activeView,
    isDevelopment: process.env.NODE_ENV === 'development',
    mockData: process.env.VITE_MOCK_DATA,
    connected,
    hasPaidFee
  });
  
  const renderedView = renderView();
  console.log('Rendered view content:', {
    hasContent: renderedView ? 'Yes' : 'No',
    type: renderedView?.type?.name || 'Unknown'
  });
  
  return (
    <Layout onViewChange={setActiveView}>
      {renderedView || (
        <div className="flex items-center justify-center h-full">
          <p className="text-lg">No content to display</p>
        </div>
      )}
    </Layout>
  );
}

export default App
