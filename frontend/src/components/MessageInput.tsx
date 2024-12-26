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
    <div className="bg-[#f0f2f5] dark:bg-[#202c33] px-4 py-2">
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <button
          type="button"
          className="p-2 rounded-full text-[#54656f] dark:text-[#8696a0] hover:bg-[#d9dbdf] dark:hover:bg-[#384147] transition-colors"
          onClick={onAttachFile}
          title={t('attach.file')}
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="p-2 rounded-full text-[#54656f] dark:text-[#8696a0] hover:bg-[#d9dbdf] dark:hover:bg-[#384147] transition-colors"
          onClick={onAttachFile}
          title={t('attach.photo')}
        >
          <Camera className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={t('type.message')}
            className="w-full px-4 py-3 rounded-lg bg-white dark:bg-[#2a3942] focus:outline-none placeholder-[#3b4a54] dark:placeholder-[#8696a0] text-[#111b21] dark:text-[#d1d7db]"
          />
        </div>
        {message.trim() ? (
          <button
            type="submit"
            className="p-2 rounded-full bg-[#00a884] dark:bg-[#00a884] hover:bg-[#06cf9c] dark:hover:bg-[#06cf9c] transition-colors"
          >
            <Send className="h-5 w-5 text-white" />
          </button>
        ) : (
          <button
            type="button"
            className="p-2 rounded-full text-[#54656f] dark:text-[#8696a0] hover:bg-[#d9dbdf] dark:hover:bg-[#384147] transition-colors"
            onClick={onStartRecording}
            title={t('start.recording')}
          >
            <Mic className="h-5 w-5" />
          </button>
        )}
      </form>
    </div>
  );
}
