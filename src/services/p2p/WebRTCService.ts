import SimplePeer from 'simple-peer';
import { EventEmitter } from 'events';
import { encryptMessageWithSharedSecret, decryptMessageWithSharedSecret, generateSharedSecret } from '@/utils/encryption';

export interface PeerConnection {
  peer: SimplePeer.Instance;
  publicKey: string;
}

export class WebRTCService extends EventEmitter {
  private connections: Map<string, PeerConnection>;
  private localStream: MediaStream | null;
  private keypair: { publicKey: Uint8Array; secretKey: Uint8Array };

  constructor(keypair: { publicKey: Uint8Array; secretKey: Uint8Array }) {
    super();
    this.connections = new Map();
    this.localStream = null;
    this.keypair = keypair;
  }

  /**
   * Initialize media stream for calls
   */
  async initializeMediaStream(video: boolean = true): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video,
        audio: true
      });
      return this.localStream;
    } catch (error) {
      console.error('Failed to get media stream:', error);
      throw new Error('Failed to initialize media stream');
    }
  }

  /**
   * Initialize a peer connection as the caller
   */
  async initiatePeerConnection(recipientPublicKey: string): Promise<string> {
    try {
      const peer = new SimplePeer({
        initiator: true,
        stream: this.localStream || undefined,
        trickle: false,
        config: {
          iceServers: JSON.parse(process.env.NEXT_PUBLIC_ICE_SERVERS || '[]')
        }
      });

      // Generate shared secret for secure signaling
      const sharedSecret = generateSharedSecret(
        new Uint8Array(Buffer.from(recipientPublicKey, 'hex')),
        this.keypair.secretKey
      );

      this.setupPeerEvents(peer, recipientPublicKey, sharedSecret);

      return new Promise((resolve, reject) => {
        peer.on('signal', data => {
          // Encrypt the signaling data
          const { encrypted, nonce } = encryptMessageWithSharedSecret(
            JSON.stringify(data),
            sharedSecret
          );
          resolve(JSON.stringify({ encrypted, nonce }));
        });

        peer.on('error', err => {
          reject(err);
        });
      });
    } catch (error) {
      console.error('Failed to initiate peer connection:', error);
      throw new Error('Failed to initiate call');
    }
  }

  /**
   * Accept an incoming peer connection
   */
  async acceptPeerConnection(
    signalData: string,
    callerPublicKey: string
  ): Promise<string> {
    try {
      const peer = new SimplePeer({
        initiator: false,
        stream: this.localStream || undefined,
        trickle: false,
        config: {
          iceServers: JSON.parse(process.env.NEXT_PUBLIC_ICE_SERVERS || '[]')
        }
      });

      // Generate shared secret for secure signaling
      const sharedSecret = generateSharedSecret(
        new Uint8Array(Buffer.from(callerPublicKey, 'hex')),
        this.keypair.secretKey
      );

      this.setupPeerEvents(peer, callerPublicKey, sharedSecret);

      // Decrypt and process the incoming signal
      const { encrypted, nonce } = JSON.parse(signalData);
      const decryptedSignal = decryptMessageWithSharedSecret(
        encrypted,
        nonce,
        sharedSecret
      );
      peer.signal(JSON.parse(decryptedSignal));

      return new Promise((resolve, reject) => {
        peer.on('signal', data => {
          // Encrypt the response signal
          const { encrypted, nonce } = encryptMessageWithSharedSecret(
            JSON.stringify(data),
            sharedSecret
          );
          resolve(JSON.stringify({ encrypted, nonce }));
        });

        peer.on('error', err => {
          reject(err);
        });
      });
    } catch (error) {
      console.error('Failed to accept peer connection:', error);
      throw new Error('Failed to accept call');
    }
  }

  /**
   * Set up event handlers for a peer connection
   */
  private setupPeerEvents(
    peer: SimplePeer.Instance,
    remotePublicKey: string,
    sharedSecret: Uint8Array
  ): void {
    this.connections.set(remotePublicKey, { peer, publicKey: remotePublicKey });

    peer.on('connect', () => {
      this.emit('peer:connect', remotePublicKey);
    });

    peer.on('close', () => {
      this.connections.delete(remotePublicKey);
      this.emit('peer:close', remotePublicKey);
    });

    peer.on('stream', (stream: MediaStream) => {
      this.emit('peer:stream', { stream, publicKey: remotePublicKey });
    });

    peer.on('data', (data: Uint8Array) => {
      try {
        const { encrypted, nonce } = JSON.parse(data.toString());
        const decryptedMessage = decryptMessageWithSharedSecret(
          encrypted,
          nonce,
          sharedSecret
        );
        this.emit('peer:data', {
          data: decryptedMessage,
          publicKey: remotePublicKey
        });
      } catch (error) {
        console.error('Failed to process peer data:', error);
      }
    });

    peer.on('error', (err: Error) => {
      console.error('Peer connection error:', err);
      this.emit('peer:error', { error: err, publicKey: remotePublicKey });
    });
  }

  /**
   * Send data to a peer
   */
  async sendData(recipientPublicKey: string, data: string): Promise<void> {
    const connection = this.connections.get(recipientPublicKey);
    if (!connection) {
      throw new Error('No connection found for recipient');
    }

    const sharedSecret = generateSharedSecret(
      new Uint8Array(Buffer.from(recipientPublicKey, 'hex')),
      this.keypair.secretKey
    );

    const { encrypted, nonce } = encryptMessageWithSharedSecret(
      data,
      sharedSecret
    );

    connection.peer.send(JSON.stringify({ encrypted, nonce }));
  }

  /**
   * End a specific peer connection
   */
  endConnection(publicKey: string): void {
    const connection = this.connections.get(publicKey);
    if (connection) {
      connection.peer.destroy();
      this.connections.delete(publicKey);
    }
  }

  /**
   * End all peer connections
   */
  endAllConnections(): void {
    this.connections.forEach((connection) => {
      connection.peer.destroy();
    });
    this.connections.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }

  /**
   * Toggle local video
   */
  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return videoTrack.enabled;
      }
    }
    return false;
  }

  /**
   * Toggle local audio
   */
  toggleAudio(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return audioTrack.enabled;
      }
    }
    return false;
  }
}
