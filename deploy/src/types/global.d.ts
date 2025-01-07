/// <reference lib="dom" />

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      publicKey?: { toString(): string };
      connect(): Promise<{ publicKey: string }>;
      disconnect(): Promise<void>;
      on(event: string, callback: () => void): void;
      off(event: string, callback: () => void): void;
    }
  }

  interface MediaTrackConstraints {
    width?: number | { min?: number; max?: number; ideal?: number };
    height?: number | { min?: number; max?: number; ideal?: number };
  }
}

export {};
