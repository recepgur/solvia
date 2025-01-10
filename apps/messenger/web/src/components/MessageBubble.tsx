import React from 'react';
import { Message } from '@solvia/messenger-shared';
import { format } from 'date-fns';

interface Props {
  message: Message;
  isOwn: boolean;
}

const MessageBubble: React.FC<Props> = ({ message, isOwn }) => {
  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-2`}
    >
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isOwn
            ? 'bg-primary text-white rounded-br-none'
            : 'bg-white text-gray-900 rounded-bl-none'
        } shadow`}
      >
        <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
        <div className={`flex items-center justify-end mt-1 ${isOwn ? 'text-white/80' : 'text-gray-500'}`}>
          <span className="text-xs">
            {format(message.timestamp, 'HH:mm')}
          </span>
          {isOwn && (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 ml-1"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
