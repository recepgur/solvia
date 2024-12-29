import { Wallet } from '@solana/wallet-adapter-react';

declare module '@solana/wallet-adapter-react' {
  interface WalletWithEvents extends Wallet {
    on(event: string, callback: (error: Error) => void): void;
    off(event: string, callback: (error: Error) => void): void;
  }
}
