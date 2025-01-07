import SimplePeer from 'simple-peer';
import { encryptMessage, decryptMessage } from '../../utils/encryption';

export interface P2PMessage {
  type: 'text' | 'file' | 'call' | 'call-signal';
  content: string;
  timestamp: number;
  sender: string;
}

export interface CallSignal {
  type: 'offer' | 'answer' | 'candidate';
  sdp?: string;
  candidate?: {
    candidate: string;
    sdpMLineIndex: number | null;
    sdpMid: string | null;
    usernameFragment: string | null;
  };
}

interface SignalData {
  type: 'offer' | 'answer' | 'candidate';
  sdp?: string;
  candidate?: RTCIceCandidate;
}

export class WebRTCService {
  private peer: ReturnType<typeof SimplePeer> | null = null;
  private mediaStream: MediaStream | null = null;
  private onMessageCallback: ((message: P2PMessage) => void) | null = null;
  private onStreamCallback: ((stream: MediaStream) => void) | null = null;
  private readonly iceServers: RTCIceServer[] = [{
    urls: ["stun:fr-turn6.xirsys.com"]
  }, {
    username: "Cbwldc6YrWb9FeGEuBcHRsaAFyNhhzUTqvI7NrVM8lB-Zcx4qtWT5M8OC4GQHeUaAAAAAGd8izNyZWNlcA==",
    credential: "71d94a2a-cc9b-11ef-b153-0242ac120004",
    urls: [
      "turn:fr-turn6.xirsys.com:80?transport=udp",
      "turn:fr-turn6.xirsys.com:3478?transport=udp",
      "turn:fr-turn6.xirsys.com:80?transport=tcp",
      "turn:fr-turn6.xirsys.com:3478?transport=tcp",
      "turns:fr-turn6.xirsys.com:443?transport=tcp",
      "turns:fr-turn6.xirsys.com:5349?transport=tcp"
    ]
  }];

  constructor() {
    if (typeof window !== 'undefined') {
      this.initializeWebRTC();
    }

    if (typeof window !== 'undefined') {
      this.initializeWebRTC();
    }
  }

  private initializeWebRTC() {
    if (!this.peer) {
      this.peer = SimplePeer({
        initiator: true,
        trickle: true,
        config: {
          iceServers: this.iceServers
        }
      });

      if (this.peer) {
        this.peer.on('signal', (data) => {
        const signal: CallSignal = {
          type: data.type as 'offer' | 'answer',
          sdp: data.sdp,
          candidate: data.candidate as globalThis.RTCIceCandidate
        };

        const message: P2PMessage = {
          type: 'call-signal',
          content: JSON.stringify(signal),
          timestamp: Date.now(),
          sender: 'local'
        };

        this.sendMessage(message);
      });

        this.peer.on('stream', (stream: globalThis.MediaStream) => {
        if (this.onStreamCallback) {
          this.onStreamCallback(stream);
        }
      });

        this.peer.on('data', async (data) => {
        try {
          const decryptedData = await decryptMessage(data.toString());
          const message: P2PMessage = JSON.parse(decryptedData);
          
          if (message.type === 'call-signal') {
            const signal: CallSignal = JSON.parse(message.content);
            this.handleCallSignal(signal);
          } else if (this.onMessageCallback) {
            this.onMessageCallback(message);
          }
        } catch (error) {
          console.error('Error processing received data:', error);
        }
      });
    }
  }

  private handleCallSignal(signal: CallSignal): void {
    if (!this.peer) return;

    try {
      if (signal.type === 'offer' || signal.type === 'answer') {
        this.peer.signal({ 
          type: signal.type, 
          sdp: signal.sdp 
        });
      } else if (signal.type === 'candidate' && signal.candidate) {
        const candidate = new RTCIceCandidate({
          candidate: signal.candidate.candidate,
          sdpMLineIndex: signal.candidate.sdpMLineIndex,
          sdpMid: signal.candidate.sdpMid,
          usernameFragment: signal.candidate.usernameFragment
        });
        this.peer.signal({ 
          type: 'candidate',
          candidate
        });
      }
    } catch (error) {
      console.error('Error handling call signal:', error);
    }
  }

  public async startCall(video = true): Promise<MediaStream> {
    try {
      if (typeof globalThis?.navigator === 'undefined' || !globalThis.navigator.mediaDevices) {
        throw new Error('MediaDevices API not available');
      }

      const constraints: globalThis.MediaStreamConstraints = {
        audio: true,
        video: video ? {
          width: { ideal: 1280 },
          height: { ideal: 720 }
        } : false
      };

      this.mediaStream = await globalThis.navigator.mediaDevices.getUserMedia(constraints);
      
      if (this.peer && this.mediaStream) {
        this.peer.addStream(this.mediaStream);
      }

      return this.mediaStream;
    } catch (error) {
      console.error('Error starting call:', error);
      return Promise.reject(error);
    }
  }

  public async endCall(): Promise<void> {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach(track => track.stop());
      this.mediaStream = null;
    }
    return Promise.resolve();
  }

  async connectToPeer(signalData: SignalData) {
    if (!this.peer) {
      throw new Error('WebRTC service not initialized');
    }

    try {
      this.peer.signal(signalData);
    } catch (error) {
      console.error('Error connecting to peer:', error);
      return Promise.reject(error);
    }
  }

  public async sendMessage(message: P2PMessage): Promise<void> {
    if (!this.peer) {
      throw new Error('WebRTC service not initialized');
    }

    try {
      const encryptedMessage = await encryptMessage(JSON.stringify(message));
      this.peer.send(encryptedMessage);
      return Promise.resolve();
    } catch (error) {
      console.error('Error sending message:', error);
      return Promise.reject(error);
    }
  }

  public onMessage(callback: (message: P2PMessage) => void): void {
    this.onMessageCallback = callback;
  }

  public onStream(callback: (stream: MediaStream) => void): void {
    this.onStreamCallback = callback;
  }

  public destroy(): void {
    this.endCall();
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }
  }
}
