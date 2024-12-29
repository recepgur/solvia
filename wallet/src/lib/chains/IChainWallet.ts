import { Keypair } from '@solana/web3.js';

export interface IChainWallet {
  createWallet(): Promise<{ address: string; privateKey?: string; }>;
  getBalance(address: string, tokenMint?: string): Promise<number>;
  sendTransaction(to: string, amount: number, tokenMint?: string): Promise<string>;
  validateAddress(address: string): boolean;
  setSigner?(signer: Keypair): void;
}
