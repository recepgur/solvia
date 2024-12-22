import React, { useState } from 'react';
import { ThreeScene } from '../../components/3d/ThreeScene';
import { translations, Language, TranslationKey } from '../i18n/translations';

interface Message {
  id: string;
  text: string;
  verified: boolean;
  timestamp: number;
}

export function Messaging() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [language, setLanguage] = useState<Language>('en');
  
  const t = (key: TranslationKey) => translations[language][key];

  // Simulated blockchain message validation with multiple stages
  const validateMessageWithSolana = async (_text: string): Promise<boolean> => {
    setIsProcessing(true);
    
    try {
      // Stage 1: Initial validation (simulated network connection)
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Stage 2: Blockchain transaction simulation
      await new Promise(resolve => setTimeout(resolve, 600));
      
      // Stage 3: Transaction confirmation
      await new Promise(resolve => setTimeout(resolve, 600));
      
      return true;
    } catch (error) {
      console.error('Blockchain validation error:', error);
      return false;
    } finally {
      setIsProcessing(false);
    }
  };

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const message: Message = {
      id: Date.now().toString(),
      text: newMessage,
      verified: false,
      timestamp: Date.now(),
    };

    // Add unverified message immediately for better UX
    setMessages(prev => [...prev, message]);
    setNewMessage('');

    // Validate through blockchain
    const isValid = await validateMessageWithSolana(newMessage);
    
    // Update message verification status
    setMessages(prev =>
      prev.map(msg =>
        msg.id === message.id
          ? { ...msg, verified: isValid }
          : msg
      )
    );
  };

  return (
    <div className="relative min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      {/* 3D Scene Background */}
      <div className="absolute inset-0 -z-10">
        <ThreeScene isProcessing={isProcessing} />
      </div>

      {/* Messaging Interface */}
      <div className="container mx-auto px-4 py-8 max-h-screen overflow-hidden">
        <div className="max-w-2xl mx-auto flex flex-col h-full">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-4xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-300">
              {t('title')}
            </h1>
            <button
              onClick={() => setLanguage(lang => lang === 'en' ? 'tr' : 'en')}
              className="px-4 py-2 rounded-lg bg-gray-800/50 border border-gray-700/50 hover:border-blue-400/50 hover:bg-gray-700/50 transition-all duration-200"
            >
              {language === 'en' ? '🇹🇷 Türkçe' : '🇬🇧 English'}
            </button>
          </div>
          <p className="text-lg text-center text-gray-400 mb-8">
            {t('subtitle')}
          </p>
          
          {/* Messages List */}
          <div className="space-y-4 mb-8 flex-1 min-h-0 overflow-y-auto">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`p-4 rounded-lg backdrop-blur-md ${
                  message.verified
                    ? 'bg-blue-500/20 border border-blue-400/30'
                    : 'bg-gray-700/20 border border-gray-600/30'
                }`}
              >
                <p className="text-lg">{message.text}</p>
                <div className="flex items-center mt-2 text-sm text-gray-400">
                  <span className="mr-2">
                    {new Date(message.timestamp).toLocaleTimeString()}
                  </span>
                  {message.verified && (
                    <span className="text-cyan-400">{t('verified')}</span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Message Input */}
          <form onSubmit={sendMessage} className="relative">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={t('placeholder')}
              className="w-full p-4 rounded-lg bg-gray-800/50 border border-gray-700/50 focus:border-blue-400/50 focus:ring-2 focus:ring-blue-400/20 transition-all duration-200 backdrop-blur-sm"
              disabled={isProcessing}
            />
            <button
              type="submit"
              disabled={isProcessing}
              className={`absolute right-4 top-1/2 -translate-y-1/2 px-4 py-2 rounded-md ${
                isProcessing
                  ? 'bg-gray-700 text-gray-400'
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              } transition-all duration-200`}
            >
              {isProcessing ? t('verifying') : t('send')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
