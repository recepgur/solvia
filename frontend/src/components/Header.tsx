import { type FC } from 'react';
import { MoreVertical, Plus, Search, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface HeaderProps {
  view: 'chats' | 'status' | 'messages';
  onBack?: () => void;
  onCreateGroup?: () => void;
  chatName?: string;
  onlineStatus?: string;
  avatarUrl?: string;
}

export const Header: FC<HeaderProps> = ({ view, onBack, onCreateGroup, chatName, onlineStatus, avatarUrl }) => {
  useLanguage(); // Initialize language context for future translations

  if (view === 'messages' && chatName) {
    return (
      <div className="bg-[#f0f2f5] dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button 
            onClick={onBack}
            className="p-2 rounded-full text-[#54656f] dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors md:hidden"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="w-10 h-10 rounded-full bg-[#dfe5e7] dark:bg-gray-600 overflow-hidden">
            {avatarUrl && (
              <img 
                src={avatarUrl} 
                alt={chatName}
                className="w-full h-full object-cover"
              />
            )}
          </div>
          <div>
            <h2 className="font-medium text-gray-900 dark:text-gray-100">{chatName}</h2>
            <p className="text-sm text-[#667781] dark:text-gray-400">{onlineStatus}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <button className="p-2 rounded-full text-[#54656f] dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <Search className="h-5 w-5" />
          </button>
          <button className="p-2 rounded-full text-[#54656f] dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <MoreVertical className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 bg-[#00a884] dark:bg-[#008069] flex justify-between items-center">
      <h1 className="text-xl font-bold text-white">Solvio</h1>
      <div className="flex items-center space-x-2">
        {view === 'chats' && (
          <button
            onClick={onCreateGroup}
            className="p-2 rounded-full text-white hover:bg-[#017561] dark:hover:bg-[#0c977a] transition-colors"
          >
            <Plus className="h-5 w-5" />
          </button>
        )}
        <button className="p-2 rounded-full text-white hover:bg-[#017561] dark:hover:bg-[#0c977a] transition-colors">
          <MoreVertical className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
