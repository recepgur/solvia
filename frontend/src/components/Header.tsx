import { type FC } from 'react';
import { MoreVertical, Plus, Search, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface HeaderProps {
  view: 'chats' | 'status' | 'messages' | 'encryption' | 'notifications';
  onBack?: () => void;
  onCreateGroup?: () => void;
  chatName?: string;
  onlineStatus?: string;
  avatarUrl?: string;
  children?: React.ReactNode;
  className?: string;
}

export const Header: FC<HeaderProps> = ({ view, onBack, onCreateGroup, chatName, onlineStatus, avatarUrl, children, className }) => {
  useLanguage(); // Initialize language context for future translations

  if (view === 'messages' && chatName) {
    return (
      <div className={`bg-[var(--chat-background)] border-b border-[var(--border-light)] p-4 flex items-center justify-between ${className || ''}`}>
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack}
            className="blockchain-button p-2 rounded-full text-[var(--text-primary)] md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-[var(--primary-accent)] overflow-hidden hover-effect">
            {avatarUrl && (
              <img 
                src={avatarUrl} 
                alt={chatName}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div>
            <h2 className="font-medium text-[var(--text-primary)]">{chatName}</h2>
            <p className="text-sm text-[var(--text-secondary)]">{onlineStatus}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="blockchain-button p-2 rounded-full text-[var(--text-primary)]">
            <Search className="h-5 w-5" />
          </button>
          <button className="blockchain-button p-2 rounded-full text-[var(--text-primary)]">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`p-4 bg-[var(--primary)] dark:bg-[var(--secondary)] flex justify-between items-center shadow-sm ${className || ''}`}>
      <div className="flex-1 flex items-center justify-between">
        <h1 className="text-xl font-semibold text-white dark:text-[var(--text-primary)]">Solvio</h1>
        <div className="flex items-center space-x-3">
          {view === 'chats' && (
            <button
              onClick={onCreateGroup}
              className="p-2 rounded-full text-white dark:text-[var(--text-primary)] hover:bg-[var(--primary-dark)] dark:hover:bg-[var(--hover-background)] transition-colors"
              aria-label="Create Group"
            >
              <Plus className="h-5 w-5" />
            </button>
          )}
          {children || (
            <button 
              className="p-2 rounded-full text-white dark:text-[var(--text-primary)] hover:bg-[var(--primary-dark)] dark:hover:bg-[var(--hover-background)] transition-colors"
              aria-label="More Options"
            >
              <MoreVertical className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
