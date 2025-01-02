import { useState } from 'react';
import { WalletConnect } from './components/WalletConnect';
import { LoginScreen } from './components/LoginScreen';
import { ChatWindow } from './components/ChatWindow';
import { ContactList } from './components/ContactList';

function App() {
  const [walletAddress, setWalletAddress] = useState<string>();
  const [selectedContact, setSelectedContact] = useState<string>();

  if (!walletAddress) {
    return (
      <LoginScreen>
        <WalletConnect onConnect={setWalletAddress} />
      </LoginScreen>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="container mx-auto grid grid-cols-4 gap-4 h-screen pb-8">
        <div className="col-span-1">
          <ContactList
            walletAddress={walletAddress}
            onSelectContact={(contact) => setSelectedContact(contact.wallet_address)}
            selectedContact={selectedContact}
          />
        </div>
        <div className="col-span-3">
          <ChatWindow
            walletAddress={walletAddress}
            selectedContact={selectedContact}
            onSelectContact={(contact) => setSelectedContact(contact.wallet_address)}
          />
        </div>
      </div>
    </div>
  );
}

export default App
