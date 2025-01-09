import { PublicKey } from '@solana/web3.js';

export interface Message {
  id: string;
  sender: PublicKey;
  recipient: PublicKey;
  content: string;
  timestamp: number;
  type: 'text' | 'voice' | 'video';
}

export interface User {
  publicKey: PublicKey;
  username?: string;
  status: 'online' | 'offline';
  lastSeen: number;
}

export interface Call {
  id: string;
  caller: PublicKey;
  recipient: PublicKey;
  type: 'voice' | 'video';
  status: 'ringing' | 'ongoing' | 'ended';
  startTime?: number;
  endTime?: number;
}

export interface WebRTCSignal {
  type: string;
  sdp?: string;
  candidate?: RTCIceCandidateInit;
}
