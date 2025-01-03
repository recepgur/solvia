import { EventEmitter } from 'events';

interface CallOptions {
  wsUrl: string;
  wallet_address: string;
}

interface PendingOffer extends RTCSessionDescriptionInit {
  call_id: string;
  sender_address: string;
  data: string;
}

export enum CallStatus {
  IDLE = 'idle',
  CALLING = 'calling',
  RINGING = 'ringing',
  CONNECTED = 'connected',
  ENDED = 'ended'
}

export class CallManager extends EventEmitter {
  private ws: WebSocket;
  private peer: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private currentCallId: string | null = null;
  private currentRecipient: string | null = null;
  private status: CallStatus = CallStatus.IDLE;
  private pendingOffer: PendingOffer | null = null;
  // WebSocket URL construction
  private readonly wallet_address: string;

  constructor(options: CallOptions) {
    super();
    this.wallet_address = options.wallet_address;
    this.ws = new WebSocket(`${options.wsUrl}?wallet_address=${options.wallet_address}`);
    this.setupWebSocket();
  }

  private setupWebSocket() {
    this.ws.onmessage = async (event) => {
      const message = JSON.parse(event.data);
      
      if (message.type === 'call_signal') {
        switch (message.signal_type) {
          case 'offer':
            await this.handleOffer(message);
            break;
          case 'answer':
            await this.handleAnswer(message);
            break;
          case 'ice-candidate':
            await this.handleIceCandidate(message);
            break;
          case 'hangup':
            await this.handleHangup();
            break;
        }
      }
    };
  }

  private async setupPeerConnection() {
    const config: RTCConfiguration = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };

    this.peer = new RTCPeerConnection(config);

    this.peer.onicecandidate = (event) => {
      if (event.candidate && this.currentCallId) {
        const message = {
          type: 'ice_candidate',
          call_id: this.currentCallId,
          candidate: event.candidate.toJSON()
        };
        this.ws.send(JSON.stringify(message));
      }
    };

    this.peer.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      this.emit('remoteStream', this.remoteStream);
    };

    // Add local tracks to the connection
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        if (this.peer && this.localStream) {
          this.peer.addTrack(track, this.localStream);
        }
      });
    }
  }

  public async startCall(recipientAddress: string): Promise<void> {
    try {
      this.currentRecipient = recipientAddress;
      
      // Get local media stream
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      this.emit('localStream', this.localStream);

      // Create peer connection
      await this.setupPeerConnection();
      
      // Create and send offer
      const offer = await this.peer!.createOffer();
      await this.peer!.setLocalDescription(offer);

      const response = await fetch('/calls/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_address: recipientAddress })
      });
      
      const call = await response.json();
      this.currentCallId = call.call_id;
      this.status = CallStatus.CALLING;

      const message = {
        type: 'call_signal',
        call_id: this.currentCallId,
        signal_type: 'offer',
        recipient_address: recipientAddress,
        data: offer
      };
      
      this.ws.send(JSON.stringify(message));
      this.emit('statusChange', this.status);
      
    } catch (error) {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      console.error('Error starting call:', error);
      this.emit('error', {
        message: isMobile 
          ? 'Please grant microphone and camera permissions in your mobile settings.' 
          : 'Error accessing media devices. Please check your permissions.',
        originalError: error
      });
    }
  }

  private async handleOffer(message: PendingOffer) {
    try {
      this.currentCallId = message.call_id;
      this.currentRecipient = message.sender_address;
      this.status = CallStatus.RINGING;
      this.pendingOffer = message;
      
      this.emit('statusChange', this.status);
      this.emit('incomingCall', message);

      // Wait for user to accept call
      this.emit('callReceived', {
        callId: message.call_id,
        callerAddress: message.sender_address
      });
    } catch (error) {
      console.error('Error handling offer:', error);
      this.emit('error', error);
    }
  }

  public async acceptCall(callId: string): Promise<void> {
    try {
      if (!this.pendingOffer || this.pendingOffer.call_id !== callId) {
        throw new Error('No pending offer for this call ID');
      }

      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      this.emit('localStream', this.localStream);

      await this.setupPeerConnection();
      
      const offer = JSON.parse(this.pendingOffer.data);
      await this.peer!.setRemoteDescription(new RTCSessionDescription(offer));
      
      const answer = await this.peer!.createAnswer();
      await this.peer!.setLocalDescription(answer);

      const signal = {
        type: 'call_signal',
        call_id: callId,
        signal_type: 'answer',
        recipient_address: this.currentRecipient!,
        data: answer
      };
      
      this.ws.send(JSON.stringify(signal));
      this.status = CallStatus.CONNECTED;
      this.emit('statusChange', this.status);
      
    } catch (error) {
      console.error('Error accepting call:', error);
      this.emit('error', error);
    }
  }

  private async handleAnswer(message: { data: string }) {
    try {
      const answer = JSON.parse(message.data);
      await this.peer!.setRemoteDescription(new RTCSessionDescription(answer));
      this.status = CallStatus.CONNECTED;
      this.emit('statusChange', this.status);
    } catch (error) {
      console.error('Error handling answer:', error);
      this.emit('error', error);
    }
  }

  private async handleIceCandidate(message: { data: { candidate: RTCIceCandidateInit } }) {
    try {
      if (this.peer) {
        await this.peer.addIceCandidate(new RTCIceCandidate(message.data.candidate));
      }
    } catch (error) {
      console.error('Error handling ICE candidate:', error);
      this.emit('error', error);
    }
  }

  private async handleHangup() {
    this.endCall();
  }

  public async endCall(): Promise<void> {
    if (this.currentCallId) {
      try {
        await fetch(`/calls/end/${this.currentCallId}`, {
          method: 'POST'
        });

        const message = {
          type: 'call_signal',
          call_id: this.currentCallId,
          signal_type: 'hangup',
          recipient_address: this.currentRecipient,
          data: {}
        };
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Error ending call:', error);
      }
    }

    // Cleanup
    if (this.peer) {
      this.peer.close();
      this.peer = null;
    }
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    this.currentCallId = null;
    this.status = CallStatus.ENDED;
    this.emit('statusChange', this.status);
  }

  public getStatus(): CallStatus {
    return this.status;
  }

  public dispose(): void {
    this.endCall();
    this.ws.close();
    this.removeAllListeners();
  }
}
