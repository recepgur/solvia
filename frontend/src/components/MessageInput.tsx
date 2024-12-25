import * as React from 'react';
import { useState } from 'react';
import { Camera, Paperclip, Mic, Send } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

interface MessageInputProps {
  onSendMessage: (text: string) => void;
  onAttachFile: () => void;
  onStartRecording: () => void;
  className?: string;
}

export function MessageInput({ onSendMessage, onAttachFile, onStartRecording, className }: MessageInputProps) {
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
    <div className={`bg-[var(--background)] dark:bg-[var(--secondary)] px-4 py-2 border-t border-[var(--border-light)] ${className || ''}`}>
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <button
          type="button"
          className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--hover-background)] transition-colors"
          onClick={onAttachFile}
          title={t('attach.file')}
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--hover-background)] transition-colors"
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
            className="w-full px-4 py-3 rounded-lg bg-[var(--message-incoming)] dark:bg-[var(--message-incoming)] text-[var(--text-primary)] placeholder-[var(--text-secondary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-colors"
          />
        </div>
        {message.trim() ? (
          <button
            type="submit"
            className="p-2 rounded-full bg-[var(--primary)] hover:bg-[var(--primary-dark)] transition-colors"
          >
            <Send className="h-5 w-5 text-white dark:text-[var(--text-primary)]" />
          </button>
        ) : (
          <button
            type="button"
            className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--hover-background)] transition-colors"
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
