import SimplePeer from 'simple-peer';
import { encryptMessage, decryptMessage } from '@/utils/encryption';

export interface P2PMessage {
  type: 'text' | 'file' | 'call';
  content: string;
  timestamp: number;
  sender: string;
}

export class P2PService {
  private peer: SimplePeer.Instance | null = null;
  private onMessageCallback: ((message: P2PMessage) => void) | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWebRTC();
    }
  }

  private initializeWebRTC() {
    if (!this.peer) {
      this.peer = new SimplePeer({
        initiator: true,
        trickle: false,
      });

      this.peer.on('signal', (data) => {
        // Handle signaling data (e.g., send to the other peer via blockchain)
        console.log('Signal data:', data);
      });

      this.peer.on('data', async (data) => {
        try {
          const decryptedData = await decryptMessage(data.toString());
          const message: P2PMessage = JSON.parse(decryptedData);
          
          if (this.onMessageCallback) {
            this.onMessageCallback(message);
          }
        } catch (error) {
          console.error('Error processing received data:', error);
        }
      });
    }
  }

  async connectToPeer(signalData: string) {
    if (!this.peer) {
      throw new Error('P2P service not initialized');
    }

    try {
      this.peer.signal(signalData);
    } catch (error) {
      console.error('Error connecting to peer:', error);
      throw error;
    }
  }

  async sendMessage(message: P2PMessage) {
    if (!this.peer) {
      throw new Error('P2P service not initialized');
    }

    try {
      const encryptedMessage = await encryptMessage(JSON.stringify(message));
      this.peer.send(encryptedMessage);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  onMessage(callback: (message: P2PMessage) => void) {
    this.onMessageCallback = callback;
  }

  destroy() {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}
