import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';

export class SolanaManager {
  private connection: Connection;
  private wallet: WalletContextState;
  private endpoints: string[];
  private currentEndpointIndex: number;

  constructor(wallet: WalletContextState, endpoints: string[]) {
    this.wallet = wallet;
    this.endpoints = endpoints;
    this.currentEndpointIndex = 0;
    this.connection = new Connection(this.endpoints[0], 'confirmed');
  }

  async rotateEndpoint(): Promise<void> {
    this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.endpoints.length;
    this.connection = new Connection(this.endpoints[this.currentEndpointIndex], 'confirmed');
  }

  async verifyTokenOwnership(tokenAddress: string, requiredBalance: number = 1): Promise<boolean> {
    if (!this.wallet.publicKey) return false;

    try {
      const tokenPublicKey = new PublicKey(tokenAddress);
      const balance = await this.connection.getTokenAccountBalance(tokenPublicKey);
      return Number(balance.value.amount) >= requiredBalance;
    } catch (error) {
      console.error('Error verifying token ownership:', error);
      
      // Try with next endpoint if available
      if (this.currentEndpointIndex < this.endpoints.length - 1) {
        await this.rotateEndpoint();
        return this.verifyTokenOwnership(tokenAddress, requiredBalance);
      }
      
      return false;
    }
  }

  async signMessage(message: string): Promise<Uint8Array | null> {
    if (!this.wallet.signMessage) return null;
    
    try {
      const encodedMessage = new TextEncoder().encode(message);
      return await this.wallet.signMessage(encodedMessage);
    } catch (error) {
      console.error('Error signing message:', error);
      return null;
    }
  }

  async sendTransaction(recipient: string, amount: number): Promise<string | null> {
    if (!this.wallet.publicKey || !this.wallet.signTransaction) return null;

    try {
      const recipientPubKey = new PublicKey(recipient);
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: this.wallet.publicKey,
          toPubkey: recipientPubKey,
          lamports: amount * LAMPORTS_PER_SOL
        })
      );

      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;

      const signed = await this.wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signed.serialize());
      
      return signature;
    } catch (error) {
      console.error('Error sending transaction:', error);
      return null;
    }
  }
}

export const solana = {
  createManager: (wallet: WalletContextState, endpoints: string[]) => new SolanaManager(wallet, endpoints)
};
