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
import type { Group } from './types/group.types';
import { LanguageProvider } from './contexts/LanguageContext';
import EncryptionTest from './components/EncryptionTest';

function App() {
  console.log('App component mounting');
  const [showIntro, setShowIntro] = useState(true);
  const [activeView, setActiveView] = useState('chats');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const { connected } = useWallet();
  const { hasPaidFee, isCheckingPayment, error: feeError, payGasFee } = useGasFee();
  
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
  const { groups, createGroup, leaveGroup, sendMessage } = useGroups();
  const selectedGroupData = selectedGroup ? groups.find((g: Group) => g.id === selectedGroup) : undefined;

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

  if (!connected) {
    console.log('Rendering wallet connection screen');
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#1a1b23] to-[#2d2e3d]">
        <h1 className="text-4xl font-bold text-[#00a884] mb-8">Connect Your Wallet</h1>
        <WalletMultiButton className="!bg-[#00a884] hover:!bg-[#008069] text-white" />
      </div>
    );
  }
  
  if (!hasPaidFee) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-[#1a1b23] to-[#2d2e3d]">
        <h1 className="text-4xl font-bold text-[#00a884] mb-8">
          {isCheckingPayment ? 'Checking Gas Fee...' : 'One-time Gas Fee Required'}
        </h1>
        {!isCheckingPayment && (
          <button
            onClick={payGasFee}
            className="px-6 py-3 bg-[#00a884] hover:bg-[#008069] text-white rounded-lg"
          >
            Pay Gas Fee
          </button>
        )}
        {feeError && (
          <p className="text-red-500 mt-4">{feeError}</p>
        )}
      </div>
    );
  }



  return (
    <LanguageProvider>
      <Layout onViewChange={setActiveView}>
        {renderView()}
      </Layout>
    </LanguageProvider>
  );
}

export default App
