import * as React from 'react';
import { X, MoreVertical, Reply } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

import { type Status } from '../types/status';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWebSocket } from '../hooks/useWebSocket';

interface StatusViewerProps {
  statuses: Status[];
  currentIndex: number;
  onClose: () => void;
  onReply?: (statusId: string) => void;
}

export function StatusViewer({ statuses, currentIndex, onClose, onReply }: StatusViewerProps) {
  const { t } = useLanguage();
  const { publicKey } = useWallet();
  const { ws } = useWebSocket();
  const [activeIndex, setActiveIndex] = React.useState(currentIndex);
  const [progress, setProgress] = React.useState(0);
  const [swipeOffset, setSwipeOffset] = React.useState(0);

  // Mark status as viewed
  React.useEffect(() => {
    const currentStatus = statuses[activeIndex];
    if (currentStatus && publicKey && currentStatus.expiresAt > Date.now()) {
      const viewerAddress = publicKey.toBase58();
      if (!currentStatus.viewers?.includes(viewerAddress)) {
        const updatedStatus = {
          ...currentStatus,
          viewers: [...(currentStatus.viewers || []), viewerAddress]
        };
        // Emit status update event
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({
            type: 'status_update',
            status: updatedStatus,
            action: 'view'
          }));
        }
      }
    }
  }, [activeIndex, publicKey, statuses]);

  React.useEffect(() => {
    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          if (activeIndex < statuses.length - 1) {
            setActiveIndex(activeIndex + 1);
            return 0;
          } else {
            clearInterval(timer);
            onClose();
            return prev;
          }
        }
        return prev + 1;
      });
    }, 30); // 3 seconds total duration

    return () => clearInterval(timer);
  }, [activeIndex, statuses.length, onClose]);

  const currentStatus = statuses[activeIndex];

  // Handle swipe animation reset
  React.useEffect(() => {
    const timeout = setTimeout(() => {
      setSwipeOffset(0);
    }, 300);
    return () => clearTimeout(timeout);
  }, [activeIndex]);

  const handleTouchStart = React.useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    const startX = touch.clientX;
    
    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      const currentX = touch.clientX;
      const diff = currentX - startX;
      
      setSwipeOffset(diff);
      
      if (Math.abs(diff) > 100) {
        if (diff > 0 && activeIndex > 0) {
          setActiveIndex(activeIndex - 1);
          setProgress(0);
        } else if (diff < 0 && activeIndex < statuses.length - 1) {
          setActiveIndex(activeIndex + 1);
          setProgress(0);
        }
        setSwipeOffset(0);
        document.removeEventListener('touchmove', handleTouchMove);
      }
    };
    
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', () => {
      document.removeEventListener('touchmove', handleTouchMove);
    }, { once: true });
  }, [activeIndex, statuses.length]);

  return (
    <div 
      className="fixed inset-0 z-50 bg-black transition-transform duration-300"
      style={{
        transform: `translateX(${swipeOffset}px)`
      }}
      onTouchStart={handleTouchStart}
    >
      {/* Progress bars */}
      <div className="absolute top-0 left-0 right-0 flex space-x-1 p-2">
        {statuses.map((_, index) => (
          <div 
            key={index}
            className="h-0.5 flex-1 bg-white/30 overflow-hidden"
          >
            {index === activeIndex && (
              <div 
                className="h-full bg-white transition-all duration-30"
                style={{ width: `${progress}%` }}
              />
            )}
            {index < activeIndex && (
              <div className="h-full bg-white w-full" />
            )}
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <img
            src={currentStatus.userAvatar}
            alt=""
            className="w-10 h-10 rounded-full"
          />
          <div>
            <h3 className="text-white font-semibold">{currentStatus.userName}</h3>
            <p className="text-white/70 text-sm">
              {new Date(currentStatus.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <button className="touch-target text-white hover:bg-white/10 rounded-full p-2">
            <MoreVertical className="h-6 w-6" />
          </button>
          <button
            onClick={onClose}
            className="touch-target text-white hover:bg-white/10 rounded-full p-2"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      {/* Status Content */}
      <div className="h-full flex items-center justify-center p-4">
        {currentStatus.type === 'image' ? (
          <img
            src={currentStatus.media}
            alt=""
            className="max-h-full max-w-full object-contain"
          />
        ) : (
          <video
            src={currentStatus.media}
            autoPlay
            muted
            className="max-h-full max-w-full"
          />
        )}
      </div>

      {/* Reply input */}
      {onReply && (
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="flex items-center space-x-2 bg-white/10 rounded-full p-2">
            <Reply className="h-6 w-6 text-white" />
            <input
              type="text"
              placeholder={t('reply.to.status')}
              className="flex-1 bg-transparent text-white placeholder-white/70 focus:outline-none"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  onReply(currentStatus.id);
                }
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
