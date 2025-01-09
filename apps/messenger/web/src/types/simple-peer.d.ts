declare module 'simple-peer' {
  import { EventEmitter } from 'events';

  export interface Instance extends EventEmitter {
    signal(data: any): void;
    destroy(): void;
    on(event: 'signal', cb: (data: SignalData) => void): this;
    on(event: 'connect', cb: () => void): this;
    on(event: 'data', cb: (data: Uint8Array) => void): this;
    on(event: 'stream', cb: (stream: MediaStream) => void): this;
    on(event: 'close', cb: () => void): this;
    on(event: 'error', cb: (err: Error) => void): this;
  }

  export interface SignalData {
    type: string;
    sdp?: string;
    candidate?: RTCIceCandidateInit;
  }

  export interface Options {
    initiator: boolean;
    trickle?: boolean;
    stream?: MediaStream;
    config?: RTCConfiguration;
  }

  export default function SimplePeer(opts?: Options): Instance;
}
