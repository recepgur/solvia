/// <reference lib="dom" />

declare module 'simple-peer' {
  namespace SimplePeer {
    interface SignalData {
      type: 'offer' | 'answer' | 'candidate';
      sdp?: string;
      candidate?: {
        candidate: string;
        sdpMLineIndex: number | null;
        sdpMid: string | null;
        usernameFragment: string | null;
      };
    }

    interface Options {
      initiator?: boolean;
      trickle?: boolean;
      config?: RTCConfiguration;
      stream?: MediaStream;
    }

    interface Instance {
      signal(data: SignalData): void;
      on(event: 'signal', callback: (data: SignalData) => void): void;
      on(event: 'connect', callback: () => void): void;
      on(event: 'data', callback: (data: Uint8Array) => void): void;
      on(event: 'stream', callback: (stream: MediaStream) => void): void;
      on(event: 'close', callback: () => void): void;
      on(event: 'error', callback: (err: Error) => void): void;
      addStream(stream: MediaStream): void;
      send(data: string | Uint8Array): void;
      destroy(): void;
    }
  }

  interface SimplePeerConstructor {
    (opts?: SimplePeer.Options): SimplePeer.Instance;
    new (opts?: SimplePeer.Options): SimplePeer.Instance;
  }

  const SimplePeer: SimplePeerConstructor;
  export = SimplePeer;
}
