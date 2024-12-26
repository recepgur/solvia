/// <reference types="node" />
import type { Buffer } from 'buffer';
import type { ReadableConstructor, WritableConstructor } from 'stream-browserify';

declare global {
  interface ProcessEnv {
    NODE_ENV: string;
    VITE_MOCK_DATA: string;
    VITE_SOLANA_NETWORK: string;
    [key: string]: string | undefined;
  }

  interface Process {
    env: ProcessEnv;
    stdout?: any;
    stderr?: any;
    stdin?: any;
    argv: string[];
    version: string;
    versions: Record<string, string>;
    platform: string;
    browser: boolean;
    title: string;
    nextTick: (fn: Function) => void;
    cwd: () => string;
    exit: () => void;
    kill: () => void;
    umask: () => number;
    uptime: () => number;
    hrtime: () => [number, number];
    memoryUsage: () => {
      heapTotal: number;
      heapUsed: 0;
      external: number;
      rss: number;
      arrayBuffers: number;
    };
  }

  interface Window {
    Buffer: typeof Buffer;
    global: typeof globalThis;
    stream: {
      Readable: ReadableConstructor;
      Writable: WritableConstructor;
    };
    process: Process;
    solana?: {
      connect: () => Promise<void>;
      disconnect: () => Promise<void>;
      on: (event: string, callback: Function) => void;
      off: (event: string, callback: Function) => void;
    };
    solvioWs?: WebSocket;
    MediaStream: typeof MediaStream;
  }

  var process: Process;
  var Buffer: typeof Buffer;
  var global: typeof globalThis;
}
