import {
  RTCPeerConnection,
  RTCSessionDescription,
  mediaDevices,
  MediaStream,
  RTCIceCandidate,
} from 'react-native-webrtc';

// Using event handlers directly from RTCPeerConnection

type RTCPeerConnectionEvents = {
  onicecandidate: (event: { candidate: RTCIceCandidate | null }) => void;
  onaddstream: (event: { stream: MediaStream }) => void;
}

interface PeerConnection {
  pc: RTCPeerConnection;
  remoteStream: MediaStream | null;
}

class WebRTCManager {
  private connections: Map<string, PeerConnection>;
  private localStream: MediaStream | null;

  constructor() {
    this.connections = new Map();
    this.localStream = null;
  }

  async initializeLocalStream(): Promise<MediaStream> {
    try {
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      this.localStream = stream;
      return stream;
    } catch (error) {
      console.error('Media access error:', error);
      throw error;
    }
  }

  async createPeerConnection(remoteUserId: string): Promise<RTCPeerConnection> {
    const configuration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }
      ]
    };

    const pc = new RTCPeerConnection(configuration);
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        // TODO: Send ICE candidate to remote peer via signaling server
        console.log('New ICE candidate:', event.candidate);
      }
    };

    pc.onaddstream = (event) => {
      const connection = this.connections.get(remoteUserId);
      if (connection) {
        connection.remoteStream = event.stream;
        console.log('Remote stream added:', event.stream.id);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log('Signaling state:', pc.signalingState);
    };

    this.connections.set(remoteUserId, { pc, remoteStream: null });
    return pc;
  }

  async createOffer(remoteUserId: string): Promise<RTCSessionDescription> {
    const connection = this.connections.get(remoteUserId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    const offer = await connection.pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: true
    });
    await connection.pc.setLocalDescription(offer);
    return offer;
  }

  async handleAnswer(remoteUserId: string, answer: RTCSessionDescription): Promise<void> {
    const connection = this.connections.get(remoteUserId);
    if (!connection) {
      throw new Error('Connection not found');
    }

    await connection.pc.setRemoteDescription(answer);
  }

  closeConnection(remoteUserId: string): void {
    const connection = this.connections.get(remoteUserId);
    if (connection) {
      connection.pc.close();
      this.connections.delete(remoteUserId);
    }
  }

  cleanup(): void {
    this.connections.forEach((connection, userId) => {
      this.closeConnection(userId);
    });
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
  }
}

export default WebRTCManager;
