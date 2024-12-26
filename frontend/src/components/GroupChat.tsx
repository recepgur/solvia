import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Users, Send, X } from 'lucide-react';

import type { Group } from '../types/group.types';

interface GroupChatProps {
  group: Group;
  onLeaveGroup: (groupId: string) => Promise<void>;
  onSendMessage: (content: string, replyTo?: string) => Promise<void>;
}

export function GroupChat({ group, onLeaveGroup, onSendMessage }: GroupChatProps) {
  const { t } = useLanguage();
  const [message, setMessage] = useState('');
  const [replyTo, setReplyTo] = useState<string>();
  const [showMembers, setShowMembers] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [group.messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    try {
      await onSendMessage(message.trim(), replyTo);
      setMessage('');
      setReplyTo(undefined);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex flex-col h-full flex-1">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b dark:border-gray-800">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
            <Users className="h-6 w-6 text-gray-500 dark:text-gray-400" />
          </div>
          <div>
            <h2 className="font-semibold">{group.name}</h2>
            <p className="text-sm text-gray-500">
              {group.members.length} {t('participants')}
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowMembers(!showMembers)}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
        >
          <Users className="h-6 w-6" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {group.messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${
              msg.sender === group.created_by ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[70%] rounded-lg p-3 ${
                msg.sender === group.created_by
                  ? 'bg-[#00a884] text-white'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}
            >
              {msg.reply_to && (
                <div className="text-sm text-gray-500 mb-1">
                  {t('replying.to')}{' '}
                  {
                    group.messages.find((m) => m.id === msg.reply_to)?.content
                      .slice(0, 50)
                  }
                  ...
                </div>
              )}
              <p>{msg.content}</p>
              <div className="text-xs mt-1 opacity-70">
                {new Date(msg.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t dark:border-gray-800">
        {replyTo && (
          <div className="mb-2 p-2 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-between">
            <span className="text-sm text-gray-500">
              {t('replying.to')}{' '}
              {
                group.messages.find((m) => m.id === replyTo)?.content.slice(0, 50)
              }
              ...
            </span>
            <button
              type="button"
              onClick={() => setReplyTo(undefined)}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('type.message')}
            className="flex-1 px-4 py-2 rounded-full bg-gray-100 dark:bg-gray-800 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!message.trim()}
            className="p-2 bg-green-500 text-white rounded-full hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </form>

      {/* Members Sidebar */}
      {showMembers && (
        <div className="fixed inset-y-0 right-0 w-80 bg-white dark:bg-gray-900 border-l dark:border-gray-800 p-4 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">{t('group.members')}</h3>
            <button
              onClick={() => setShowMembers(false)}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="space-y-4">
            {group.members.map((member) => (
              <div
                key={member.wallet_address}
                className="flex items-center justify-between"
              >
                <div>
                  <p className="font-medium">
                    {member.wallet_address.slice(0, 6)}...
                    {member.wallet_address.slice(-4)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {t(member.role === 'admin' ? 'group.admin' : 'group.member')}
                  </p>
                </div>
                {member.role === 'admin' && (
                  <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                    {t('group.admin')}
                  </span>
                )}
              </div>
            ))}
          </div>
          <button
            onClick={() => onLeaveGroup(group.id)}
            className="mt-6 w-full px-4 py-2 text-red-600 border border-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            {t('leave.room')}
          </button>
        </div>
      )}
    </div>
  );
}
