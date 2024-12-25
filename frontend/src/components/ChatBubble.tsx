import { Check, CheckCheck } from 'lucide-react';
import { cn } from '../lib/utils';
import { EmojiPicker } from './EmojiPicker';

interface Reaction {
  emoji: string;
  sender: string;
  timestamp: string;
}

interface ChatBubbleProps {
  message: {
    id: string;
    text: string;
    sender: string;
    timestamp: string;
    status: 'sent' | 'delivered' | 'read';
    isOutgoing: boolean;
    forwardedFrom?: string;
    forwardedTimestamp?: string;
    forwardedMessageId?: string;
    reactions?: Reaction[];
  };
  isSelected?: boolean;
  onSelect?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
}

export function ChatBubble({ message, isSelected, onSelect, onReact }: ChatBubbleProps) {
  const getStatusIcon = () => {
    switch (message.status) {
      case 'read':
        return <CheckCheck className="h-4 w-4 text-[var(--primary)]" />;
      case 'delivered':
        return <CheckCheck className="h-4 w-4 text-[var(--text-secondary)]" />;
      case 'sent':
        return <Check className="h-4 w-4 text-[var(--text-secondary)]" />;
    }
  };

  return (
    <div
      className={cn(
        'flex w-full mt-2 px-4',
        message.isOutgoing ? 'justify-end' : 'justify-start'
      )}
      onClick={() => onSelect?.(message.id)}
    >
      <div className="group relative">
        <div
          className={cn(
            'max-w-[70%] mb-2 cursor-pointer transition-colors duration-200',
            message.isOutgoing
              ? 'chat-bubble-out text-[var(--text-primary)] ml-auto'
              : 'chat-bubble-in text-[var(--text-primary)]',
            isSelected && 'bg-blue-100 dark:bg-blue-900'
          )}
        >
          <p className="text-sm leading-relaxed break-words">{message.text}</p>
          <div className="flex items-center justify-end space-x-1 mt-1">
            <span className="text-[11px] text-[var(--text-secondary)]">{message.timestamp}</span>
            {message.isOutgoing && (
              <div>{getStatusIcon()}</div>
            )}
          </div>
          
          {/* Reactions */}
          {message.reactions && message.reactions.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {message.reactions.map((reaction, index) => (
                <div
                  key={`${reaction.emoji}-${index}`}
                  className="bg-[var(--hover-light)] rounded-full px-2 py-0.5 text-sm"
                  title={`${reaction.sender} reacted with ${reaction.emoji}`}
                >
                  {reaction.emoji}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Reaction Button */}
        <div className="absolute -right-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
          <EmojiPicker
            onSelect={(emoji) => onReact?.(message.id, emoji)}
            className="ml-2"
          />
        </div>
      </div>
    </div>
  );
}
