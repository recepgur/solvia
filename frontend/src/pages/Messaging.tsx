import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import metadata from '../../../metadata.json';

// Get DComm trait from metadata
const dcommTrait = metadata.attributes.find(attr => attr.trait_type === 'Utility')?.value;

// Translations
const translations = {
  en: {
    title: 'DCOOM Messaging',
    subtitle: `Secure ${dcommTrait}-powered blockchain messaging`,
    placeholder: 'Type your message...',
    send: 'Send',
    sending: 'Sending...',
    verifying: 'Verifying on blockchain...',
    verified: 'Verified on chain',
    noMessages: 'No messages yet. Start the conversation!',
    connected: 'Connected to Solana',
    tokenEnabled: 'SOLV Token Enabled',
    dcommEnabled: `${dcommTrait} Protocol Active`,
  },
  tr: {
    title: 'DCOOM Mesajlaşma',
    subtitle: `Güvenli ${dcommTrait} destekli blockchain mesajlaşma`,
    placeholder: 'Mesajınızı yazın...',
    send: 'Gönder',
    sending: 'Gönderiliyor...',
    verifying: 'Blockchain üzerinde doğrulanıyor...',
    verified: 'Zincirde doğrulandı',
    noMessages: 'Henüz mesaj yok. Konuşmaya başlayın!',
    connected: 'Solana\'ya Bağlı',
    tokenEnabled: 'SOLV Token Aktif',
    dcommEnabled: `${dcommTrait} Protokolü Aktif`,
  }
};

// Particle animation component
const VerificationParticles = () => (
  <div className="absolute inset-0 pointer-events-none">
    {Array.from({ length: 8 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-1 h-1 bg-blue-400 rounded-full"
        initial={{ 
          x: '50%',
          y: '50%',
          scale: 0 
        }}
        animate={{
          x: `${35 + Math.random() * 30}%`,
          y: `${35 + Math.random() * 30}%`,
          scale: [0, 2, 0],
          opacity: [0, 1, 0],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatType: 'loop',
          ease: 'easeInOut',
          delay: i * 0.2,
        }}
      />
    ))}
  </div>
);

// Solana message validation types
interface SolanaValidation {
  signature?: string;
  blockTime?: number;
  slot?: number;
  confirmations?: number;
}

// Types for messages
interface Message {
  id: string;
  text: string;
  timestamp: number;
  sender: string;
  verified: boolean;
  transactionHash?: string;
  validation?: SolanaValidation;
  error?: string;
}

// Placeholder for Solana message validation
async function validateMessageWithSolana(message: string): Promise<SolanaValidation> {
  // TODO: Implement actual Solana validation when packages are available
  console.log('Validating message with Solana:', message);
  
  // Simulate blockchain validation
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  return {
    signature: `solana:${Date.now().toString(16)}`,
    blockTime: Date.now(),
    slot: Math.floor(Math.random() * 1000000),
    confirmations: 1
  };
}

// Placeholder for checking SOLV token holdings
async function checkSolvTokenHoldings(address: string): Promise<boolean> {
  // TODO: Implement actual token check when packages are available
  console.log('Checking SOLV token holdings for:', address);
  return true;
}

export function Messaging() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [language, setLanguage] = useState<'en' | 'tr'>('en');
  
  const t = translations[language];

  // Simulated blockchain message sending with DComm verification
  const sendMessage = async () => {
    if (!inputText.trim() || isProcessing) return;
    
    setIsProcessing(true);
    
    try {
      // TODO: Get actual wallet address when Solana packages are available
      const userAddress = 'CzNeEPiGXutW2kx2HQyy3peD7763iEiYYEMxxbKyYX2';
      
      // Check if user holds SOLV tokens
      const hasTokens = await checkSolvTokenHoldings(userAddress);
      if (!hasTokens) {
        const errorMsg = 'Error: SOLV token holdings required for messaging';
        setMessages(prev => [...prev, {
          id: Date.now().toString(),
          text: inputText,
          timestamp: Date.now(),
          sender: userAddress,
          verified: false,
          error: errorMsg
        }]);
        setInputText('');
        setIsProcessing(false);
        return;
      }
      
      // Create new message with verification status
      const newMessage: Message = {
        id: Date.now().toString(),
        text: inputText,
        timestamp: Date.now(),
        sender: userAddress,
        verified: false,
        transactionHash: undefined,
        validation: undefined,
      };

      // Add unverified message immediately
      setMessages(prev => [...prev, newMessage]);
      setInputText('');

      // Simulate DComm and Solana blockchain verification
      const validation = await validateMessageWithSolana(inputText);
      
      // Update message with validation results
      setMessages(prev => 
        prev.map(msg => 
          msg.id === newMessage.id 
            ? { 
                ...msg, 
                verified: true, 
                transactionHash: validation.signature,
                validation: validation
              }
            : msg
        )
      );
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
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-blue-900 to-black text-white p-4">
      <Card className="container mx-auto max-w-4xl bg-gray-800/30 border-gray-700 backdrop-blur-lg">
        <CardHeader>
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center"
          >
            <CardTitle className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              {t.title}
            </CardTitle>
            <CardDescription className="text-gray-300 mt-2">
              {t.subtitle}
            </CardDescription>
          </motion.div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Messages Container */}
          <ScrollArea className="h-[60vh] pr-4">
            <AnimatePresence>
              {messages.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 0.6 }}
                  className="flex items-center justify-center h-full text-gray-400"
                >
                  {t.noMessages}
                </motion.div>
              ) : (
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, x: -20, rotateX: -10, scale: 0.95 }}
                      animate={{ 
                        opacity: 1, 
                        x: 0, 
                        rotateX: 0, 
                        scale: 1,
                        filter: [
                          "drop-shadow(0 0 0px rgba(59, 130, 246, 0))",
                          "drop-shadow(0 0 10px rgba(59, 130, 246, 0.3))",
                          "drop-shadow(0 0 0px rgba(59, 130, 246, 0))"
                        ]
                      }}
                      exit={{ opacity: 0, scale: 0.95, y: 20, rotateX: 10 }}
                      transition={{
                        type: "spring",
                        stiffness: 100,
                        damping: 15,
                        mass: 1
                      }}
                      style={{ 
                        perspective: "1000px",
                        transformStyle: "preserve-3d"
                      }}
                      whileHover={{
                        scale: 1.02,
                        rotateX: 2,
                        transition: { duration: 0.2 }
                      }}
                      className="relative bg-gray-700/30 rounded-lg p-4 backdrop-blur-sm border border-gray-600/30 shadow-lg"
                    >
                      <div className="flex justify-between items-start mb-2">
                        <Badge variant="secondary" className="text-sm">
                          {msg.sender}
                        </Badge>
                        <span className="text-xs text-gray-400">
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <p className="text-gray-200">{msg.text}</p>
                      
                      {/* Verification Status */}
                      {!msg.verified && <VerificationParticles />}
                      <motion.div
                        className="absolute -inset-px rounded-lg"
                        initial={{ borderColor: 'rgba(59, 130, 246, 0.2)' }}
                        animate={{
                          borderColor: msg.verified 
                            ? 'rgba(74, 222, 128, 0.2)'
                            : 'rgba(59, 130, 246, 0.2)',
                        }}
                        transition={{ duration: 0.5 }}
                      />
                      <div className="absolute -top-2 right-2 flex gap-2">
                        <motion.div
                          animate={{
                            filter: msg.verified
                              ? "drop-shadow(0 0 8px rgba(74, 222, 128, 0.3))"
                              : "drop-shadow(0 0 8px rgba(59, 130, 246, 0.3))",
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            repeatType: "reverse"
                          }}
                        >
                          <Badge
                            variant="outline"
                            className={`${
                              msg.verified
                                ? 'text-green-400 border-green-400'
                                : 'text-blue-400 border-blue-400'
                            } transition-all duration-300`}
                          >
                            {msg.verified ? t.verified : t.verifying}
                          </Badge>
                        </motion.div>
                        {msg.validation && (
                          <Badge
                            variant="outline"
                            className="text-purple-400 border-purple-400"
                            title={`Slot: ${msg.validation.slot}\nConfirmations: ${msg.validation.confirmations}`}
                          >
                            #{msg.validation.slot}
                          </Badge>
                        )}
                      </div>
                      
                      {/* Error Display */}
                      {msg.error && (
                        <div className="mt-2 text-sm text-red-400">
                          {msg.error}
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </AnimatePresence>
          </ScrollArea>

          {/* Input Area */}
          <Card className="bg-gray-700/20 border-gray-600/30">
            <CardContent className="p-4">
              <div className="flex space-x-4">
                <Input
                  type="text"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder={t.placeholder}
                  className="flex-1 bg-gray-600/30 border-gray-500/50 text-white placeholder:text-gray-400"
                  disabled={isProcessing}
                />
                <Button
                  onClick={sendMessage}
                  disabled={isProcessing}
                  className="relative overflow-hidden min-w-[120px] group"
                  variant="default"
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-blue-500 group-hover:bg-gradient-to-r group-hover:from-blue-600 group-hover:via-purple-600 group-hover:to-blue-600"
                    style={{ opacity: 0.8, backgroundSize: "200% 100%" }}
                    animate={{
                      backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"],
                    }}
                    transition={{
                      duration: 5,
                      repeat: Infinity,
                      ease: "linear"
                    }}
                    whileHover={{ 
                      scale: 1.1,
                      filter: "brightness(1.2) drop-shadow(0 0 10px rgba(59, 130, 246, 0.5))"
                    }}
                    whileTap={{ scale: 0.9 }}
                  />
                  <motion.span 
                    className="relative"
                    animate={isProcessing ? {
                      scale: [1, 1.1, 1],
                      opacity: [1, 0.7, 1]
                    } : {}}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                  >
                    {isProcessing ? t.sending : t.send}
                  </motion.span>
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Blockchain Status */}
          <div className="flex flex-wrap justify-center gap-2">
            <Badge variant="outline" className="text-green-400 border-green-400">
              {t.connected}
            </Badge>
            <Badge variant="outline" className="text-blue-400 border-blue-400">
              {t.tokenEnabled}
            </Badge>
            <Badge variant="outline" className="text-purple-400 border-purple-400">
              {t.dcommEnabled}
            </Badge>
          </div>

          {/* Language Toggle */}
          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => setLanguage(prev => prev === 'en' ? 'tr' : 'en')}
              className="text-gray-400 hover:text-white"
            >
              {language.toUpperCase()}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
