import { useState } from 'react';
import { Layout } from './components/Layout';
import { VideoCall } from './components/VideoCall';
import { NFTProfile } from './components/NFTProfile';
import { PrivateRooms } from './components/PrivateRooms';
import { VoiceRooms } from './components/VoiceRooms';
import { GroupChat } from './components/GroupChat';
import { GroupList } from './components/GroupList';
import { CreateGroupModal } from './components/CreateGroupModal';
import { useGroups } from './hooks/useGroups';
import { useLanguage } from './contexts/LanguageContext';
import type { Group } from './types/group.types';
import { LanguageProvider } from './contexts/LanguageContext';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import '@solana/wallet-adapter-react-ui/styles.css';

function App() {
  useLanguage(); // Initialize language context
  const [activeView, setActiveView] = useState('video');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<string>();
  const { groups, createGroup, leaveGroup, sendMessage } = useGroups();
  const selectedGroupData = selectedGroup ? groups.find((g: Group) => g.id === selectedGroup) : undefined;
  const endpoint = process.env.VITE_SOLANA_NETWORK || clusterApiUrl('devnet');
  const wallets = [new PhantomWalletAdapter()];

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

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          <LanguageProvider>
            <Layout onViewChange={setActiveView}>
              {renderView()}
            </Layout>
          </LanguageProvider>
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}

export default App
