import { useState, useEffect } from 'react';
import { Send } from 'lucide-react';
import { Message } from '../types/messages';
import { messageStore } from '../utils/MessageStore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import AudioRecorder from './AudioRecorder';

// Message interface is imported from types/messages

interface ChatWindowProps {
  walletAddress: string;
  selectedContact?: string;
}

export function ChatWindow({ walletAddress, selectedContact }: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSyncing, setSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSyncing(true);
      messageStore.syncPendingMessages()
        .then(() => setSyncing(false))
        .catch(error => {
          console.error('Failed to sync messages:', error);
          setSyncing(false);
        });
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!selectedContact) return;

    // Connect to WebSocket
    const wsConnection = new WebSocket(`ws://${import.meta.env.VITE_BACKEND_URL.replace('http://', '')}/messages/real-time?wallet_address=${walletAddress}`);
    
    wsConnection.onmessage = (event) => {
      const message = JSON.parse(event.data);
      setMessages(prev => [...prev, message]);
    };

    return () => {
      wsConnection.close();
    };
  }, [walletAddress, selectedContact]);

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedContact) return;


    const message: Message = {
      id: crypto.randomUUID(),
      content: newMessage,
      sender_address: walletAddress,
      recipient_address: selectedContact,
      timestamp: new Date().toISOString(),
      message_type: 'text',
      status: 'pending',
      offline: !navigator.onLine,
    };

    // Store message locally first
    await messageStore.storeMessage(message);
    setMessages(prev => [...prev, message]);
    setNewMessage('');

    if (navigator.onLine) {
      try {
        const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/messages/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: newMessage,
            recipient_address: selectedContact,
            wallet_address: walletAddress,
          }),
        });

        if (response.ok) {
          await messageStore.updateMessageStatus(message.id, 'sent');
        }
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  };

  if (!selectedContact) {
    return (
      <Card className="h-full flex items-center justify-center">
        <CardContent>
          <p className="text-gray-500">Select a contact to start chatting</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>{selectedContact}</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col">
        <ScrollArea className="flex-1 mb-4">
          {isSyncing && (
            <div className="text-center text-sm text-gray-500 py-2">
              Syncing messages...
            </div>
          )}
          {!isOnline && (
            <div className="text-center text-sm text-yellow-500 py-2">
              You are offline. Messages will be sent when you reconnect.
            </div>
          )}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`mb-2 p-2 rounded-lg ${
                message.sender_address === walletAddress
                  ? 'bg-blue-500 text-white ml-auto'
                  : 'bg-gray-100'
              } max-w-[80%]`}
            >
              {message.message_type === 'voice' ? (
                <div className="flex flex-col gap-2">
                  <audio
                    controls
                    src={message.media_url}
                    className="max-w-[200px]"
                  />
                  {message.upload_progress !== undefined && message.upload_progress < 100 && (
                    <Progress value={message.upload_progress} className="w-full" />
                  )}
                </div>
              ) : (
                <p>{message.content}</p>
              )}
              <small className="text-xs opacity-75">
                {new Date(message.timestamp).toLocaleTimeString()}
              </small>
            </div>
          ))}
        </ScrollArea>
        <div className="flex gap-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          />
          <AudioRecorder
            onSend={async (audioBlob) => {
              const tempId = crypto.randomUUID();
              const tempMessage: Message = {
                id: tempId,
                content: '',
                sender_address: walletAddress,
                recipient_address: selectedContact,
                timestamp: new Date().toISOString(),
                message_type: 'voice',
                status: 'pending',
                offline: !navigator.onLine,
                upload_progress: 0,
              };
              
              setMessages(prev => [...prev, tempMessage]);
              
              const formData = new FormData();
              formData.append('file', audioBlob, 'voice_message.webm');
              
              try {
                const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/messages/upload-voice`, {
                  method: 'POST',
                  body: formData,
                });
                
                if (response.ok) {
                  const { media_url } = await response.json();
                  
                  // Update message with media URL
                  setMessages(prev => prev.map(msg => 
                    msg.id === tempId 
                      ? { ...msg, media_url, upload_progress: 100 }
                      : msg
                  ));
                  
                  // Send message through WebSocket
                  await fetch(`${import.meta.env.VITE_BACKEND_URL}/messages/send`, {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      content: '',
                      recipient_address: selectedContact,
                      wallet_address: walletAddress,
                      message_type: 'voice',
                      media_url,
                    }),
                  });
                }
              } catch (error) {
                console.error('Failed to send voice message:', error);
                // Remove failed message
                setMessages(prev => prev.filter(msg => msg.id !== tempId));
              }
            }}
          />
          <Button onClick={sendMessage}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}