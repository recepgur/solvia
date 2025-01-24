import { useEffect, useRef, useCallback } from 'react';
import ApiService from '../services/api';

interface WebSocketHook {
  sendMessage: (message: any) => void;
  connected: boolean;
}

export function useWebSocket(userId: string, onMessage: (data: any) => void): WebSocketHook {
  const ws = useRef<WebSocket | null>(null);
  const connected = useRef<boolean>(false);

  const connect = useCallback(() => {
    if (ws.current?.readyState !== WebSocket.OPEN) {
      ws.current = new WebSocket(ApiService.getWebSocketUrl(userId));

      ws.current.onopen = () => {
        console.log('WebSocket connected');
        connected.current = true;
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage(data);
        } catch (error) {
          console.error('WebSocket message parse error:', error);
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        connected.current = false;
      };

      ws.current.onclose = () => {
        console.log('WebSocket disconnected');
        connected.current = false;
        // Attempt to reconnect after 3 seconds
        setTimeout(connect, 3000);
      };
    }
  }, [userId, onMessage]);

  useEffect(() => {
    connect();
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  const sendMessage = useCallback((message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);

  return {
    sendMessage,
    connected: connected.current,
  };
}
