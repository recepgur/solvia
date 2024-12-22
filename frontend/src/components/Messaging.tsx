import { useState, useEffect, useRef } from 'react';
import { Send, Mic, Forward, Smile } from 'lucide-react';
import { ReadReceipt } from './ReadReceipt';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { useWallet } from '@solana/wallet-adapter-react';
import { create } from 'ipfs-http-client';
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';
import { Buffer } from 'buffer';
import { MediaUpload } from './MediaUpload';
import { MediaPreview } from './MediaPreview';

interface Message {
  id: string;
  text: string;
  sender: string;
  timestamp: number;
  type: 'text' | 'voice' | 'forwarded' | 'media';
  reactions?: { [key: string]: string[] }; // emoji -> array of user addresses
  originalSender?: string; // for forwarded messages
  audioUrl?: string; // for voice messages
  mediaHash?: string; // IPFS hash for media content
  mediaType?: string; // MIME type of the media
  readBy?: string[]; // Array of wallet addresses that have read the message
  deliveredTo?: string[]; // Array of wallet addresses the message was delivered to
}

export function Messaging() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [selectedMedia, setSelectedMedia] = useState<{ hash: string; type: string } | null>(null);
  const [showMediaPreview, setShowMediaPreview] = useState(false);
  const { publicKey } = useWallet();
  
  const mediaRecorder = useRef<MediaRecorder | null>(null);
  const audioChunks = useRef<Blob[]>([]);
  const ipfs = create({ url: 'http://localhost:5001' });

  // Voice message recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];

      mediaRecorder.current.ondataavailable = (event) => {
        audioChunks.current.push(event.data);
      };

      mediaRecorder.current.onstop = async () => {
        const audioBlob = new Blob(audioChunks.current, { type: 'audio/webm' });
        const buffer = Buffer.from(await audioBlob.arrayBuffer());
        const { cid } = await ipfs.add(buffer);
        
        const message: Message = {
          id: cid.toString(),
          text: '',
          sender: publicKey?.toBase58() || 'anonymous',
          timestamp: Date.now(),
          type: 'voice',
          audioUrl: `https://ipfs.io/ipfs/${cid.toString()}`
        };

        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify(message));
        }
        setMessages([...messages, message]);
      };

      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
    }
  };

  const stopRecording = () => {
    if (mediaRecorder.current && isRecording) {
      mediaRecorder.current.stop();
      setIsRecording(false);
    }
  };

  // Message forwarding
  const forwardMessage = async (message: Message) => {
    const forwardedMessage: Message = {
      ...message,
      id: Date.now().toString(),
      sender: publicKey?.toBase58() || 'anonymous',
      timestamp: Date.now(),
      type: 'forwarded',
      originalSender: message.sender
    };

    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(forwardedMessage));
    }
    setMessages([...messages, forwardedMessage]);
  };

  // Emoji reactions
  const addReaction = async (messageId: string, emoji: string) => {
    const updatedMessages = messages.map(msg => {
      if (msg.id === messageId) {
        const reactions = msg.reactions || {};
        const userAddress = publicKey?.toBase58() || 'anonymous';
        
        if (!reactions[emoji]) {
          reactions[emoji] = [userAddress];
        } else if (!reactions[emoji].includes(userAddress)) {
          reactions[emoji] = [...reactions[emoji], userAddress];
        }
        
        return { ...msg, reactions };
      }
      return msg;
    });

    setMessages(updatedMessages);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'reaction', messageId, emoji, sender: publicKey?.toBase58() }));
    }
  };

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:8000/ws');
    
    socket.onopen = () => {
      console.log('WebSocket Connected');
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'message') {
        setMessages(prev => [...prev, data.message]);
      } else if (data.type === 'delivery') {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, deliveredTo: [...(msg.deliveredTo || []), data.recipient] }
            : msg
        ));
      } else if (data.type === 'read') {
        setMessages(prev => prev.map(msg => 
          msg.id === data.messageId 
            ? { ...msg, readBy: [...(msg.readBy || []), data.reader] }
            : msg
        ));
      }
    };

    socket.onclose = () => {
      console.log('WebSocket Disconnected');
      // Attempt to reconnect after 1 second
      setTimeout(() => {
        setWs(new WebSocket('ws://localhost:8000/ws'));
      }, 1000);
    };

    setWs(socket);
    // Assign to window for presence system
    window.solvioWs = socket;

    return () => {
      socket.close();
    };
  }, []);

  const sendMessage = async () => {
    if (!newMessage.trim()) return;

    try {
      // Store message content in IPFS
      const { cid } = await ipfs.add(JSON.stringify({
        text: newMessage,
        timestamp: Date.now()
      }));

      const message: Message = {
        id: cid.toString(),
        text: newMessage,
        sender: publicKey?.toBase58() || 'anonymous',
        timestamp: Date.now(),
        type: 'text',
        deliveredTo: publicKey ? [publicKey.toBase58()] : [],
        readBy: []
      };

      // Send message through WebSocket
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({
          type: 'message',
          message
        }));

        // Send delivery receipt
        if (publicKey) {
          ws.send(JSON.stringify({
            type: 'delivery',
            messageId: message.id,
            recipient: publicKey.toBase58()
          }));
        }
      }

      setMessages([...messages, message]);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  return (
    <div className="flex h-full flex-col bg-[#efeae2] dark:bg-gray-900">
      {/* Chat header */}
      <div className="flex items-center justify-between bg-[#f0f2f5] dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-600" />
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-gray-100">Chat Name</h2>
            <p className="text-sm text-gray-500">online</p>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div 
        className="flex-1 overflow-y-auto p-4 space-y-2"
        ref={messagesEndRef}
        onScroll={(e) => {
          // Mark messages as read when they come into view
          if (publicKey && ws?.readyState === WebSocket.OPEN) {
            const target = e.currentTarget;
            const messages = target.querySelectorAll('[data-message-id]');
            messages.forEach(messageEl => {
              const rect = messageEl.getBoundingClientRect();
              const isVisible = rect.top >= 0 && rect.bottom <= window.innerHeight;
              if (isVisible) {
                const messageId = messageEl.getAttribute('data-message-id');
                if (messageId) {
                  ws.send(JSON.stringify({
                    type: 'read',
                    messageId,
                    reader: publicKey.toBase58()
                  }));
                }
              }
            });
          }
        }}
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === publicKey?.toBase58() ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[65%] rounded-lg px-3 py-2 shadow-sm ${
                message.sender === publicKey?.toBase58()
                  ? 'bg-[#d9fdd3] dark:bg-green-700 rounded-tr-none'
                  : 'bg-white dark:bg-gray-800 rounded-tl-none'
              }`}
            >
              {message.type === 'forwarded' && (
                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  Forwarded from {message.originalSender}
                </div>
              )}
              {message.type === 'voice' ? (
                <div className="bg-[#2a2a2a] rounded-lg p-1">
                  <audio src={message.audioUrl} controls className="w-full h-8" />
                </div>
              ) : message.type === 'media' && message.mediaHash ? (
                <div 
                  className="cursor-pointer" 
                  onClick={() => {
                    if (message.mediaHash && message.mediaType) {
                      setSelectedMedia({ hash: message.mediaHash, type: message.mediaType });
                      setShowMediaPreview(true);
                    }
                  }}
                >
                  <MediaPreview
                    hash={message.mediaHash!}
                    type={message.mediaType!}
                    onClose={() => {}}
                    fullSize={false}
                  />
                </div>
              ) : (
                <p className="text-gray-800 dark:text-gray-100">{message.text}</p>
              )}
              {message.reactions && Object.entries(message.reactions).map(([emoji, users]) => (
                <div key={emoji} className="inline-flex items-center bg-white/50 dark:bg-gray-700/50 rounded-full px-2 py-0.5 space-x-1 mr-2 text-sm mt-1">
                  <span>{emoji}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">{users.length}</span>
                </div>
              ))}
              <div className="flex items-center justify-end mt-1 space-x-1">
                <ReadReceipt message={message} />
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
                <div className="flex space-x-1">
                  <button
                    onClick={() => forwardMessage(message)}
                    className="opacity-50 hover:opacity-100 p-1"
                  >
                    <Forward className="h-3 w-3" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedMessage(message);
                      setShowEmojiPicker(true);
                    }}
                    className="opacity-50 hover:opacity-100 p-1"
                  >
                    <Smile className="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Media Preview Modal */}
      {selectedMedia && showMediaPreview && (
        <div className="media-preview-fullscreen">
          <div className="media-content">
            <MediaPreview
              hash={selectedMedia.hash}
              type={selectedMedia.type}
              onClose={() => {
                setSelectedMedia(null);
                setShowMediaPreview(false);
              }}
              fullSize={true}
            />
          </div>
        </div>
      )}

      {/* Emoji picker */}
      {showEmojiPicker && selectedMessage && (
        <div className="absolute bottom-20 right-4 z-50 shadow-xl rounded-lg overflow-hidden">
          <Picker
            data={data}
            onEmojiSelect={(emoji: any) => {
              addReaction(selectedMessage.id, emoji.native);
              setSelectedMessage(null);
              setShowEmojiPicker(false);
            }}
          />
        </div>
      )}

      {/* Input area */}
      <div className="bg-[#f0f2f5] dark:bg-gray-800 px-4 py-3">
        <div className="flex items-center space-x-2 bg-white dark:bg-gray-700 rounded-lg px-4 py-2">
          <MediaUpload onUpload={(hash, type) => {
            const message: Message = {
              id: Date.now().toString(),
              text: '',
              sender: publicKey?.toBase58() || 'anonymous',
              timestamp: Date.now(),
              type: 'media',
              mediaHash: hash,
              mediaType: type
            };
            if (ws && ws.readyState === WebSocket.OPEN) {
              ws.send(JSON.stringify(message));
            }
            setMessages([...messages, message]);
          }} />
          <button
            onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            className="text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <Smile className="h-6 w-6" />
          </button>
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
            className="flex-1 border-0 focus:ring-0 bg-transparent placeholder-gray-500"
          />
          {newMessage.trim() ? (
            <Button
              onClick={sendMessage}
              size="icon"
              className="bg-transparent hover:bg-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <Send className="h-6 w-6" />
            </Button>
          ) : (
            <Button
              onClick={isRecording ? stopRecording : startRecording}
              size="icon"
              className={`bg-transparent hover:bg-transparent ${
                isRecording ? 'text-red-500' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <Mic className="h-6 w-6" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
