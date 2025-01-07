/// <reference lib="dom" />

declare module 'simple-peer' {
  interface PeerData {
    type?: 'offer' | 'answer' | 'candidate';
    sdp?: string;
    candidate?: RTCIceCandidate;
  }

  interface PeerOptions {
    initiator?: boolean;
    trickle?: boolean;
    config?: RTCConfiguration;
    stream?: MediaStream;
  }

  interface PeerEvents {
    signal: PeerData;
    connect: void;
    data: Uint8Array;
    stream: MediaStream;
    close: void;
    error: Error;
  }

  interface PeerInstance {
    signal(data: PeerData): void;
    on<E extends keyof PeerEvents>(event: E, callback: (data: PeerEvents[E]) => void): void;
    addStream(stream: MediaStream): void;
    send(data: string): void;
    destroy(): void;
  }

  type SimplePeer = {
    (opts?: PeerOptions): PeerInstance;
    prototype: PeerInstance;
  }

  const peer: SimplePeer;
  export = peer;
}
