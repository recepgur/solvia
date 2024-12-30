import React, { useState, useEffect, Suspense } from 'react';
import { Wallet, Send, CreditCard, Users, Mic } from 'lucide-react';

// Lazy load video call UI
const VideoCallUI = React.lazy(() => import('./VideoCallUI'));
import { getMessage, setLanguage } from '../utils/language';
import LanguageToggle from './LanguageToggle';
import { Button } from './ui/button';
import { Input } from './ui/input';

function ChatLayout({
  selectedPeer,
  setSelectedPeer,
  messages,
  message,
  setMessage,
  handleSendMessage,
  handleStartCall,
  paymentManager,
  handlePayFee,
  p2pNetwork
}) {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return localStorage.getItem('language') || 'tr';
  });

  useEffect(() => {
    setLanguage(currentLanguage);
  }, [currentLanguage]);
  return (
    <div className="flex flex-col md:flex-row h-screen bg-gray-100">
      {/* Left sidebar - Chat list */}
      <div className={`${selectedPeer ? 'hidden md:block' : 'block'} w-full md:w-80 border-r border-gray-200 bg-white`}>
        <div className="p-4 bg-blue-600 text-white">
          <div className="flex items-center justify-between">
            <h1 className="text-lg font-semibold">{getMessage('SOLVIA_WEB_CLIENT')}</h1>
            <div className="flex items-center space-x-2">
              <LanguageToggle
                currentLanguage={currentLanguage}
                onLanguageChange={setCurrentLanguage}
              />
              <button className="md:hidden p-2 hover:bg-blue-700 rounded-full">
                <Users size={20} />
              </button>
            </div>
          </div>
        </div>
        
        <div className="p-4">
          <div className="relative">
            <input
              type="text"
              placeholder={getMessage('ENTER_USER_ID')}
              value={selectedPeer}
              onChange={(e) => setSelectedPeer(e.target.value)}
              className="w-full px-4 py-2 rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Placeholder for future chat list */}
        <div className="space-y-2 p-4">
          <div className="p-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100">
            <p className="font-medium text-gray-800">{getMessage('CONNECTED_USERS')}</p>
            <p className="text-sm text-gray-500">{getMessage('SELECT_USER_TO_CHAT')}</p>
          </div>
        </div>
      </div>

      {/* Right side - Chat area */}
      <div className={`${selectedPeer ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-gray-50`}>
        {/* Top bar with controls */}
        <div className="h-16 border-b border-gray-200 flex items-center justify-between px-4 bg-blue-600 text-white">
          <div className="flex items-center space-x-4">
            {selectedPeer && (
              <button  
                className="md:hidden p-2 -ml-2 hover:bg-blue-700 rounded-full"
                onClick={() => setSelectedPeer(null)}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
            )}
            <span className="font-medium">{selectedPeer || getMessage('SELECT_USER')}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Suspense fallback={<div className="flex items-center justify-center w-24">Loading...</div>}>
              <VideoCallUI handleStartCall={handleStartCall} />
            </Suspense>
          </div>
        </div>

        {/* Payment manager section */}
        {paymentManager && (
          <div className="border-b border-gray-200 p-2 bg-white flex flex-wrap items-center justify-center gap-2">
            <button onClick={() => handlePayFee('SERVICE_FEE')} className="px-3 py-1 text-sm bg-blue-600 text-white rounded-full inline-flex items-center gap-1 hover:bg-blue-700">
              <CreditCard size={16} /> {getMessage('SERVICE_FEE_LABEL')}
            </button>
            <button onClick={() => handlePayFee('PREMIUM_SUBSCRIPTION')} className="px-3 py-1 text-sm bg-blue-600 text-white rounded-full inline-flex items-center gap-1 hover:bg-blue-700">
              <Wallet size={16} /> {getMessage('PREMIUM_LABEL')}
            </button>
            <button onClick={() => handlePayFee('GROUP_CALL_FEE')} className="px-3 py-1 text-sm bg-blue-600 text-white rounded-full inline-flex items-center gap-1 hover:bg-blue-700">
              <Users size={16} /> {getMessage('GROUP_CALL_LABEL')}
            </button>
            <button onClick={() => handlePayFee('RECORDING_FEE')} className="px-3 py-1 text-sm bg-blue-600 text-white rounded-full inline-flex items-center gap-1 hover:bg-blue-700">
              <Mic size={16} /> {getMessage('RECORDING_LABEL')}
            </button>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4 bg-gradient-to-b from-gray-50 to-gray-100">
          <div className="flex flex-col gap-2">
            {messages.map((msg, index) => {
              const isOwnMessage = msg.sender === p2pNetwork?.peerId;
              return (
                <div
                  key={index}
                  className={`
                    max-w-[85%] md:max-w-xs px-3 py-2 rounded-lg shadow-sm
                    ${isOwnMessage 
                      ? 'bg-blue-100 text-gray-800 self-end rounded-tr-none' 
                      : 'bg-white text-gray-800 self-start rounded-tl-none'
                    }
                  `}
                >
                  <span className="block text-sm font-medium mb-1 text-blue-600">
                    {isOwnMessage ? getMessage('YOU') : msg.sender}
                  </span>
                  <span className="block">
                    {msg.message.content}
                  </span>
                  <span className="text-xs text-gray-500 float-right mt-1">
                    {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Message input */}
        <div className="border-t border-gray-200 p-3 bg-white">
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder={getMessage('TYPE_YOUR_MESSAGE')}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 rounded-full border-0 focus:ring-1 focus:ring-blue-500 bg-gray-50 shadow-sm py-6"
            />
            <Button
              onClick={handleSendMessage}
              size="icon"
              className="rounded-full bg-blue-600 hover:bg-blue-700 text-white shadow-sm h-12 w-12"
            >
              <Send size={20} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ChatLayout;
