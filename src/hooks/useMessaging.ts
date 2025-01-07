'use client';

import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../contexts/WalletContext';
import { WebRTCService, P2PMessage } from '../services/p2p/WebRTCService';

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: number;
}

export const useMessaging = () => {
  const { publicKey } = useWallet();
  const [messages, setMessages] = useState<Message[]>([]);
  const [webRTCService] = useState(() => new WebRTCService());

  useEffect(() => {
    if (!webRTCService) return;

    webRTCService.onMessage((message: P2PMessage) => {
      setMessages(prev => [...prev, {
        id: `${message.sender}-${message.timestamp}`,
        content: message.content,
        sender: message.sender,
        timestamp: message.timestamp
      }]);
    });

    return () => {
      webRTCService.destroy();
    };
  }, [webRTCService]);

  const sendMessage = useCallback(async (content: string) => {
    if (!webRTCService || !publicKey) return;

    const message: P2PMessage = {
      type: 'text',
      content,
      timestamp: Date.now(),
      sender: publicKey
    };

    try {
      await webRTCService.sendMessage(message);
      setMessages(prev => [...prev, {
        id: `${message.sender}-${message.timestamp}`,
        content: message.content,
        sender: message.sender,
        timestamp: message.timestamp
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
    }
  }, [webRTCService, publicKey]);

  return {
    messages,
    sendMessage
  };
};
