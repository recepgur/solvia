import { create } from 'ipfs-http-client';
import { Buffer } from 'buffer';

// Configure IPFS clients with multiple public gateways for decentralization
const IPFS_GATEWAYS = [
  { host: 'ipfs.io', port: 5001, protocol: 'https' },
  { host: 'gateway.ipfs.io', port: 5001, protocol: 'https' },
  { host: 'dweb.link', port: 443, protocol: 'https' }
];

// Create multiple IPFS clients for redundancy
const clients = IPFS_GATEWAYS.map(gateway => create(gateway));

export async function uploadToIPFS(data: any): Promise<string> {
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

export async function getFromIPFS(cid: string): Promise<any> {
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
      return JSON.parse(data);
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
