import { PublicKey } from '@solana/web3.js';

declare global {
  interface Window {
    solana?: {
      publicKey: PublicKey;
      isPhantom?: boolean;
      connect(): Promise<{ publicKey: PublicKey }>;
      disconnect(): Promise<void>;
      signMessage(message: Uint8Array): Promise<{ signature: Uint8Array }>;
      createManager?: (solana: any, endpoints: string[]) => {
        storeData: (publicKey: string, cid: string) => Promise<void>;
      };
    }
  }
}
