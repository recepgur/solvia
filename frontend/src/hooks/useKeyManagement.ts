import { useState, useEffect } from 'react';
import { generateKeyPair, exportPublicKey } from '../utils/crypto';
import { useWallet } from '@solana/wallet-adapter-react';
import { Buffer } from 'buffer';

import { CryptoKeys } from '../utils/crypto';

type KeyPair = CryptoKeys;

export function useKeyManagement() {
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);
  const [exportedPublicKey, setExportedPublicKey] = useState<string | null>(null);
  const { publicKey: walletPublicKey } = useWallet();

  useEffect(() => {
    const initializeKeys = async () => {
      // Check if we have keys in localStorage for this wallet
      if (walletPublicKey) {
        const storedKeys = localStorage.getItem(`keys_${walletPublicKey.toString()}`);
        if (!storedKeys) {
          // Generate new key pair
          const newKeyPair = await generateKeyPair();
          const exportedPubKey = await exportPublicKey(newKeyPair.publicKey);
          
          // Store keys securely
          const keysToStore = {
            publicKey: exportedPubKey,
            // Store private key securely - in a real app, consider using a more secure storage
            privateKeyJwk: await window.crypto.subtle.exportKey('jwk', newKeyPair.privateKey)
          };
          localStorage.setItem(`keys_${walletPublicKey.toString()}`, JSON.stringify(keysToStore));
          
          setKeyPair(newKeyPair);
          setExportedPublicKey(exportedPubKey);
        } else {
          // Restore existing keys
          const { publicKey: storedPubKey, privateKeyJwk } = JSON.parse(storedKeys);
          const importedPrivateKey = await window.crypto.subtle.importKey(
            'jwk',
            privateKeyJwk,
            {
              name: 'RSA-OAEP',
              hash: 'SHA-256'
            },
            true,
            ['decrypt']
          );
          const importedPublicKey = await window.crypto.subtle.importKey(
            'spki',
            Buffer.from(storedPubKey, 'base64'),
            {
              name: 'RSA-OAEP',
              hash: 'SHA-256'
            },
            true,
            ['encrypt']
          );
          setKeyPair({
            publicKey: importedPublicKey,
            privateKey: importedPrivateKey
          });
          setExportedPublicKey(storedPubKey);
        }
      }
    };

    initializeKeys().catch(console.error);
  }, [walletPublicKey]);

  return {
    keyPair,
    exportedPublicKey,
    isReady: !!keyPair
  };
}
