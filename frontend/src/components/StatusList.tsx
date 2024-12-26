import * as React from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { Plus, Loader2 } from 'lucide-react';
import { type Status } from '../types/status';
import { useWallet } from '@solana/wallet-adapter-react';
import { create } from 'ipfs-http-client';
import { useWebSocket } from '../hooks/useWebSocket';

interface StatusListItem {
  id: string;
  status: Status;
  seen: boolean;
}

interface StatusListProps {
  className?: string;
}

export function StatusList({ className }: StatusListProps = {}) {
  const { t } = useLanguage();
  const { publicKey } = useWallet();
  const { ws } = useWebSocket();
  const [statusItems, setStatusItems] = React.useState<StatusListItem[]>([]);
  const [isUploading, setIsUploading] = React.useState(false);
  const ipfs = create({ url: 'http://localhost:5001' });

  // Handle incoming status updates
  React.useEffect(() => {
    if (!ws) return;

    const handleMessage = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.type === 'status_update') {
        switch (data.action) {
          case 'create':
            setStatusItems(prev => [{
              id: data.status.id,
              status: data.status,
              seen: data.status.userId === publicKey?.toBase58()
            }, ...prev]);
            break;
          case 'view':
            setStatusItems(prev => prev.map(item => 
              item.id === data.status.id 
                ? { ...item, status: data.status }
                : item
            ));
            break;
          case 'expire':
            setStatusItems(prev => prev.filter(item => item.id !== data.status.id));
            break;
        }
      }
    };

    ws.addEventListener('message', handleMessage);
    return () => ws.removeEventListener('message', handleMessage);
  }, [ws, publicKey]);

  // Cleanup expired statuses
  React.useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      setStatusItems(prev => prev.filter(item => item.status.expiresAt > now));
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  // Upload status to IPFS
  const uploadStatus = async (file: File) => {
    try {
      setIsUploading(true);
      const buffer = Buffer.from(await file.arrayBuffer());
      const result = await ipfs.add(buffer);
      const mediaHash = result.cid.toString();
      
      const newStatus: Status = {
        id: Date.now().toString(),
        userId: publicKey?.toBase58() || 'anonymous',
        userName: t('my.status'),
        media: `https://ipfs.io/ipfs/${mediaHash}`,
        mediaHash,
        type: file.type.startsWith('image/') ? 'image' : 'video',
        timestamp: Date.now(),
        expiresAt: Date.now() + (24 * 60 * 60 * 1000), // 24 hours
        viewers: [],
        mediaType: file.type
      };

      // Emit status update event
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'status_update',
          status: newStatus,
          action: 'create'
        }));
      }

      setStatusItems(prev => [{
        id: newStatus.id,
        status: newStatus,
        seen: true
      }, ...prev]);
    } catch (error) {
      console.error('Error uploading status:', error);
      // Show error message to user
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'error',
          error: 'Failed to upload status. Please try again.'
        }));
      }
    } finally {
      setIsUploading(false);
    }
  };

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      uploadStatus(file);
    }
  };

  return (
    <div className={`flex-1 overflow-y-auto bg-[var(--background)] ${className || ''}`}>
      {/* My Status */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*,video/*"
        onChange={handleFileSelect}
      />
      <button 
        className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-[var(--hover-background)] border-b border-[var(--border-light)]"
        onClick={() => fileInputRef.current?.click()}
      >
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-[var(--hover-background)] flex-shrink-0 overflow-hidden" />
          <div className="absolute bottom-0 right-0 bg-[var(--primary)] rounded-full p-1 border-2 border-[var(--background)]">
            {isUploading ? (
              <Loader2 className="h-4 w-4 text-[var(--text-primary)] animate-spin" />
            ) : (
              <Plus className="h-4 w-4 text-[var(--text-primary)]" />
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 dark:text-gray-100">
            {t('my.status')}
          </h3>
          <p className="text-sm text-[#667781] dark:text-gray-400">{t('tap.to.add')}</p>
        </div>
      </button>

      {/* Recent Updates */}
      <div className="px-4 py-2 text-sm text-[#667781] dark:text-gray-400 bg-white dark:bg-gray-900">
        {t('recent.updates')}
      </div>
      {statusItems.filter(item => item.status.expiresAt > Date.now()).map((item) => (
        <button
          key={item.id}
          className="w-full flex items-center space-x-3 px-4 py-3 hover:bg-[#f5f6f6] dark:hover:bg-gray-800 bg-white dark:bg-gray-900"
        >
          <div className="relative">
            <div className={`w-12 h-12 rounded-full bg-[#dfe5e7] dark:bg-gray-600 flex-shrink-0 ring-2 ${
              item.seen ? 'ring-[#8696a0]' : 'ring-[#00a884]'
            } overflow-hidden`}>
              {item.status.userAvatar && (
                <img 
                  src={item.status.userAvatar}
                  alt={item.status.userName}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-gray-900 dark:text-gray-100">
              {item.status.userName}
            </h3>
            <p className="text-sm text-[#667781] dark:text-gray-400">
              {new Date(item.status.timestamp).toLocaleTimeString()}
            </p>
          </div>
        </button>
      ))}
    </div>
  );
}
