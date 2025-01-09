import { useEffect, useRef, useCallback } from 'react';
import SimplePeer from 'simple-peer';
import type { Instance as SimplePeerInstance } from 'simple-peer';
import { io, Socket } from 'socket.io-client';
import { useWallet } from '@solana/wallet-adapter-react';
import { Call, WebRTCSignal } from '@solvia/messenger-shared';

import { EventEmitter } from 'events';

export class WebRTCService extends EventEmitter {
  private socket: Socket;
  private peer: SimplePeerInstance | null = null;
  private stream: MediaStream | null = null;

  private wallet: ReturnType<typeof useWallet>;

  constructor(wallet: ReturnType<typeof useWallet>) {
    super();
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
      try {
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
        this.emit('callStatus', { status: 'ringing', call: data });
      } catch (error) {
        console.error('Error handling incoming call:', error);
        this.emit('error', new Error('Failed to handle incoming call'));
      }
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
      this.emit('remoteStream', stream);
    });

    this.peer.on('connect', () => {
      this.emit('callStatus', { status: 'ongoing' });
    });

    this.peer.on('close', () => {
      this.emit('callStatus', { status: 'ended' });
    });

    this.peer.on('error', (error: Error) => {
      console.error('Peer connection error:', error);
      this.emit('error', error);
    });
  }

  private async getMediaStream(type: 'voice' | 'video'): Promise<MediaStream> {
    const constraints: MediaStreamConstraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true
      },
      video: type === 'video' ? {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        facingMode: 'user',
        frameRate: { ideal: 30 }
      } : false,
    };

    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.emit('localStream', stream);
      return stream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      this.emit('error', new Error('Failed to access media devices'));
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
    this.emit('callStatus', { status: 'ended' });
  }

  public toggleAudio(enabled: boolean): void {
    if (this.stream) {
      this.stream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
      this.emit('audioEnabled', enabled);
    }
  }

  public toggleVideo(enabled: boolean): void {
    if (this.stream) {
      this.stream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
      this.emit('videoEnabled', enabled);
    }
  }

  public cleanup(): void {
    this.endCall();
    this.socket.disconnect();
    this.removeAllListeners();
  }

  public acceptCall(call: Call): void {
    try {
      this.emit('callStatus', { status: 'connecting' });
      this.socket.emit('call:accept', {
        callId: call.id,
        recipient: call.caller.toBase58(),
      });
    } catch (error) {
      console.error('Error accepting call:', error);
      this.emit('error', new Error('Failed to accept call'));
    }
  }

  public rejectCall(call: Call): void {
    try {
      this.socket.emit('call:reject', {
        callId: call.id,
        recipient: call.caller.toBase58(),
      });
      this.emit('callStatus', { status: 'ended' });
    } catch (error) {
      console.error('Error rejecting call:', error);
      this.emit('error', new Error('Failed to reject call'));
    }
  }
}

export const useWebRTC = () => {
  const webRTCRef = useRef<WebRTCService>();
  const wallet = useWallet();

  const initializeWebRTC = useCallback(() => {
    if (webRTCRef.current) {
      webRTCRef.current.cleanup();
    }
    webRTCRef.current = new WebRTCService(wallet);
  }, [wallet]);

  useEffect(() => {
    if (wallet.publicKey) {
      initializeWebRTC();
    }
    return () => {
      if (webRTCRef.current) {
        webRTCRef.current.cleanup();
      }
    };
  }, [wallet.publicKey, initializeWebRTC]);

  return webRTCRef.current;
};
