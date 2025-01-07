'use client';

import React, { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useMessaging } from '../../hooks/useMessaging';
import MessageList from '../MessageList';

interface ChatInterfaceProps {
  onStartCall: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ onStartCall }) => {
  const [message, setMessage] = useState('');
  const { sendMessage, messages } = useMessaging();
  const t = useTranslations('common');

  const handleSend = () => {
    if (message.trim()) {
      sendMessage(message);
      setMessage('');
    }
  };

  return (
    <div className="w-full h-[70vh] border border-gray-200 rounded-lg overflow-hidden bg-white">
      <div className="h-full flex flex-col">
        <div className="w-full p-4 border-b bg-gray-50 flex justify-between items-center">
          <span className="text-lg font-bold">
            {t('messages')}
          </span>
          <button
            className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
            onClick={onStartCall}
          >
            {t('start_call')}
          </button>
        </div>

        <MessageList messages={messages} />

        <div className="w-full p-4 border-t flex gap-2">
          <input
            className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('type_message')}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
          />
          <button
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
            onClick={handleSend}
          >
            {t('send')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
