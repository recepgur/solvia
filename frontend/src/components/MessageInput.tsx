import * as React from 'react';
import { useState } from 'react';
import { Camera, Paperclip, Mic, Send } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  onAttachFile: () => void;
  onStartRecording: () => void;
}

export function MessageInput({ onSendMessage, onAttachFile, onStartRecording }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const { t } = useLanguage();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  return (
    <div className="bg-[#f0f2f5] dark:bg-gray-800 px-4 py-3">
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <button
          type="button"
          className="p-2 rounded-full text-[#54656f] dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          onClick={onAttachFile}
          title={t('attach.file')}
        >
          <Paperclip className="h-6 w-6" />
        </button>
        <button
          type="button"
          className="p-2 rounded-full text-[#54656f] dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          onClick={onAttachFile}
          title={t('attach.photo')}
        >
          <Camera className="h-6 w-6" />
        </button>
        <div className="flex-1">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('type.message')}
            className="w-full px-4 py-2 rounded-lg bg-white dark:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-green-500 dark:text-white"
          />
        </div>
        {message.trim() ? (
          <button
            type="submit"
            className="p-2 rounded-full text-[#54656f] dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          >
            <Send className="h-6 w-6" />
          </button>
        ) : (
          <button
            type="button"
            className="p-2 rounded-full text-[#54656f] dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={onStartRecording}
            title={t('start.recording')}
          >
            <Mic className="h-6 w-6" />
          </button>
        )}
      </form>
    </div>
  );
}
