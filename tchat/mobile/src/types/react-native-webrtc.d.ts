declare module 'react-native-webrtc' {
  export class MediaStream {
    id: string;
    active: boolean;
    getTracks(): MediaStreamTrack[];
    getAudioTracks(): MediaStreamTrack[];
    getVideoTracks(): MediaStreamTrack[];
    addTrack(track: MediaStreamTrack): void;
    removeTrack(track: MediaStreamTrack): void;
    clone(): MediaStream;
    toURL(): string;
  }

  export interface RTCPeerConnectionEvents {
    onicecandidate: (event: { candidate: RTCIceCandidate | null }) => void;
    onaddstream: (event: { stream: MediaStream }) => void;
    oniceconnectionstatechange: () => void;
    onicegatheringstatechange: () => void;
    onsignalingstatechange: () => void;
  }
  
  export interface RTCConfiguration {
    iceServers?: Array<{
      urls: string | string[];
      username?: string;
      credential?: string;
    }>;
  }

  export interface RTCPeerConnectionEvent {
    type: string;
  }

  export interface RTCPeerConnectionIceEvent extends RTCPeerConnectionEvent {
    type: 'icecandidate';
    candidate: RTCIceCandidate | null;
  }

  export interface RTCPeerConnectionStreamEvent extends RTCPeerConnectionEvent {
    type: 'addstream' | 'removestream';
    stream: MediaStream;
  }

  export interface RTCPeerConnectionStateEvent extends RTCPeerConnectionEvent {
    type: 'iceconnectionstatechange' | 'icegatheringstatechange' | 'signalingstatechange';
  }

  export type RTCPeerConnectionEventMap = {
    'icecandidate': RTCPeerConnectionIceEvent;
    'addstream': RTCPeerConnectionStreamEvent;
    'removestream': RTCPeerConnectionStreamEvent;
    'iceconnectionstatechange': RTCPeerConnectionStateEvent;
    'icegatheringstatechange': RTCPeerConnectionStateEvent;
    'signalingstatechange': RTCPeerConnectionStateEvent;
  }

  export class RTCPeerConnection {
    constructor(configuration?: RTCConfiguration);
    
    // Event handlers
    onicecandidate: ((event: { candidate: RTCIceCandidate | null }) => void) | null;
    onaddstream: ((event: { stream: MediaStream }) => void) | null;
    oniceconnectionstatechange: (() => void) | null;
    onsignalingstatechange: (() => void) | null;

    // Event listener methods
    addEventListener(type: string, listener: EventListener): void;
    removeEventListener(type: string, listener: EventListener): void;

    // Connection state properties
    readonly iceConnectionState: 'new' | 'checking' | 'connected' | 'completed' | 'failed' | 'disconnected' | 'closed';
    readonly iceGatheringState: 'new' | 'gathering' | 'complete';
    readonly signalingState: 'stable' | 'have-local-offer' | 'have-remote-offer' | 'have-local-pranswer' | 'have-remote-pranswer' | 'closed';
    addTrack: (track: MediaStreamTrack, stream: MediaStream) => void;
    addStream: (stream: MediaStream) => void;
    removeStream: (stream: MediaStream) => void;
    createOffer: (options?: RTCOfferOptions) => Promise<RTCSessionDescription>;
    createAnswer: (options?: RTCAnswerOptions) => Promise<RTCSessionDescription>;
    setLocalDescription: (description: RTCSessionDescription) => Promise<void>;
    setRemoteDescription: (description: RTCSessionDescription) => Promise<void>;
    addIceCandidate: (candidate: RTCIceCandidate) => Promise<void>;
    getStats: () => Promise<RTCStatsReport>;
    close: () => void;
  }

  export interface RTCSessionDescription {
    type: 'offer' | 'answer' | 'pranswer' | 'rollback';
    sdp: string;
  }

  export interface RTCIceCandidate {
    candidate: string;
    sdpMLineIndex: number;
    sdpMid: string;
  }

  export interface MediaStreamTrack {
    id: string;
    kind: 'audio' | 'video';
    label: string;
    enabled: boolean;
    muted: boolean;
    readyState: 'live' | 'ended';
    stop(): void;
  }

  export interface RTCOfferOptions {
    iceRestart?: boolean;
    offerToReceiveAudio?: boolean;
    offerToReceiveVideo?: boolean;
  }

  export interface RTCAnswerOptions {
    voiceActivityDetection?: boolean;
  }

  export interface RTCStatsReport {
    [key: string]: any;
  }

  export const mediaDevices: {
    getUserMedia: (constraints: {
      audio?: boolean | MediaTrackConstraints;
      video?: boolean | MediaTrackConstraints;
    }) => Promise<MediaStream>;
  };

  export interface MediaTrackConstraints {
    deviceId?: string;
    groupId?: string;
    autoGainControl?: boolean;
    channelCount?: number;
    echoCancellation?: boolean;
    latency?: number;
    noiseSuppression?: boolean;
    sampleRate?: number;
    sampleSize?: number;
    volume?: number;
    aspectRatio?: number;
    facingMode?: string;
    frameRate?: number;
    height?: number;
    width?: number;
  }

  export interface RTCView extends React.Component<{
    streamURL: string;
    mirror?: boolean;
    objectFit?: 'contain' | 'cover';
    style?: any;
    zOrder?: number;
  }> {}
}

export {};
