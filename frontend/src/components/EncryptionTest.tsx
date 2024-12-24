import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { PublicKey } from '@solana/web3.js';
// Importing from useKeyManagement hook instead of directly from crypto
import { useKeyManagement } from '../hooks/useKeyManagement';
import { EncryptedMessage } from '../utils/crypto';

interface EncryptionTestProps {
  className?: string;
}

const EncryptionTest: React.FC<EncryptionTestProps> = ({ className }) => {
  const [message, setMessage] = useState('');
  const [recipientPublicKey, setRecipientPublicKey] = useState('');
  const [encryptedMessage, setEncryptedMessage] = useState<EncryptedMessage | null>(null);
  const [decryptedMessage, setDecryptedMessage] = useState('');
  const [error, setError] = useState('');
  
  const wallet = useWallet();
  const keyManagement = useKeyManagement();

  const handleEncrypt = async () => {
    try {
      setError('');
      if (!recipientPublicKey) {
        throw new Error('Please enter recipient public key');
      }
      
      const recipientPubKey = new PublicKey(recipientPublicKey);
      const encrypted = await keyManagement.encryptForRecipient(message, recipientPubKey);
      setEncryptedMessage(encrypted);
      
      // Clear for testing
      setDecryptedMessage('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  const handleDecrypt = async () => {
    try {
      setError('');
      if (!encryptedMessage) {
        throw new Error('No encrypted message to decrypt');
      }
      
      const decrypted = await keyManagement.decryptFromSender(encryptedMessage);
      setDecryptedMessage(decrypted);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  return (
    <div className={`p-4 max-w-2xl mx-auto bg-gray-50 min-h-screen ${className || ''}`}>
      <h1 className="text-2xl font-bold mb-6 text-gray-800">End-to-End Encryption Test</h1>
      
      <div className="mb-6 bg-white rounded-lg shadow-md p-6">
        <div className="flex flex-col items-start gap-3">
          <WalletMultiButton className="!bg-[#00a884] hover:!bg-[#017561] !h-12 !rounded-lg !text-base" />
          {wallet.publicKey && (
            <div className="w-full p-3 bg-gray-50 rounded-lg break-all">
              <p className="text-sm font-medium text-gray-600 mb-1">Your Public Key:</p>
              <p className="text-sm font-mono">{wallet.publicKey.toString()}</p>
            </div>
          )}
          {error && (
            <div className="w-full p-3 bg-red-50 rounded-lg">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
          <textarea
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00a884] focus:border-transparent"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Enter message to encrypt"
            rows={4}
            disabled={!wallet.publicKey}
          />
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">Recipient Public Key</label>
          <input
            type="text"
            className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#00a884] focus:border-transparent font-mono text-sm"
            value={recipientPublicKey}
            onChange={(e) => setRecipientPublicKey(e.target.value)}
            placeholder="Enter recipient's public key"
            disabled={!wallet.publicKey}
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleEncrypt}
            disabled={!wallet.publicKey}
            className="flex-1 h-12 bg-[#00a884] text-white rounded-lg hover:bg-[#017561] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Encrypt Message
          </button>
          <button
            onClick={handleDecrypt}
            disabled={!wallet.publicKey}
            className="flex-1 h-12 bg-[#00a884] text-white rounded-lg hover:bg-[#017561] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Decrypt Message
          </button>
        </div>

        {error && (
          <div className="p-2 bg-red-100 border border-red-300 rounded text-red-700">
            {error}
          </div>
        )}

        {encryptedMessage && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Encrypted Message:</h2>
            <pre className="p-2 bg-gray-100 rounded overflow-auto">
              {JSON.stringify(encryptedMessage, null, 2)}
            </pre>
          </div>
        )}

        {decryptedMessage && (
          <div>
            <h2 className="text-lg font-semibold mb-2">Decrypted Message:</h2>
            <pre className="p-2 bg-gray-100 rounded">
              {decryptedMessage}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default EncryptionTest;
