import { Check, CheckCheck } from 'lucide-react';
import { cn } from '../lib/utils';

interface ChatBubbleProps {
  message: {
    id: string;
    text: string;
    sender: string;
    timestamp: string;
    status: 'sent' | 'delivered' | 'read';
    isOutgoing: boolean;
  };
}

export function ChatBubble({ message }: ChatBubbleProps) {
  const getStatusIcon = () => {
    switch (message.status) {
      case 'read':
        return <CheckCheck className="h-4 w-4 text-[#53BDEB]" />;
      case 'delivered':
        return <CheckCheck className="h-4 w-4 text-[#8696A0]" />;
      case 'sent':
        return <Check className="h-4 w-4 text-[#8696A0]" />;
    }
  };

  return (
    <div
      className={cn(
        'flex w-full mt-2 px-4',
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
        <p className="text-sm leading-relaxed break-words">{message.text}</p>
        <div className="flex items-center justify-end space-x-1 mt-1">
          <span className="text-[11px] text-[#8696A0] dark:text-gray-400">{message.timestamp}</span>
          {message.isOutgoing && (
            <div>{getStatusIcon()}</div>
          )}
        </div>
      </div>
    </div>
  );
}
