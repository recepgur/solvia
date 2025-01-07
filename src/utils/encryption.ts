import { box, randomBytes } from 'tweetnacl';
import { decodeUTF8, encodeUTF8, encodeBase64, decodeBase64 } from 'tweetnacl-util';
import { PublicKey } from '@solana/web3.js';

export interface EncryptedMessage {
  encrypted: Uint8Array;
  nonce: Uint8Array;
}

/**
 * Converts a string to Uint8Array
 */
const stringToUint8Array = (str: string): Uint8Array => {
  return decodeUTF8(str);
};

/**
 * Converts a Uint8Array to string
 */
const uint8ArrayToString = (arr: Uint8Array): string => {
  return encodeUTF8(arr);
};

/**
 * Generates a new keypair for message encryption
 */
export const generateMessageKeypair = () => {
  return box.keyPair();
};

/**
 * Encrypts a message for a recipient
 */
export const encryptMessage = async (
  message: string,
  recipientPublicKeyStr: string
): Promise<string> => {
  try {
    // Convert recipient's public key string to PublicKey object
    const recipientPublicKey = new PublicKey(recipientPublicKeyStr);
    
    // Generate ephemeral keypair for this message
    const ephemeralKeypair = box.keyPair();
    
    // Convert message to Uint8Array
    const messageUint8 = stringToUint8Array(message);
    
    // Generate random nonce
    const nonce = randomBytes(box.nonceLength);
    
    // Encrypt the message
    const encryptedMessage = box(
      messageUint8,
      nonce,
      recipientPublicKey.toBytes(),
      ephemeralKeypair.secretKey
    );
    
    // Combine the encrypted message with the nonce and ephemeral public key
    const fullMessage = new Uint8Array(nonce.length + encryptedMessage.length + ephemeralKeypair.publicKey.length);
    fullMessage.set(nonce);
    fullMessage.set(encryptedMessage, nonce.length);
    fullMessage.set(ephemeralKeypair.publicKey, nonce.length + encryptedMessage.length);
    
    // Encode the full message as base64
    return encodeBase64(fullMessage);
  } catch (error) {
    console.error('Error encrypting message:', error);
    throw new Error('Failed to encrypt message');
  }
};

/**
 * Decrypts a message using the recipient's private key
 */
export const decryptMessage = async (
  encryptedMessageBase64: string,
  recipientSecretKey: Uint8Array
): Promise<string> => {
  try {
    // Decode the full message from base64
    const fullMessage = decodeBase64(encryptedMessageBase64);
    
    // Extract nonce, encrypted message, and sender's public key
    const nonce = fullMessage.slice(0, box.nonceLength);
    const encryptedMessage = fullMessage.slice(
      box.nonceLength,
      fullMessage.length - box.publicKeyLength
    );
    const ephemeralPublicKey = fullMessage.slice(fullMessage.length - box.publicKeyLength);
    
    // Decrypt the message
    const decryptedMessage = box.open(
      encryptedMessage,
      nonce,
      ephemeralPublicKey,
      recipientSecretKey
    );
    
    if (!decryptedMessage) {
      throw new Error('Failed to decrypt message');
    }
    
    // Convert decrypted message to string
    return uint8ArrayToString(decryptedMessage);
  } catch (error) {
    console.error('Error decrypting message:', error);
    throw new Error('Failed to decrypt message');
  }
};

/**
 * Generates a shared secret between two parties
 */
export const generateSharedSecret = (
  publicKey: Uint8Array,
  secretKey: Uint8Array
): Uint8Array => {
  return box.before(publicKey, secretKey);
};

/**
 * Encrypts a message using a pre-computed shared secret
 */
export const encryptMessageWithSharedSecret = (
  message: string,
  sharedSecret: Uint8Array
): { encrypted: string; nonce: string } => {
  const messageUint8 = stringToUint8Array(message);
  const nonce = randomBytes(box.nonceLength);
  const encryptedMessage = box.after(messageUint8, nonce, sharedSecret);
  
  return {
    encrypted: encodeBase64(encryptedMessage),
    nonce: encodeBase64(nonce),
  };
};

/**
 * Decrypts a message using a pre-computed shared secret
 */
export const decryptMessageWithSharedSecret = (
  encryptedMessage: string,
  nonce: string,
  sharedSecret: Uint8Array
): string => {
  const decryptedMessage = box.open.after(
    decodeBase64(encryptedMessage),
    decodeBase64(nonce),
    sharedSecret
  );
  
  if (!decryptedMessage) {
    throw new Error('Failed to decrypt message with shared secret');
  }
  
  return uint8ArrayToString(decryptedMessage);
};
