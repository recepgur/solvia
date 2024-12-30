import React from 'react';
import { Phone, Video, Wallet, Send, CreditCard, Users, Mic } from 'lucide-react';
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
  return (
    <div className="flex h-screen bg-background">
      {/* Left sidebar - Chat list */}
      <div className="w-80 border-r border-muted bg-muted">
        <div className="p-4 border-b border-muted">
          <h1 className="text-lg font-semibold text-foreground">Solvia Web Client</h1>
        </div>
        
        <div className="p-4">
          <input
            type="text"
            placeholder="Kullanıcı ID'si girin"
            value={selectedPeer}
            onChange={(e) => setSelectedPeer(e.target.value)}
            className="w-full px-3 py-2 rounded-md border border-muted-foreground bg-background"
          />
        </div>

        {/* Placeholder for future chat list */}
        <div className="space-y-2 p-4">
          <div className="p-3 rounded-lg bg-background hover:bg-muted cursor-pointer">
            <p className="font-medium">Bağlı Kullanıcılar</p>
            <p className="text-sm text-muted-foreground">Sohbet için bir kullanıcı seçin</p>
          </div>
        </div>
      </div>

      {/* Right side - Chat area */}
      <div className="flex-1 flex flex-col">
        {/* Top bar with controls */}
        <div className="h-16 border-b border-muted flex items-center justify-between px-4 bg-background">
          <div className="flex items-center space-x-4">
            <span className="font-medium">{selectedPeer || 'Kullanıcı seçin'}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => handleStartCall('audio')} className="p-2 hover:bg-muted rounded-full text-primary">
              <Phone size={20} />
            </button>
            <button onClick={() => handleStartCall('video')} className="p-2 hover:bg-muted rounded-full text-primary">
              <Video size={20} />
            </button>
          </div>
        </div>

        {/* Payment manager section */}
        {paymentManager && (
          <div className="border-b border-muted p-2 bg-muted flex items-center justify-center space-x-2">
            <button onClick={() => handlePayFee('SERVICE_FEE')} className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded inline-flex items-center gap-1">
              <CreditCard size={16} /> Servis Ücreti
            </button>
            <button onClick={() => handlePayFee('PREMIUM_SUBSCRIPTION')} className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded inline-flex items-center gap-1">
              <Wallet size={16} /> Premium
            </button>
            <button onClick={() => handlePayFee('GROUP_CALL_FEE')} className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded inline-flex items-center gap-1">
              <Users size={16} /> Grup Görüşmesi
            </button>
            <button onClick={() => handlePayFee('RECORDING_FEE')} className="px-3 py-1 text-sm bg-primary text-primary-foreground rounded inline-flex items-center gap-1">
              <Mic size={16} /> Kayıt
            </button>
          </div>
        )}

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="flex flex-col gap-2">
            {messages.map((msg, index) => {
              const isOwnMessage = msg.sender === p2pNetwork?.peerId;
              return (
                <div
                  key={index}
                  className={`
                    max-w-xs px-3 py-2 rounded-lg
                    ${isOwnMessage 
                      ? 'bg-primary text-primary-foreground self-end' 
                      : 'bg-muted self-start'
                    }
                  `}
                >
                  <span className="block text-sm font-medium mb-1">
                    {isOwnMessage ? 'Siz' : msg.sender}
                  </span>
                  <span className="block">
                    {msg.message.content}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Message input */}
        <div className="border-t border-muted p-4 bg-background">
          <div className="flex items-center space-x-2">
            <Input
              type="text"
              placeholder="Mesajınızı yazın"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 rounded-full"
            />
            <Button
              onClick={handleSendMessage}
              size="icon"
              className="rounded-full"
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
