import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useBackup } from './useBackup';
import type { BackupData } from '../types/backup';

interface PresenceData {
  address: string;
  lastSeen: number;
  status: 'online' | 'offline';
  deviceId: string;
  priority: number; // Higher priority devices take precedence in conflicts
}

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<PresenceData[]>([]);
  const [deviceId] = useState(() => `${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const { publicKey } = useWallet();
  const { backupAllChats: storeLocalBackup, restoreChats: getLocalBackup } = useBackup();
  const PRESENCE_UPDATE_INTERVAL = 30000; // 30 seconds
  const DEVICE_PRIORITY = 1; // Increase for more important devices like primary phone/computer

  // Update presence on IPFS periodically
  useEffect(() => {
    if (!publicKey) return;

    const updatePresence = async () => {
      try {
        // Get existing presence data from backup
        const backup = await getLocalBackup();
        const existingPresence = backup?.presence || [];
        
        const presenceData: PresenceData = {
          address: publicKey.toBase58(),
          lastSeen: Date.now(),
          status: 'online',
          deviceId,
          priority: DEVICE_PRIORITY
        };

        // Merge with existing presence data, handling conflicts
        const filteredPresence = existingPresence.filter(
          (p: PresenceData) => p.address !== publicKey.toBase58() || p.deviceId !== deviceId
        );
        
        // Sort by priority and lastSeen for conflict resolution
        const mergedPresence = [...filteredPresence, presenceData]
          .sort((a, b) => {
            if (a.priority !== b.priority) return b.priority - a.priority;
            return b.lastSeen - a.lastSeen;
          });

        // Store updated presence data
        await storeLocalBackup({
          ...backup,
          presence: mergedPresence
        });
        
        // Broadcast presence update through WebSocket
        if (window.solvioWs && window.solvioWs.readyState === WebSocket.OPEN) {
          window.solvioWs.send(JSON.stringify({
            type: 'presence',
            data: presenceData,
            mergedPresence // Send full presence state for sync
          }));
        }
      } catch (error) {
        console.error('Error updating presence:', error);
      }
    };

    const interval = setInterval(updatePresence, PRESENCE_UPDATE_INTERVAL);
    updatePresence(); // Initial update

    return () => {
      clearInterval(interval);
      // Set offline status when component unmounts
      if (window.solvioWs && window.solvioWs.readyState === WebSocket.OPEN) {
        window.solvioWs.send(JSON.stringify({
          type: 'presence',
          data: {
            address: publicKey.toBase58(),
            lastSeen: Date.now(),
            status: 'offline'
          }
        }));
      }
    };
  }, [publicKey]);

  // Handle presence updates from WebSocket
  useEffect(() => {
    const handlePresenceUpdate = (event: MessageEvent) => {
      const data = JSON.parse(event.data);
      if (data.type === 'presence') {
        // Handle merged presence data if available
        if (data.mergedPresence) {
          setOnlineUsers(data.mergedPresence);
        } else {
          // Fall back to single-device update
          setOnlineUsers(prev => {
            const filtered = prev.filter(
              user => user.address !== data.data.address || user.deviceId !== data.data.deviceId
            );
            return [...filtered, data.data].sort((a, b) => {
              if (a.priority !== b.priority) return b.priority - a.priority;
              return b.lastSeen - a.lastSeen;
            });
          });
        }
      }
    };

    if (window.solvioWs) {
      window.solvioWs.addEventListener('message', handlePresenceUpdate);
    }

    return () => {
      if (window.solvioWs) {
        window.solvioWs.removeEventListener('message', handlePresenceUpdate);
      }
    };
  }, []);

  return {
    onlineUsers,
    isOnline: (address: string) => 
      onlineUsers.some(user => 
        user.address === address && 
        user.status === 'online' && 
        Date.now() - user.lastSeen < PRESENCE_UPDATE_INTERVAL * 2
      )
  };
}
