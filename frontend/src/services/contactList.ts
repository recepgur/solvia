import { encryptMessage, decryptMessage } from '../utils/crypto';
import { uploadToIPFS, getFromIPFS } from './ipfs';
import { PublicKey } from '@solana/web3.js';
import { solana } from '../utils/solana';

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
    const encryptedData = await encryptMessage(JSON.stringify(contactList), publicKey);
    
    // Upload encrypted data to IPFS and store CID on Solana
    const serializedData = JSON.stringify(encryptedData);
    const cid = await uploadToIPFS(serializedData);
    const solanaManager = solana.createManager(window.solana, [process.env.VITE_SOLANA_RPC_ENDPOINT || 'https://api.devnet.solana.com']);
    await solanaManager.storeData(publicKey.toString(), cid);
    
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
    const solanaManager = solana.createManager(window.solana, [process.env.VITE_SOLANA_RPC_ENDPOINT || 'https://api.devnet.solana.com']);
    const cid = await solanaManager.retrieveData(walletAddress);
    if (!cid) return [];
    
    // Get encrypted data from IPFS
    const encryptedData = await getFromIPFS<string>(cid);
    
    // Decrypt data using private key
    const parsedData = JSON.parse(encryptedData);
    const decryptedData = await decryptMessage(parsedData, privateKey as any);
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
