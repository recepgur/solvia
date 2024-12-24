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
    <div className="bg-[var(--chat-background)] px-4 py-2">
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <button
          type="button"
          className="blockchain-button p-2 rounded-full text-[var(--text-primary)]"
          onClick={onAttachFile}
          title={t('attach.file')}
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="blockchain-button p-2 rounded-full text-[var(--text-primary)]"
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
            className="w-full px-4 py-3 rounded-lg bg-[var(--chat-background)] hover-effect focus:outline-none focus:ring-2 focus:ring-[var(--primary-accent)] placeholder-[var(--text-secondary)] text-[var(--text-primary)]"
          />
        </div>
        {message.trim() ? (
          <button
            type="submit"
            className="blockchain-button p-2 rounded-full"
          >
            <Send className="h-5 w-5 text-white" />
          </button>
        ) : (
          <button
            type="button"
            className="blockchain-button p-2 rounded-full text-[var(--text-primary)]"
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
