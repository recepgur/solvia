import { EventEmitter } from 'events';

interface PeerConnection {
  connection: RTCPeerConnection;
  dataChannel: RTCDataChannel | null;
}

interface SignalingMessage {
  type: 'offer' | 'answer' | 'ice-candidate';
  payload: any;
  from: string;
  to: string;
}

class P2PNetwork extends EventEmitter {
  private peerConnections: Map<string, PeerConnection>;
  private localId: string;
  private iceServers: RTCIceServer[];

  constructor() {
    super();
    this.peerConnections = new Map();
    this.localId = crypto.randomUUID();
    this.iceServers = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ];
  }

  async createPeerConnection(remoteId: string): Promise<RTCPeerConnection> {
    const config: RTCConfiguration = {
      iceServers: this.iceServers,
    };

    const connection = new RTCPeerConnection(config);
    const dataChannel = connection.createDataChannel('messageChannel');

    connection.onicecandidate = (event) => {
      if (event.candidate) {
        this.emit('ice-candidate', {
          type: 'ice-candidate',
          payload: event.candidate,
          from: this.localId,
          to: remoteId,
        });
      }
    };

    connection.onconnectionstatechange = () => {
      this.emit('connection-state-change', {
        peerId: remoteId,
        state: connection.connectionState,
      });
    };

    connection.ondatachannel = (event) => {
      const channel = event.channel;
      this.setupDataChannel(channel, remoteId);
    };

    this.setupDataChannel(dataChannel, remoteId);

    this.peerConnections.set(remoteId, { connection, dataChannel });
    return connection;
  }

  private setupDataChannel(channel: RTCDataChannel, remoteId: string) {
    channel.onopen = () => {
      this.emit('channel-open', { peerId: remoteId });
    };

    channel.onclose = () => {
      this.emit('channel-close', { peerId: remoteId });
    };

    channel.onmessage = (event) => {
      this.emit('message', {
        from: remoteId,
        data: JSON.parse(event.data),
      });
    };
  }

  async initiateConnection(remoteId: string): Promise<void> {
    const connection = await this.createPeerConnection(remoteId);
    const offer = await connection.createOffer();
    await connection.setLocalDescription(offer);

    this.emit('offer', {
      type: 'offer',
      payload: offer,
      from: this.localId,
      to: remoteId,
    });
  }

  async handleOffer(message: SignalingMessage): Promise<void> {
    const { from, payload: offer } = message;
    const connection = await this.createPeerConnection(from);
    
    await connection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await connection.createAnswer();
    await connection.setLocalDescription(answer);

    this.emit('answer', {
      type: 'answer',
      payload: answer,
      from: this.localId,
      to: from,
    });
  }

  async handleAnswer(message: SignalingMessage): Promise<void> {
    const { from, payload: answer } = message;
    const peer = this.peerConnections.get(from);
    if (peer) {
      await peer.connection.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }

  async handleIceCandidate(message: SignalingMessage): Promise<void> {
    const { from, payload: candidate } = message;
    const peer = this.peerConnections.get(from);
    if (peer) {
      await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  async sendMessage(peerId: string, data: any): Promise<void> {
    const peer = this.peerConnections.get(peerId);
    if (peer?.dataChannel?.readyState === 'open') {
      peer.dataChannel.send(JSON.stringify(data));
    } else {
      throw new Error('Data channel not ready');
    }
  }

  disconnect(peerId: string): void {
    const peer = this.peerConnections.get(peerId);
    if (peer) {
      peer.dataChannel?.close();
      peer.connection.close();
      this.peerConnections.delete(peerId);
    }
  }

  disconnectAll(): void {
    for (const peerId of this.peerConnections.keys()) {
      this.disconnect(peerId);
    }
  }

  getConnectionState(peerId: string): RTCPeerConnectionState | null {
    return this.peerConnections.get(peerId)?.connection.connectionState || null;
  }

  getPeerId(): string {
    return this.localId;
  }
}

export const p2pNetwork = new P2PNetwork();
