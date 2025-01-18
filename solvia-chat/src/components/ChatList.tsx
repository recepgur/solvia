import React from 'react';
import { User } from 'lucide-react';

interface ChatListProps {
  onSelectChat: (publicKey: string) => void;
  searchQuery?: string;
}

interface ChatPreview {
  publicKey: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
}

// Temporary mock data
const mockChats: ChatPreview[] = [
  {
    publicKey: '8xyt...9j2k',
    lastMessage: 'Hey, how are you?',
    timestamp: '10:30 AM',
    unread: 2,
  },
  {
    publicKey: '3mnb...7h4d',
    lastMessage: 'Did you receive the files?',
    timestamp: '9:45 AM',
    unread: 0,
  },
  {
    publicKey: '5qrs...2w8p',
    lastMessage: 'Meeting at 3 PM',
    timestamp: 'Yesterday',
    unread: 1,
  },
];

export const ChatList: React.FC<ChatListProps> = ({ onSelectChat, searchQuery = '' }) => {
  const filteredChats = mockChats.filter(chat => 
    chat.publicKey.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.lastMessage.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filteredChats.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto bg-white p-4">
        <div className="text-center text-gray-500">
          {searchQuery ? 'No conversations found' : 'Start a new conversation by entering a wallet address'}
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white">
      {filteredChats.map(chat => (
        <div
          key={chat.publicKey}
          onClick={() => onSelectChat(chat.publicKey)}
          className="flex items-center p-3 border-b border-gray-200 hover:bg-gray-50 cursor-pointer"
        >
          <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center">
            <User className="w-6 h-6 text-blue-600" />
          </div>
          <div className="ml-3 flex-1">
            <div className="flex justify-between items-center">
              <span className="font-medium">{chat.publicKey}</span>
              <span className="text-sm text-gray-500">{chat.timestamp}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <p className="text-sm text-gray-600 truncate">{chat.lastMessage}</p>
              {chat.unread > 0 && (
                <span className="bg-blue-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {chat.unread}
                </span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
