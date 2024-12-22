import { Check, CheckCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { decryptMessage, type EncryptedData } from '../utils/crypto';
import { useState, useEffect } from 'react';
import { useKeyManagement } from '../hooks/useKeyManagement';
import type { CryptoKeys } from '../utils/crypto';

interface Message {
  id: string;
  text: string;
  encryptedContent: string;
  sender: string;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  isOutgoing: boolean;
}

interface ChatBubbleProps {
  message: Message;
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const { keyPair } = useKeyManagement() as { keyPair: CryptoKeys | null };
  const [decryptedText, setDecryptedText] = useState<string>(message.text);

  useEffect(() => {
    const decryptContent = async () => {
      if (message.encryptedContent && keyPair?.privateKey) {
        try {
          const parsedContent = JSON.parse(message.encryptedContent) as EncryptedData;
          const decrypted = await decryptMessage(JSON.stringify(parsedContent), keyPair.privateKey);
          setDecryptedText(decrypted);
        } catch (error) {
          console.error('Failed to decrypt message:', error);
          setDecryptedText('Failed to decrypt message');
        }
      }
    };
    decryptContent();
  }, [message.encryptedContent, keyPair, message.text]);
  const getStatusIcon = () => {
    switch (message.status) {
      case 'read':
        return <CheckCheck className="h-4 w-4 text-[var(--primary-accent)]" />;
      case 'delivered':
        return <CheckCheck className="h-4 w-4 text-[var(--secondary-accent)]" />;
      case 'sent':
        return <Check className="h-4 w-4 text-[var(--secondary-accent)]" />;
    }
  };

  return (
    <div
      className={cn(
        'flex w-full mt-2 px-4 hover-effect',
        message.isOutgoing ? 'justify-end' : 'justify-start'
      )}
    >
      <div
        className={cn(
          'max-w-[70%] mb-2',
          message.isOutgoing
            ? 'chat-bubble-out text-[var(--text-primary)] ml-auto'
            : 'chat-bubble-in text-[var(--text-primary)]'
        )}
      >
        <p className="text-sm leading-relaxed break-words">{decryptedText}</p>
        <div className="flex items-center justify-end space-x-1 mt-1">
          <span className="text-[11px] text-[var(--text-secondary)]">{message.timestamp}</span>
          {message.isOutgoing && (
            <div>{getStatusIcon()}</div>
          )}
        </div>
      </div>
    </div>
  );
}
