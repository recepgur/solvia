import { encryptMessage, decryptMessage } from '../utils/crypto';
import { uploadToIPFS, getFromIPFS } from './ipfs';
import { PublicKey } from '@solana/web3.js';
import { SolanaManager } from '../utils/solana';

export interface Contact {
  walletAddress: string;
  name: string;
  lastSeen?: number;
  publicKey: string;
}

export interface EncryptedContactList {
  contacts: Contact[];
  timestamp: number;
  version: string;
}

/**
 * Store encrypted contact list on IPFS and reference on Solana
 */
export async function storeContactList(contacts: Contact[], publicKey: PublicKey): Promise<string> {
  try {
    const contactList: EncryptedContactList = {
      contacts,
      timestamp: Date.now(),
      version: '1.0.0'
    };
    
    // Encrypt contact list using user's public key
    const encryptedData = await encryptMessage(JSON.stringify(contactList), await window.crypto.subtle.importKey(
      'raw',
      publicKey.toBytes(),
      { name: 'RSA-OAEP', hash: 'SHA-256' },
      true,
      ['encrypt']
    ));
    
    // Upload encrypted data to IPFS and store CID on Solana
    const serializedData = JSON.stringify(encryptedData);
    const cid = await uploadToIPFS(serializedData);
    const solanaManager = new SolanaManager();
    await solanaManager.storeCID(publicKey.toString(), cid);
    
    return cid;
  } catch (error) {
    console.error('Failed to store contact list:', error);
    throw new Error('Failed to store contact list');
  }
}

/**
 * Retrieve and decrypt contact list from IPFS using Solana-stored CID
 */
export async function retrieveContactList(walletAddress: string, privateKey: CryptoKey): Promise<Contact[]> {
  try {
    // Get CID from Solana blockchain
    const solanaManager = new SolanaManager();
    const cid = await solanaManager.getCID(walletAddress);
    if (!cid) return [];
    
    // Get encrypted data from IPFS
    const encryptedData = await getFromIPFS(cid);
    
    // Decrypt data using private key
    const parsedData = JSON.parse(encryptedData.toString());
    const decryptedData = await decryptMessage(parsedData, privateKey);
    const contactList: EncryptedContactList = JSON.parse(decryptedData);
    
    return contactList.contacts;
  } catch (error) {
    console.error('Failed to retrieve contact list:', error);
    return [];
  }
}

/**
 * Update contact list and store new version
 */
export async function updateContactList(
  contacts: Contact[],
  publicKey: PublicKey
): Promise<string> {
  try {
    return await storeContactList(contacts, publicKey);
  } catch (error) {
    console.error('Failed to update contact list:', error);
    throw new Error('Failed to update contact list');
  }
}
