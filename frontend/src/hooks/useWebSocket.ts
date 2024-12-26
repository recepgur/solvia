import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

export function useWebSocket() {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const { publicKey } = useWallet();

  const connect = useCallback(() => {
    const socket = new WebSocket(process.env.VITE_WS_URL || 'wss://localhost:8765');

    socket.onopen = () => {
      setIsConnected(true);
      if (publicKey) {
        socket.send(JSON.stringify({
          type: 'auth',
          wallet: publicKey.toBase58()
        }));
      }
    };

    socket.onclose = () => {
      setIsConnected(false);
      setTimeout(connect, 1000); // Reconnect after 1s
    };

    socket.onerror = (error) => {
      console.error('WebSocket error:', error);
      socket.close();
    };

    setWs(socket);
  }, [publicKey]);

  useEffect(() => {
    connect();
    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [connect]);

  return { ws, isConnected };
}
