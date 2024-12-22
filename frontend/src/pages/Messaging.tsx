import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

// Types for messages
interface Message {
  id: string;
  text: string;
  timestamp: number;
  sender: string;
}

export function Messaging() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Simulated blockchain message sending
  const sendMessage = async () => {
    if (!inputText.trim() || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // Create new message
      const newMessage: Message = {
        id: Date.now().toString(),
        text: inputText,
        timestamp: Date.now(),
        sender: 'User', // TODO: Replace with actual wallet address
      };

      // Simulate blockchain transaction
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Add message to state
      setMessages(prev => [...prev, newMessage]);
      setInputText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4">
      <Card className="container mx-auto max-w-4xl bg-gray-800/50 border-gray-700">
        <CardHeader>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <CardTitle className="text-4xl font-bold mb-2">DCOOM Messaging</CardTitle>
            <CardDescription className="text-gray-400">
              Blockchain-Powered Secure Communication
            </CardDescription>
          </motion.div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Messages Container */}
          <ScrollArea className="h-[60vh] pr-4">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                No messages yet. Start the conversation!
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-gray-700/50 rounded-lg p-4 backdrop-blur-sm"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <Badge variant="secondary" className="text-sm">
                        {msg.sender}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {new Date(msg.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-gray-200">{msg.text}</p>
                  </motion.div>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <Card className="bg-gray-700/30 border-gray-600">
            <CardContent className="p-4">
              <div className="flex space-x-4">
                <Input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message..."
                  className="flex-1 bg-gray-600/50 border-gray-500 text-white placeholder:text-gray-400"
                  disabled={isProcessing}
                />
                <Button
                  onClick={sendMessage}
                  disabled={isProcessing}
                  className="relative overflow-hidden"
                  variant="default"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500"
                    style={{ opacity: 0.8 }}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  />
                  <span className="relative">
                    {isProcessing ? 'Sending...' : 'Send'}
                  </span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Blockchain Status */}
          <div className="text-center space-x-2">
            <Badge variant="outline" className="text-green-400 border-green-400">
              Connected to Solana
            </Badge>
            <Badge variant="outline" className="text-blue-400 border-blue-400">
              SOLV Token Enabled
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
