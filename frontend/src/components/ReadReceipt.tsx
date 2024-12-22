import { Check, Wifi } from 'lucide-react';
import { usePresence } from '../hooks/usePresence';

interface ReadReceiptProps {
  message: {
    readBy?: string[];
    deliveredTo?: string[];
    sender: string;
  };
}

export function ReadReceipt({ message }: ReadReceiptProps) {
  const { isOnline } = usePresence();
  const readCount = message.readBy?.length || 0;
  const deliveredCount = message.deliveredTo?.length || 0;

  return (
    <div className="flex items-center space-x-0.5">
      {isOnline(message.sender) && (
        <Wifi className="h-3 w-3 text-green-500 mr-1" />
      )}
      {readCount > 0 ? (
        // Blue double check for read messages
        <div className="text-blue-500">
          <Check className="h-3 w-3 inline" />
          <Check className="h-3 w-3 inline -ml-2" />
        </div>
      ) : deliveredCount > 0 ? (
        // Gray double check for delivered messages
        <div className="text-gray-500">
          <Check className="h-3 w-3 inline" />
          <Check className="h-3 w-3 inline -ml-2" />
        </div>
      ) : (
        // Single check for sent messages
        <Check className="h-3 w-3 text-gray-500" />
      )}
    </div>
  );
}
