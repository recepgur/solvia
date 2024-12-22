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
        return <CheckCheck className="h-4 w-4 text-blue-500" />;
      case 'delivered':
        return <CheckCheck className="h-4 w-4 text-gray-500" />;
      case 'sent':
        return <Check className="h-4 w-4 text-gray-500" />;
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
          'max-w-[70%] rounded-lg px-3 py-2 shadow-sm',
          message.isOutgoing
            ? 'bg-[#dcf8c6] rounded-tr-none text-gray-800'
            : 'bg-white dark:bg-gray-800 rounded-tl-none'
        )}
      >
        <p className="text-sm leading-relaxed break-words">{message.text}</p>
        <div className="flex items-center justify-end space-x-1 mt-1">
          <span className="text-[11px] text-gray-500">{message.timestamp}</span>
          {message.isOutgoing && (
            <div className="text-[#53bdeb]">{getStatusIcon()}</div>
          )}
        </div>
      </div>
    </div>
  );
}
