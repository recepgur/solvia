import { create } from 'ipfs-http-client';
import { Buffer } from 'buffer';

class IPFSManager {
  private client;

  constructor() {
    // IPFS node connection (example: local node)
    this.client = create({ url: 'http://localhost:5001/api/v0' });
  }

  async uploadFile(file: Buffer): Promise<string> {
    try {
      const result = await this.client.add(file);
      return result.path;
    } catch (error) {
      console.error('IPFS upload error:', error);
      throw error;
    }
  }

  async downloadFile(cid: string): Promise<Buffer> {
    try {
      const chunks: Uint8Array[] = [];
      for await (const chunk of this.client.cat(cid)) {
        chunks.push(chunk as Uint8Array);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      console.error('IPFS download error:', error);
      throw error;
    }
  }

  async uploadMessage(message: string): Promise<string> {
    try {
      const messageBuffer = Buffer.from(message);
      const result = await this.client.add(messageBuffer);
      return result.path;
    } catch (error) {
      console.error('IPFS message upload error:', error);
      throw error;
    }
  }

  async downloadMessage(cid: string): Promise<string> {
    try {
      const buffer = await this.downloadFile(cid);
      return buffer.toString('utf-8');
    } catch (error) {
      console.error('IPFS message download error:', error);
      throw error;
    }
  }
}

export default IPFSManager;
