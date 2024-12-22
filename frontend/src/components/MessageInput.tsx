import * as React from 'react';
import { useState } from 'react';
import { Camera, Paperclip, Mic, Send } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useKeyManagement } from '../hooks/useKeyManagement';
import { encryptMessage, type EncryptedData } from '../utils/crypto';

interface MessageInputProps {
  onSendMessage: (text: string, encrypted: string) => Promise<void>;
  onAttachFile: () => void;
  onStartRecording: () => void;
  recipientAddress: string;
}

export function MessageInput({ onSendMessage, onAttachFile, onStartRecording, recipientAddress }: MessageInputProps) {
  const { keyPair } = useKeyManagement();
  const [message, setMessage] = useState('');
  const { t } = useLanguage();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      try {
        if (!keyPair) {
          console.error('Encryption keys not ready');
          return;
        }
        const encrypted = await encryptMessage(message.trim(), keyPair.publicKey);
        await onSendMessage(message.trim(), JSON.stringify(encrypted));
        setMessage('');
      } catch (error) {
        console.error('Failed to encrypt message:', error);
        // TODO: Show error toast to user
      }
    }
  };

  return (
    <div className="bg-gradient-to-t from-[var(--app-background)] to-[var(--chat-background)] px-4 py-2 border-t border-[var(--border-light)] backdrop-blur-sm shadow-md">
      <form onSubmit={handleSubmit} className="flex items-center space-x-2">
        <button
          type="button"
          className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bubble-in)] transition-colors"
          onClick={onAttachFile}
          title={t('attach.file')}
        >
          <Paperclip className="h-5 w-5" />
        </button>
        <button
          type="button"
          className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bubble-in)] transition-colors"
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
            className="w-full px-4 py-3 rounded-lg bg-[var(--bubble-in)] focus:outline-none text-[var(--text-primary)] placeholder-[var(--text-secondary)]"
          />
        </div>
        {message.trim() ? (
          <button
            type="submit"
            className="p-2 rounded-full bg-[var(--primary-accent)] hover:opacity-90 transition-colors"
          >
            <Send className="h-5 w-5 text-white" />
          </button>
        ) : (
          <button
            type="button"
            className="p-2 rounded-full text-[var(--text-secondary)] hover:bg-[var(--bubble-in)] transition-colors"
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
