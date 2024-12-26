import React, { useState } from 'react';
import { Smile } from 'lucide-react';

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  className?: string;
}

const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

export function EmojiPicker({ onSelect, className = '' }: EmojiPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-full hover:bg-[var(--hover-light)] transition-colors"
        aria-label="Add reaction"
      >
        <Smile className="h-4 w-4 text-[var(--text-secondary)]" />
      </button>
      
      {isOpen && (
        <div className="absolute bottom-full mb-2 bg-white dark:bg-[var(--chat-background)] rounded-lg shadow-lg p-2 flex space-x-2 z-50">
          {commonEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onSelect(emoji);
                setIsOpen(false);
              }}
              className="hover:bg-[var(--hover-light)] p-1 rounded transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
