import React from 'react';
import { User } from '@solvia/messenger-shared';
import { formatDistanceToNow } from 'date-fns';

interface ChatListItemProps {
  user: User;
  lastMessage?: string;
  timestamp?: number;
  unreadCount?: number;
  onClick: () => void;
}

const ChatListItem: React.FC<ChatListItemProps> = ({
  user,
  lastMessage,
  timestamp,
  unreadCount,
  onClick,
}) => (
  <div
    onClick={onClick}
    className="flex items-center px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100"
  >
    <div className="relative flex-shrink-0">
      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
        <span className="text-gray-500 text-sm font-medium">
          {user.username?.[0]?.toUpperCase() || user.publicKey.toString().slice(0, 2)}
        </span>
      </div>
      {user.status === 'online' && (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
      )}
    </div>
    <div className="ml-4 flex-1 min-w-0">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-900 truncate">
          {user.username || `${user.publicKey.toString().slice(0, 8)}...`}
        </h3>
        {timestamp && (
          <p className="text-xs text-gray-500">
            {formatDistanceToNow(timestamp, { addSuffix: true })}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between mt-1">
        {lastMessage && (
          <p className="text-sm text-gray-500 truncate">{lastMessage}</p>
        )}
        {unreadCount && unreadCount > 0 && (
          <div className="ml-2 bg-primary text-white text-xs font-medium rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount}
          </div>
        )}
      </div>
    </div>
  </div>
);

interface ChatListProps {
  users: User[];
  onSelectUser: (user: User) => void;
}

export const ChatList: React.FC<ChatListProps> = ({ users, onSelectUser }) => {
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Chats</h2>
      </div>
      <div className="divide-y divide-gray-100">
        {users.map((user) => (
          <ChatListItem
            key={user.publicKey.toString()}
            user={user}
            onClick={() => onSelectUser(user)}
          />
        ))}
      </div>
    </div>
  );
};
