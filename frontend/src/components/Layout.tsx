import * as React from 'react';
import { X } from 'lucide-react';
import { MessageInput } from './MessageInput';
import { Header } from './Header';
import { useLanguage } from '../contexts/LanguageContext';
import { ChatList } from './ChatList';
import { StatusList } from './StatusList';

interface LayoutProps {
  children: React.ReactNode;
  onViewChange: (view: string) => void;
}

export function Layout({ children, onViewChange }: LayoutProps) {
  const { t } = useLanguage();
  const [selectedChat, setSelectedChat] = React.useState<string>();
  const [showChatInfo, setShowChatInfo] = React.useState(false);
  const [view, setView] = React.useState<'chats' | 'status'>('chats');

  const handleChatSelect = (chatId: string) => {
    setSelectedChat(chatId);
    onViewChange('messages');
  };

  // Handle swipe gestures
  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const startX = touch.clientX;
    
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const currentX = touch.clientX;
      const diff = currentX - startX;
      
      if (Math.abs(diff) > 50) {
        if (diff > 0 && document.body.classList.contains('chat-active')) {
          // Swipe right - go back to chat list
          document.body.classList.remove('chat-active');
        } else if (diff < 0 && !document.body.classList.contains('chat-active')) {
          // Swipe left - show chat
          document.body.classList.add('chat-active');
        }
        document.removeEventListener('touchmove', handleTouchMove);
      }
    };
    
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', () => {
      document.removeEventListener('touchmove', handleTouchMove);
    }, { once: true });
  }, []);

  return (
    <div 
      className="flex h-screen bg-[var(--app-background)] no-select"
      onTouchStart={handleTouchStart}
    >
      {/* Left panel - Chat list / Status */}
      <div className="chat-list-panel w-[30%] max-w-[400px] min-w-[300px] border-r border-gray-200 dark:border-gray-800 flex flex-col">
        <Header 
          view={view} 
          onCreateGroup={() => console.log('Create group')}
        />

        {/* View toggle */}
        <div className="flex border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={() => setView('chats')}
            className={`flex-1 py-4 text-center ${
              view === 'chats' ? 'border-b-2 border-green-500 text-green-500' : ''
            }`}
          >
            {t('messages')}
          </button>
          <button
            onClick={() => setView('status')}
            className={`flex-1 py-4 text-center ${
              view === 'status' ? 'border-b-2 border-green-500 text-green-500' : ''
            }`}
          >
            {t('status.updates')}
          </button>
        </div>

        {/* Chat list or Status view */}
        {view === 'chats' ? (
          <ChatList onChatSelect={handleChatSelect} selectedChat={selectedChat} />
        ) : (
          <StatusList />
        )}
      </div>
      
      {/* Main content - Chat/Call view */}
      <div className="chat-view flex-1 flex flex-col relative">
        <Header 
          view="messages"
          chatName="Chat Name"
          onlineStatus="online"
          onBack={() => onViewChange('chats')}
        />
        <div className="flex-1 overflow-y-auto px-4 py-2 bg-[#efeae2] dark:bg-[#0b141a]">
          {children}
        </div>
        <div className="sticky bottom-0 p-4 bg-[var(--app-background)]">
          <MessageInput 
            onSendMessage={(text) => console.log('Send:', text)}
            onAttachFile={() => console.log('Attach file')}
            onStartRecording={() => console.log('Start recording')}
          />
        </div>
      </div>

      {/* Right panel - Chat info (conditionally rendered) */}
      {showChatInfo && (
        <div className="chat-info-panel w-[25%] max-w-[350px] min-w-[280px] border-l border-gray-200 dark:border-gray-800 bg-[var(--app-background)]">
          <div className="p-4 flex justify-between items-center border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold">{t('chat.info')}</h2>
            <button
              onClick={() => setShowChatInfo(false)}
              className="touch-target p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
