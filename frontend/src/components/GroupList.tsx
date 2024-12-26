import { type FC } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Users, Plus } from 'lucide-react';

import type { Group } from '../types/group.types';

interface GroupListItemProps extends Group {
  avatar_url?: string;
  last_message?: {
    content: string;
    timestamp: string;
  };
  unread_count?: number;
}

interface GroupListProps {
  groups: GroupListItemProps[];
  onGroupSelect: (groupId: string) => void;
  onCreateGroup: () => void;
}

export const GroupList: FC<GroupListProps> = ({ groups, onGroupSelect, onCreateGroup }) => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b dark:border-gray-800">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{t('messages')}</h2>
          <button
            onClick={onCreateGroup}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
          >
            <Plus className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Search bar */}
      <div className="p-4">
        <input
          type="text"
          placeholder={t('search.members')}
          className="w-full px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 focus:outline-none"
        />
      </div>

      {/* Groups list */}
      <div className="flex-1 overflow-y-auto">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full p-8 space-y-4">
            <Users className="h-16 w-16 text-gray-400" />
            <p className="text-center text-gray-600 dark:text-gray-400">
              {t('group.welcome.description')}
            </p>
            <button
              onClick={onCreateGroup}
              className="flex items-center space-x-2 bg-[#00a884] text-white px-4 py-2 rounded-lg hover:bg-[#06cf9c]"
            >
              <Plus className="h-5 w-5" />
              <span>{t('group.create')}</span>
            </button>
          </div>
        ) : (
          groups.map((group) => (
            <button
              key={group.id}
              onClick={() => onGroupSelect(group.id)}
              className="w-full p-4 hover:bg-gray-50 dark:hover:bg-gray-800 flex items-center space-x-3"
            >
              {/* Group avatar */}
              {group.avatar_url ? (
                <img
                  src={group.avatar_url}
                  alt={group.name}
                  className="w-12 h-12 rounded-full"
                />
              ) : (
                <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                  <Users className="h-6 w-6 text-gray-500 dark:text-gray-400" />
                </div>
              )}

              {/* Group info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium truncate">{group.name}</h3>
                  {group.last_message && (
                    <span className="text-sm text-gray-500">
                      {group.last_message.timestamp}
                    </span>
                  )}
                </div>
                {group.last_message && (
                  <p className="text-sm text-gray-500 truncate">
                    {group.last_message.content}
                  </p>
                )}
              </div>

              {/* Unread count */}
              {group.unread_count && group.unread_count > 0 && (
                <div className="flex-shrink-0">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-green-500 text-white text-sm">
                    {group.unread_count}
                  </span>
                </div>
              )}
            </button>
          ))
        )}
      </div>
    </div>
  );
}
