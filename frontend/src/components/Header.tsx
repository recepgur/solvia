import { type FC } from 'react';
import { MoreVertical, Plus, Search, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface HeaderProps {
  view: 'chats' | 'status' | 'messages' | 'encryption';
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
    <div className={`p-4 bg-gradient-to-r from-[var(--primary-accent)] to-[var(--secondary-accent)] flex justify-between items-center relative overflow-hidden ${className || ''}`}>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=\'100\' height=\'100\' viewBox=\'0 0 100 100\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'rgba(255,255,255,0.03)\'%3E%3Cpath d=\'M50 25l25 15v30l-25 15l-25-15v-30z\'/%3E%3C/g%3E%3C/svg%3E')] bg-repeat opacity-50"></div>
      <h1 className="text-xl font-bold text-white hover-effect relative z-10">Solvio</h1>
      <div className="flex items-center space-x-2 relative z-10">
        {view === 'chats' && (
          <button
            onClick={onCreateGroup}
            className="blockchain-button p-2 rounded-full text-white"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
        {children || (
          <button className="blockchain-button p-2 rounded-full text-white">
            <MoreVertical className="h-5 w-5" />
          </button>
        )}
      </div>
    </div>
  );
}
