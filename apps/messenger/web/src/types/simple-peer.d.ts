declare module 'simple-peer' {
  import { EventEmitter } from 'events';

  interface SimplePeerData {
    type: string;
    sdp: string;
  }

  interface SimplePeerConfig {
    initiator: boolean;
    trickle?: boolean;
    stream?: MediaStream;
    config?: RTCConfiguration;
  }

  class SimplePeer extends EventEmitter {
    constructor(opts?: SimplePeerConfig);
    signal(data: any): void;
    destroy(): void;
    on(event: 'signal', cb: (data: SimplePeerData) => void): this;
    on(event: 'connect', cb: () => void): this;
    on(event: 'data', cb: (data: Uint8Array) => void): this;
    on(event: 'stream', cb: (stream: MediaStream) => void): this;
    on(event: 'close', cb: () => void): this;
    on(event: 'error', cb: (err: Error) => void): this;
  }

  export = SimplePeer;
}
