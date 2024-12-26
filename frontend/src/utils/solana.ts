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

  async storeData(key: string, value: string): Promise<void> {
    if (!this.wallet.publicKey || !this.wallet.signTransaction) {
      throw new Error('Wallet not connected');
    }

    try {
      const programId = new PublicKey(process.env.VITE_SOLANA_PROGRAM_ID || '');
      const instruction = {
        keys: [{ pubkey: new PublicKey(key), isSigner: true, isWritable: true }],
        programId,
        data: Buffer.from(value)
      };

      const transaction = new Transaction().add(instruction);
      const { blockhash } = await this.connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = this.wallet.publicKey;

      const signed = await this.wallet.signTransaction(transaction);
      const signature = await this.connection.sendRawTransaction(signed.serialize());
      await this.connection.confirmTransaction(signature);
    } catch (error) {
      console.error('Error storing data:', error);
      await this.rotateEndpoint();
      throw error;
    }
  }

  async retrieveData(key: string): Promise<string | null> {
    try {
      const account = await this.connection.getAccountInfo(new PublicKey(key));
      if (!account) return null;
      return account.data.toString();
    } catch (error) {
      console.error('Error retrieving data:', error);
      await this.rotateEndpoint();
      return null;
    }
  }
}

export const solana = {
  createManager: (wallet: WalletContextState, endpoints: string[]) => new SolanaManager(wallet, endpoints)
};
