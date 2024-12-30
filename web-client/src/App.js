import React, { useEffect, useState } from 'react';
import P2PBrowserNetwork from './utils/p2p-browser';
import WebRTCBrowserManager from './utils/webrtc-browser';
import WalletConnect from './components/WalletConnect';
import PaymentManager from './utils/PaymentManager';
import ChatLayout from './components/ChatLayout';
import Login from './Login';

function App() {
  const [p2pNetwork, setP2PNetwork] = useState(null);
  const [webrtcManager, setWebrtcManager] = useState(null);
  const [message, setMessage] = useState('');
  const [selectedPeer, setSelectedPeer] = useState('');
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    const initializeManagers = async () => {
      try {
        const p2p = new P2PBrowserNetwork();
        try {
          await p2p.init();
        } catch (error) {
          console.warn('P2P network initialization failed, using local messaging:', error);
          p2p.useLocalMessaging = true;
        }
        setP2PNetwork(p2p);

        const webrtc = new WebRTCBrowserManager();
        await webrtc.init();
        setWebrtcManager(webrtc);

        // Set up message handler
        p2p.onMessage('dm', (message, sender) => {
          setMessages(prev => [...prev, { sender, message }]);
        });
      } catch (error) {
        console.error('Failed to initialize managers:', error);
      }
    };

    initializeManagers();
  }, []);

  const handleSendMessage = async () => {
    if (p2pNetwork && selectedPeer && message) {
      try {
        await p2pNetwork.sendMessage(selectedPeer, 'dm', {
          content: message,
          timestamp: Date.now()
        });
        setMessage('');
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    }
  };

  const handleStartCall = async (type) => {
    if (webrtcManager && selectedPeer) {
      try {
        const offer = await webrtcManager.startCall(selectedPeer, type);
        // Send offer through P2P network
        await p2pNetwork.sendMessage(selectedPeer, 'call', {
          type: 'offer',
          offer
        });
      } catch (error) {
        console.error('Failed to start call:', error);
      }
    }
  };

  const [paymentManager, setPaymentManager] = useState(null);

  const handleWalletConnect = async (walletType, account) => {
    console.log(`Connected to ${walletType} wallet:`, account);
    const manager = new PaymentManager();
    await manager.init(walletType, account);
    setPaymentManager(manager);
  };

  const handlePayFee = async (feeType) => {
    if (!paymentManager) {
      alert('Please connect your wallet first');
      return;
    }
    try {
      await paymentManager.payFee(feeType);
      console.log(`${feeType} payment successful`);
    } catch (error) {
      console.error('Payment failed:', error);
      alert('Payment failed: ' + error.message);
    }
  };

  const [walletConnected, setWalletConnected] = useState(false);
  const [walletType, setWalletType] = useState(null);
  const [walletAccount, setWalletAccount] = useState(null);

  const handleLoginSuccess = async (type, account) => {
    setWalletType(type);
    setWalletAccount(account);
    await handleWalletConnect(type, account);
    setWalletConnected(true);
  };

  return (
    <>
      {!walletConnected ? (
        <Login onLoginSuccess={handleLoginSuccess} />
      ) : (
        <ChatLayout
          selectedPeer={selectedPeer}
          setSelectedPeer={setSelectedPeer}
          messages={messages}
          message={message}
          setMessage={setMessage}
          handleSendMessage={handleSendMessage}
          handleStartCall={handleStartCall}
          paymentManager={paymentManager}
          handlePayFee={handlePayFee}
          p2pNetwork={p2pNetwork}
        />
      )}
    </>
  );
}

export default App;
