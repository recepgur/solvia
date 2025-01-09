import { useEffect, useRef } from 'react';
import SimplePeer from 'simple-peer';
import type { Instance as SimplePeerInstance } from 'simple-peer';
import { io, Socket } from 'socket.io-client';
import { useWallet } from '@solana/wallet-adapter-react';
import { Call, WebRTCSignal } from '@solvia/messenger-shared';

export class WebRTCService {
  private socket: Socket;
  private peer: SimplePeerInstance | null = null;
  private stream: MediaStream | null = null;

  private wallet: ReturnType<typeof useWallet>;

  constructor(wallet: ReturnType<typeof useWallet>) {
    this.wallet = wallet;
    this.socket = io(process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000', {
      auth: {
        publicKey: this.wallet.publicKey?.toBase58()
      }
    });
    this.setupSocketListeners();
  }

  private async signMessage(message: string): Promise<string | undefined> {
    if (!this.wallet.signMessage) return undefined;
    
    try {
      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await this.wallet.signMessage(encodedMessage);
      return Buffer.from(signedMessage).toString('base64');
    } catch (error) {
      console.error('Error signing message:', error);
      return undefined;
    }
  }

  private setupSocketListeners() {
    this.socket.on('call:incoming', async (data: { caller: string; type: 'voice' | 'video' }) => {
      // Handle incoming call
      const stream = await this.getMediaStream(data.type);
      this.stream = stream;
      
      this.peer = SimplePeer({
        initiator: false,
        stream,
        trickle: false,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.setupPeerListeners();
    });

    this.socket.on('call:answer', (signal: WebRTCSignal) => {
      if (this.peer) {
        this.peer.signal(signal);
      }
    });

    this.socket.on('call:signal', (signal: WebRTCSignal) => {
      if (this.peer) {
        this.peer.signal(signal);
      }
    });
  }

  private setupPeerListeners() {
    if (!this.peer) return;

    this.peer.on('signal', (data: WebRTCSignal) => {
      this.socket.emit('call:signal', data);
    });

    this.peer.on('stream', (stream: MediaStream) => {
      // Handle remote stream
      const remoteVideo = document.getElementById('remoteVideo') as HTMLVideoElement;
      if (remoteVideo) {
        remoteVideo.srcObject = stream;
      }
    });
  }

  private async getMediaStream(type: 'voice' | 'video'): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: true,
      video: type === 'video',
    };

    try {
      return await navigator.mediaDevices.getUserMedia(constraints);
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  public async startCall(recipient: string, type: 'voice' | 'video'): Promise<void> {
    try {
      if (!this.wallet.publicKey) throw new Error('Wallet not connected');

      const stream = await this.getMediaStream(type);
      this.stream = stream;

      // Sign call request for authentication
      const callRequest = JSON.stringify({
        recipient,
        type,
        timestamp: Date.now()
      });
      const signature = await this.signMessage(callRequest);
      if (!signature) throw new Error('Failed to sign call request');

      this.peer = SimplePeer({
        initiator: true,
        stream,
        trickle: false,
        config: {
          iceServers: [
            { urls: 'stun:stun.l.google.com:19302' },
            { urls: 'stun:global.stun.twilio.com:3478' }
          ]
        }
      });

      this.setupPeerListeners();

      this.socket.emit('call:start', {
        recipient,
        type,
        signature,
        caller: this.wallet.publicKey.toBase58()
      });
    } catch (error) {
      console.error('Error starting call:', error);
      throw error;
    }
  }

  public endCall(): void {
    if (this.peer) {
      this.peer.destroy();
      this.peer = null;
    }

    if (this.stream) {
      this.stream.getTracks().forEach(track => track.stop());
      this.stream = null;
    }

    this.socket.emit('call:end');
  }

  public toggleAudio(enabled: boolean): void {
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  public toggleVideo(enabled: boolean): void {
    if (this.stream) {
      this.stream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }
}

export const useWebRTC = () => {
  const webRTCRef = useRef<WebRTCService>();
  const wallet = useWallet();

  useEffect(() => {
    if (!webRTCRef.current && wallet.publicKey) {
      webRTCRef.current = new WebRTCService(wallet);
    }
  }, [wallet.publicKey, wallet]);

  return webRTCRef.current;
};
