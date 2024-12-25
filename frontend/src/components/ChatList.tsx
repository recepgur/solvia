import * as React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { SearchBar } from './SearchBar';
import type { Chat, Message } from '../types/message';
import type { SearchOptions } from '../types/search';
import { useLanguage } from '../contexts/LanguageContext';

interface ChatListProps {
  onChatSelect: (chatId: string) => void;
  selectedChat?: string;
  className?: string;
}

export function ChatList({ onChatSelect, selectedChat }: ChatListProps) {
  const { t: translate } = useLanguage();
  const [chats] = React.useState<Chat[]>([
    {
      id: '1',
      name: 'Alice',
      lastMessage: {
        id: '1',
        text: 'Hello!',
        sender: '1',
        timestamp: Date.now() - 3600000,
        type: 'text',
        status: 'read'
      },
      unread: 2
    },
    {
      id: '2',
      name: 'Bob',
      lastMessage: {
        id: '2',
        text: 'How are you?',
        sender: '2',
        timestamp: Date.now() - 7200000,
        type: 'text',
        status: 'delivered'
      },
      unread: 0
    }
  ]);
  const [filteredChats, setFilteredChats] = React.useState<Chat[]>(chats);

  React.useEffect(() => {
    setFilteredChats(chats);
  }, [chats]);

  const getStatusIcon = (status: Message['status']) => {
    switch (status) {
      case 'read':
        return <CheckCheck className="h-4 w-4 text-blue-500" />;
      case 'delivered':
        return <CheckCheck className="h-4 w-4 text-gray-500" />;
      case 'sent':
        return <Check className="h-4 w-4 text-gray-500" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f0f2f5] dark:bg-gray-900">
      <SearchBar onSearch={(options: SearchOptions) => {
        const filtered = chats.filter(chat => {
          // Text search
          if (options.query && !chat.lastMessage.text.toLowerCase().includes(options.query.toLowerCase())) {
            return false;
          }

          // Date range filter
          if (options.dateRange?.start && new Date(chat.lastMessage.timestamp) < options.dateRange.start) {
            return false;
          }
          if (options.dateRange?.end && new Date(chat.lastMessage.timestamp) > options.dateRange.end) {
            return false;
          }

          // Media type filter
          if (options.mediaTypes?.length && chat.lastMessage.type === 'media') {
            return options.mediaTypes.includes(chat.lastMessage.mediaType || '');
          }

          return true;
        });
        setFilteredChats(filtered);
      }} />
      {filteredChats.map((chat) => (
        <button
          key={chat.id}
          onClick={() => onChatSelect(chat.id)}
          className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-[#f5f6f6] dark:hover:bg-gray-800 border-b border-gray-100 dark:border-gray-700 transition-colors ${
            selectedChat === chat.id ? 'bg-[#f0f2f5] dark:bg-gray-800' : 'bg-white dark:bg-gray-900'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-[#dfe5e7] dark:bg-gray-600 flex-shrink-0 overflow-hidden">
            {chat.avatar && (
              <img 
                src={chat.avatar} 
                alt={chat.name}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline">
              <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate">
                {chat.name}
              </h3>
              <span className="text-xs text-[#667781] dark:text-gray-400">
                {new Date(chat.lastMessage.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <p className="text-sm text-[#667781] dark:text-gray-400 truncate pr-2">{chat.lastMessage.text}</p>
              <div className="flex items-center space-x-2">
                {getStatusIcon(chat.lastMessage.status)}
                {chat.unread > 0 && (
                  <span className="bg-[#25d366] text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                    {chat.unread}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}
