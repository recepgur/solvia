import * as React from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { SearchBar } from './SearchBar';

interface Chat {
  id: string;
  name: string;
  lastMessage: string;
  timestamp: string;
  unread: number;
  avatar?: string;
  status: 'sent' | 'delivered' | 'read';
}

interface ChatListProps {
  onChatSelect: (chatId: string) => void;
  selectedChat?: string;
}

export function ChatList({ onChatSelect, selectedChat }: ChatListProps) {
  const [chats] = React.useState<Chat[]>([
    {
      id: '1',
      name: 'Alice',
      lastMessage: 'Hello!',
      timestamp: '10:30',
      unread: 2,
      status: 'read'
    },
    {
      id: '2',
      name: 'Bob',
      lastMessage: 'How are you?',
      timestamp: '09:45',
      unread: 0,
      status: 'delivered'
    }
  ]);

  const getStatusIcon = (status: Chat['status']) => {
    switch (status) {
      case 'read':
        return <CheckCheck className="h-4 w-4 text-[var(--primary-accent)]" />;
      case 'delivered':
        return <CheckCheck className="h-4 w-4 text-[var(--text-secondary)]" />;
      case 'sent':
        return <Check className="h-4 w-4 text-[var(--text-secondary)]" />;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[var(--app-background)]">
      <SearchBar onSearch={(query: string) => console.log('Search:', query)} />
      {chats.map((chat) => (
        <button
          key={chat.id}
          onClick={() => onChatSelect(chat.id)}
          className={`w-full flex items-center space-x-3 px-4 py-3 hover:bg-[var(--bubble-in)] dark:hover:bg-[var(--bubble-out)] border-b border-[var(--border-light)] transition-colors ${
            selectedChat === chat.id ? 'bg-[var(--bubble-in)] dark:bg-[var(--bubble-out)]' : 'bg-[var(--chat-background)]'
          }`}
        >
          <div className="w-12 h-12 rounded-full bg-[var(--bubble-in)] flex-shrink-0 overflow-hidden">
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
              <h3 className="font-medium text-[var(--text-primary)] truncate">
                {chat.name}
              </h3>
              <span className="text-xs text-[var(--text-secondary)]">{chat.timestamp}</span>
            </div>
            <div className="flex justify-between items-center mt-1">
              <p className="text-sm text-[var(--text-secondary)] truncate pr-2">{chat.lastMessage}</p>
              <div className="flex items-center space-x-2">
                {getStatusIcon(chat.status)}
                {chat.unread > 0 && (
                  <span className="bg-[var(--primary-accent)] text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
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
