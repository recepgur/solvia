import { useState, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
// Web3 imports for future blockchain integration
import { uploadToIPFS } from '../services/ipfs';
import type { PresenceData } from '../types/presence.d';

// Using PresenceData interface from types/presence.d.ts

export function usePresence() {
  const [onlineUsers, setOnlineUsers] = useState<PresenceData[]>([]);
  const { publicKey } = useWallet();
  const PRESENCE_UPDATE_INTERVAL = 30000; // 30 seconds

  // Update presence on IPFS periodically
  useEffect(() => {
    if (!publicKey) return;

    const updatePresence = async () => {
      try {
        const presenceData: PresenceData = {
          address: publicKey.toBase58(),
          lastSeen: Date.now(),
          status: 'online'
        };

        // Store presence data on IPFS
        await uploadToIPFS(JSON.stringify(presenceData));
        
        // Broadcast presence update through WebSocket
        if (window.solvioWs && window.solvioWs.readyState === WebSocket.OPEN) {
          window.solvioWs.send(JSON.stringify({
            type: 'presence',
            data: presenceData
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
        setOnlineUsers(prev => {
          const filtered = prev.filter(user => user.address !== data.data.address);
          return [...filtered, data.data];
        });
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
