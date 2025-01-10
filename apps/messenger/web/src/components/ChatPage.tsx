import React, { useState } from 'react';
import { User, Message } from '@solvia/messenger-shared';
import dynamic from 'next/dynamic';
import { useWallet } from '@solana/wallet-adapter-react';

const ChatList = dynamic(() => import('./ChatList'), { ssr: false });
const ChatInterface = dynamic(() => import('./ChatInterface'), { ssr: false });

// Mock data for development
const mockUsers: User[] = [
  {
    publicKey: { toString: () => '8m5PhqHpH5kqGnxQgKEHPs6SkGR3mZcuJt3c4YQomKWR' },
    username: 'Alice',
    status: 'online',
    lastSeen: Date.now(),
  },
  {
    publicKey: { toString: () => '2m7HzKzxKXd4H1yqGxST8KGRmZcuJt3c4YQomKWR' },
    username: 'Bob',
    status: 'offline',
    lastSeen: Date.now() - 3600000,
  },
] as User[];

const mockMessages: Message[] = [
  {
    id: '1',
    sender: { toString: () => '8m5PhqHpH5kqGnxQgKEHPs6SkGR3mZcuJt3c4YQomKWR' },
    recipient: { toString: () => '2m7HzKzxKXd4H1yqGxST8KGRmZcuJt3c4YQomKWR' },
    content: 'Hey there!',
    timestamp: Date.now() - 3600000,
    type: 'text',
  },
  {
    id: '2',
    sender: { toString: () => '2m7HzKzxKXd4H1yqGxST8KGRmZcuJt3c4YQomKWR' },
    recipient: { toString: () => '8m5PhqHpH5kqGnxQgKEHPs6SkGR3mZcuJt3c4YQomKWR' },
    content: 'Hi! How are you?',
    timestamp: Date.now() - 1800000,
    type: 'text',
  },
] as Message[];

const ChatPage: React.FC = () => {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { publicKey } = useWallet();

  // Handle SSR case where wallet is not available
  if (typeof window === 'undefined') {
    return null;
  }

  const handleSendMessage = (content: string) => {
    console.log('Sending message:', content);
    // TODO: Implement message sending
  };

  const handleStartCall = (type: 'voice' | 'video') => {
    console.log('Starting', type, 'call');
    // TODO: Implement call starting
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div className={`w-full md:w-96 bg-white border-r border-gray-200 ${
        selectedUser ? 'hidden md:block' : 'block'
      }`}>
        <ChatList
          users={mockUsers}
          onSelectUser={(user) => setSelectedUser(user)}
        />
      </div>

      {/* Chat Area */}
      <div className={`flex-1 ${!selectedUser ? 'hidden md:flex' : 'flex'}`}>
        {selectedUser ? (
          <ChatInterface
            user={selectedUser}
            messages={mockMessages}
            onSendMessage={handleSendMessage}
            onStartCall={handleStartCall}
            onBack={() => setSelectedUser(null)}
          />
        ) : (
          <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50">
            <div className="text-center">
              <h3 className="text-xl font-medium text-gray-900">
                Welcome to Solvia Messenger
              </h3>
              <p className="mt-2 text-sm text-gray-500">
                Select a chat to start messaging
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
