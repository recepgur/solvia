import { Buffer } from 'buffer';
import { PublicKey } from '@solana/web3.js';

export interface EncryptedMessage {
  encrypted: string;
  nonce: string;
}

export async function encryptMessage(message: string, recipientPublicKey: PublicKey): Promise<EncryptedMessage> {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  // Generate a random nonce
  const nonce = crypto.getRandomValues(new Uint8Array(12));
  
  // Import recipient's public key
  const publicKeyBuffer = recipientPublicKey.toBytes();
  const importedKey = await crypto.subtle.importKey(
    'raw',
    publicKeyBuffer,
    { name: 'AES-GCM' },
    false,
    ['encrypt']
  );
  
  // Encrypt the message
  const encryptedData = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: nonce
    },
    importedKey,
    data
  );
  
  return {
    encrypted: Buffer.from(encryptedData).toString('base64'),
    nonce: Buffer.from(nonce).toString('base64')
  };
}

export async function decryptMessage(encryptedMsg: EncryptedMessage, privateKey: Uint8Array): Promise<string> {
  // Convert base64 strings back to ArrayBuffer
  const encryptedData = Buffer.from(encryptedMsg.encrypted, 'base64');
  const nonce = Buffer.from(encryptedMsg.nonce, 'base64');
  
  // Import private key
  const importedKey = await crypto.subtle.importKey(
    'raw',
    privateKey,
    { name: 'AES-GCM' },
    false,
    ['decrypt']
  );
  
  // Decrypt the message
  const decryptedData = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: nonce
    },
    importedKey,
    encryptedData
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
}
