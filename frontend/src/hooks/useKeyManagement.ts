import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { Buffer } from 'buffer';
import { encryptMessage, decryptMessage, EncryptedMessage } from '../utils/crypto';

export interface KeyPair {
  publicKey: PublicKey;
  privateKey: Uint8Array;
}

export function useKeyManagement() {
  const { publicKey, signMessage } = useWallet();
  const [keyPair, setKeyPair] = useState<KeyPair | null>(null);

  // Generate or retrieve key pair
  const initializeKeyPair = useCallback(async () => {
    if (!publicKey || !signMessage) return;

    try {
      // Check local storage first
      const storedPrivateKey = localStorage.getItem(`encrypted_private_key_${publicKey.toString()}`);
      
      if (storedPrivateKey) {
        // Decrypt stored private key using wallet signature
        const message = new TextEncoder().encode('Decrypt private key');
        const signature = await signMessage(message);
        
        // Use signature to decrypt the stored private key
        const key = await crypto.subtle.importKey(
          'raw',
          signature,
          { name: 'AES-GCM' },
          false,
          ['decrypt']
        );
        
        const decryptedPrivateKey = await crypto.subtle.decrypt(
          {
            name: 'AES-GCM',
            iv: new Uint8Array(12) // Use a constant IV for key storage
          },
          key,
          Buffer.from(storedPrivateKey, 'base64')
        );
        
        const privateKey = new Uint8Array(decryptedPrivateKey);
        
        setKeyPair({
          publicKey,
          privateKey
        });
      } else {
        // Generate new key pair
        const keyPair = await generateKeyPair();
        
        // Encrypt private key using wallet signature
        const message = new TextEncoder().encode('Encrypt private key');
        const signature = await signMessage(message);
        
        // Use signature to encrypt the private key
        const key = await crypto.subtle.importKey(
          'raw',
          signature,
          { name: 'AES-GCM' },
          false,
          ['encrypt']
        );
        
        const encryptedPrivateKey = await crypto.subtle.encrypt(
          {
            name: 'AES-GCM',
            iv: new Uint8Array(12) // Use a constant IV for key storage
          },
          key,
          keyPair.privateKey
        );
        
        // Store encrypted private key
        localStorage.setItem(
          `encrypted_private_key_${publicKey.toString()}`,
          Buffer.from(encryptedPrivateKey).toString('base64')
        );
        
        setKeyPair(keyPair);
      }
    } catch (error) {
      console.error('Failed to initialize key pair:', error);
    }
  }, [publicKey, signMessage]);

  // Generate new key pair
  const generateKeyPair = async (): Promise<KeyPair> => {
    const keyPair = await crypto.subtle.generateKey(
      {
        name: 'ECDH',
        namedCurve: 'P-256',
      },
      true,
      ['deriveKey', 'deriveBits']
    );

    const publicKeyRaw = await crypto.subtle.exportKey('raw', keyPair.publicKey);
    const privateKeyRaw = await crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

    return {
      publicKey: new PublicKey(new Uint8Array(publicKeyRaw)),
      privateKey: new Uint8Array(privateKeyRaw)
    };
  };

  // Encrypt message for recipient
  const encryptForRecipient = useCallback(async (
    message: string,
    recipientPublicKey: PublicKey
  ): Promise<EncryptedMessage> => {
    if (!keyPair) throw new Error('Key pair not initialized');
    return encryptMessage(message, recipientPublicKey);
  }, [keyPair]);

  // Decrypt message from sender
  const decryptFromSender = useCallback(async (
    encryptedMsg: EncryptedMessage
  ): Promise<string> => {
    if (!keyPair) throw new Error('Key pair not initialized');
    return decryptMessage(encryptedMsg, keyPair.privateKey);
  }, [keyPair]);

  useEffect(() => {
    initializeKeyPair();
  }, [initializeKeyPair]);

  return {
    publicKey: keyPair?.publicKey,
    encryptForRecipient,
    decryptFromSender,
    isInitialized: !!keyPair
  };
}
