import { Buffer } from 'buffer';
import { PublicKey } from '@solana/web3.js';

export interface EncryptedMessage {
  encryptedContent: string;  // Base64 encoded encrypted message
  encryptedKey: string;     // Base64 encoded encrypted AES key
  iv: string;              // Base64 encoded initialization vector
  ephemeralPublicKey: string; // Base64 encoded ephemeral public key
}

// Generate an ephemeral key pair for ECDH
async function generateEphemeralKeyPair(): Promise<CryptoKeyPair> {
  return await crypto.subtle.generateKey(
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    ['deriveKey']
  );
}

// Derive a shared secret using ECDH
async function deriveSharedSecret(
  privateKey: CryptoKey,
  publicKey: CryptoKey
): Promise<CryptoKey> {
  const derivedKey = await crypto.subtle.deriveKey(
    {
      name: 'ECDH',
      public: publicKey
    },
    privateKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    false,
    ['encrypt', 'decrypt']
  );
  return derivedKey;
}

export async function encryptMessage(
  message: string,
  recipientPublicKey: PublicKey
): Promise<EncryptedMessage> {
  // Generate ephemeral key pair for this message
  const ephemeralKeyPair = await generateEphemeralKeyPair();
  
  // Import recipient's public key
  const recipientPubKey = await crypto.subtle.importKey(
    'raw',
    recipientPublicKey.toBytes(),
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    []
  );

  // Derive shared secret
  const sharedSecret = await deriveSharedSecret(
    ephemeralKeyPair.privateKey,
    recipientPubKey
  );

  // Generate random IV
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  // Encode message
  const encoder = new TextEncoder();
  const messageBytes = encoder.encode(message);

  // Encrypt message using shared secret
  const encryptedContent = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    sharedSecret,
    messageBytes
  );

  // Export ephemeral public key
  const exportedEphemeralKey = await crypto.subtle.exportKey(
    'raw',
    ephemeralKeyPair.publicKey
  );

  return {
    encryptedContent: Buffer.from(encryptedContent).toString('base64'),
    encryptedKey: '', // Not needed with ECDH
    iv: Buffer.from(iv).toString('base64'),
    ephemeralPublicKey: Buffer.from(exportedEphemeralKey).toString('base64')
  };
}

export async function decryptMessage(
  encryptedMsg: EncryptedMessage,
  privateKey: Uint8Array
): Promise<string> {
  // Import recipient's private key
  const recipientPrivateKey = await crypto.subtle.importKey(
    'pkcs8',
    privateKey,
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    ['deriveKey']
  );

  // Import ephemeral public key
  const ephemeralPubKey = await crypto.subtle.importKey(
    'raw',
    Buffer.from(encryptedMsg.ephemeralPublicKey, 'base64'),
    {
      name: 'ECDH',
      namedCurve: 'P-256'
    },
    true,
    []
  );

  // Derive shared secret
  const sharedSecret = await deriveSharedSecret(
    recipientPrivateKey,
    ephemeralPubKey
  );

  // Decrypt message
  const decryptedContent = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: Buffer.from(encryptedMsg.iv, 'base64')
    },
    sharedSecret,
    Buffer.from(encryptedMsg.encryptedContent, 'base64')
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedContent);
}
