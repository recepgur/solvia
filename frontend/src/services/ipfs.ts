import { create } from 'ipfs-http-client';
import { Buffer } from 'buffer';
import { solana } from '../utils/solana';

// Configure IPFS clients with multiple public gateways for decentralization
const IPFS_GATEWAYS = [
  { host: 'ipfs.io', port: 5001, protocol: 'https' },
  { host: 'gateway.ipfs.io', port: 5001, protocol: 'https' },
  { host: 'dweb.link', port: 443, protocol: 'https' }
];

// Create multiple IPFS clients for redundancy
const clients = IPFS_GATEWAYS.map(gateway => create(gateway));

// Note: CID storage on chain is now handled directly by the services that need it

export async function uploadToIPFS(data: string | Record<string, unknown> | Buffer): Promise<string> {
  const cid = await uploadToIPFSRaw(data);
  // Store CID on chain if it's a string (encrypted data)
  if (typeof data === 'string') {
    try {
      await solana.storeCID(data, cid);
    } catch (error) {
      console.error('Failed to store CID on chain:', error);
    }
  }
  return cid;
}

async function uploadToIPFSRaw(data: string | Record<string, unknown> | Buffer): Promise<string> {
  let lastError;
  // Try each IPFS client until one succeeds
  for (const client of clients) {
    try {
      const result = await client.add(
        typeof data === 'string' ? data : JSON.stringify(data)
      );
      return result.path;
    } catch (error) {
      lastError = error;
      console.warn('IPFS upload failed, trying next gateway:', error);
      continue;
    }
  }
  console.error('All IPFS uploads failed:', lastError);
  throw new Error('Failed to upload to IPFS');
}

export async function getFromIPFS(cid: string): Promise<Record<string, unknown> | string> {
  let lastError;
  // Try each IPFS client until one succeeds
  for (const client of clients) {
    try {
      const stream = client.cat(cid);
      const chunks: Uint8Array[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      const data = Buffer.concat(chunks).toString();
      try {
        // Try to parse as JSON first
        return JSON.parse(data);
      } catch {
        // If not JSON, return as string (for encrypted file data)
        return data;
      }
    } catch (error) {
      lastError = error;
      console.warn('IPFS fetch failed, trying next gateway:', error);
      continue;
    }
  }
  console.error('All IPFS fetches failed:', lastError);
  throw new Error('Failed to get from IPFS');
}

export async function uploadFile(file: File): Promise<string> {
  let lastError;
  const buffer = await file.arrayBuffer();
  
  // Try each IPFS client until one succeeds
  for (const client of clients) {
    try {
      const result = await client.add(Buffer.from(buffer));
      return result.path;
    } catch (error) {
      lastError = error;
      console.warn('IPFS file upload failed, trying next gateway:', error);
      continue;
    }
  }
  console.error('All IPFS file uploads failed:', lastError);
  throw new Error('Failed to upload file to IPFS');
}

/**
 * Upload an encrypted file to IPFS using multiple gateway redundancy
 * @param encryptedData Base64 encoded encrypted file data
 * @returns IPFS CID of the uploaded file
 */
export async function uploadEncryptedFile(encryptedData: string): Promise<string> {
  try {
    // Reuse existing uploadToIPFSRaw for redundancy across gateways
    const cid = await uploadToIPFSRaw(encryptedData);
    return cid;
  } catch (error) {
    console.error('Failed to upload encrypted file:', error);
    throw new Error(`Failed to upload encrypted file: ${(error as Error).message}`);
  }
}
