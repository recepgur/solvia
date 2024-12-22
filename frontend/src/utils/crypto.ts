import { Buffer } from 'buffer';
import * as nacl from 'tweetnacl';
import bs58 from 'bs58';

export interface CryptoKeys {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

// Key generation
export async function generateKeyPair(): Promise<CryptoKeys> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'RSA-OAEP',
      modulusLength: 4096,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: 'SHA-256'
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

// AES key generation for message encryption
async function generateAESKey(): Promise<CryptoKey> {
  return await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256
    },
    true, // extractable
    ['encrypt', 'decrypt']
  );
}

// Convert CryptoKey to exportable format
export async function exportPublicKey(key: CryptoKey): Promise<string> {
  const exported = await window.crypto.subtle.exportKey('spki', key);
  return Buffer.from(exported).toString('base64');
}

export async function importPublicKey(keyStr: string): Promise<CryptoKey> {
  const keyData = Buffer.from(keyStr, 'base64');
  return await window.crypto.subtle.importKey(
    'spki',
    keyData,
    {
      name: 'RSA-OAEP',
      hash: 'SHA-256'
    },
    true,
    ['encrypt']
  );
}

// Message encryption
export interface EncryptedData {
  content: string;
  key: string;
  iv: string;
}

export async function encryptMessage(message: string, recipientPublicKey: CryptoKey): Promise<EncryptedData> {
  try {
    // Generate a one-time AES key for this message
    const aesKey = await generateAESKey();
    
    // Encrypt the message with AES
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedMessage = new TextEncoder().encode(message);
    const encryptedContent = await window.crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv
      },
      aesKey,
      encodedMessage
    );

    // Encrypt the AES key with recipient's public key
    const exportedAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
    const encryptedKey = await window.crypto.subtle.encrypt(
      {
        name: 'RSA-OAEP'
      },
      recipientPublicKey,
      exportedAesKey
    );

    // Return encrypted content, key and IV
    return {
      content: Buffer.from(encryptedContent).toString('base64'),
      key: Buffer.from(encryptedKey).toString('base64'),
      iv: Buffer.from(iv).toString('base64')
    };
  } catch (error) {
    console.error('Message encryption failed:', error);
    throw new Error('Failed to encrypt message: ' + (error as Error).message);
  }
}

// Message decryption
export async function decryptMessage(encryptedData: string, privateKey: CryptoKey): Promise<string> {
  try {
    const { iv, key, content } = JSON.parse(encryptedData) as EncryptedData;

    // Decrypt the AES key
    const encryptedKey = Buffer.from(key, 'base64');
    const aesKeyData = await window.crypto.subtle.decrypt(
      {
        name: 'RSA-OAEP'
      },
      privateKey,
      encryptedKey
    );

    // Import the decrypted AES key
    const aesKey = await window.crypto.subtle.importKey(
      'raw',
      aesKeyData,
      {
        name: 'AES-GCM',
        length: 256
      },
      true,
      ['decrypt']
    );

    // Decrypt the content
    const encryptedContent = Buffer.from(content, 'base64');
    const decrypted = await window.crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: Buffer.from(iv, 'base64')
      },
      aesKey,
      encryptedContent
    );

    return new TextDecoder().decode(decrypted);
  } catch (error) {
    console.error('Message decryption failed:', error);
    throw new Error('Failed to decrypt message: ' + (error as Error).message);
  }
}

// Message signing using wallet (compatible with Solana Ed25519)
export async function signMessage(message: string, wallet: { signMessage: (msg: Uint8Array) => Promise<Uint8Array> }): Promise<string> {
  const encodedMessage = new TextEncoder().encode(message);
  const signature = await wallet.signMessage(encodedMessage);
  return Buffer.from(signature).toString('base64');
}

// Verify message signature using Solana wallet public key
export async function verifySignature(
  message: string,
  signature: string,
  publicKeyBase58: string
): Promise<boolean> {
  try {
    const encodedMessage = new TextEncoder().encode(message);
    const signatureBytes = Buffer.from(signature, 'base64');
    const publicKeyBytes = bs58.decode(publicKeyBase58);
    
    // Use nacl for Ed25519 verification (compatible with Solana)
    return nacl.sign.detached.verify(
      encodedMessage,
      signatureBytes,
      publicKeyBytes
    );
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}

/**
 * Encrypt a file using AES-GCM and RSA-OAEP
 * @param file The file to encrypt
 * @param recipientPublicKey The recipient's public key for encrypting the AES key
 * @returns Encrypted data containing the encrypted file content, encrypted AES key, and IV
 */
export async function encryptFile(file: File, recipientPublicKey: CryptoKey): Promise<EncryptedData> {
  try {
    // Convert to ArrayBuffer
    const fileBuffer = await file.arrayBuffer();
    
    // Reuse generateAESKey() to create a one-time AES key
    const aesKey = await generateAESKey();
    
    // Create IV
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    
    // Encrypt file
    const encryptedData = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      fileBuffer
    );
    
    // Encrypt the AES key using recipient's public key
    const exportedAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
    const encryptedKey = await window.crypto.subtle.encrypt(
      { name: 'RSA-OAEP' },
      recipientPublicKey,
      exportedAesKey
    );
    
    return {
      content: Buffer.from(encryptedData).toString('base64'),
      key: Buffer.from(encryptedKey).toString('base64'),
      iv: Buffer.from(iv).toString('base64')
    };
  } catch (error) {
    console.error('File encryption failed:', error);
    throw new Error(`Failed to encrypt file: ${(error as Error).message}`);
  }
}

/**
 * Decrypt a file using AES-GCM and RSA-OAEP
 * @param encryptedData The encrypted file data containing content, key and IV
 * @param privateKey The recipient's private key for decrypting the AES key
 * @returns Decrypted file as ArrayBuffer
 */
export async function decryptFile(encryptedData: EncryptedData, privateKey: CryptoKey): Promise<ArrayBuffer> {
  try {
    // Decrypt the AES key using private key
    const aesKeyData = await window.crypto.subtle.decrypt(
      { name: 'RSA-OAEP' },
      privateKey,
      Buffer.from(encryptedData.key, 'base64')
    );
    
    // Import the decrypted AES key
    const aesKey = await window.crypto.subtle.importKey(
      'raw',
      aesKeyData,
      { name: 'AES-GCM', length: 256 },
      true,
      ['decrypt']
    );
    
    // Decode IV and encrypted content
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const encryptedContent = Buffer.from(encryptedData.content, 'base64');
    
    // Decrypt the file content
    const decryptedFile = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      aesKey,
      encryptedContent
    );
    
    return decryptedFile;
  } catch (error) {
    console.error('File decryption failed:', error);
    throw new Error(`Failed to decrypt file: ${(error as Error).message}`);
  }
}
