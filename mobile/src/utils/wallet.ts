import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider } from '@project-serum/anchor';

class WalletManager {
  private connection: Connection;
  private provider: AnchorProvider | null;

  constructor() {
    this.connection = new Connection('https://api.devnet.solana.com', 'confirmed');
    this.provider = null;
  }

  async connectWallet(): Promise<string> {
    try {
      // @ts-ignore
      const provider = window.phantom?.solana;
      
      if (provider?.isPhantom) {
        const response = await provider.connect();
        const publicKey = response.publicKey.toString();
        
        // @ts-ignore
        this.provider = new AnchorProvider(
          this.connection,
          provider,
          { commitment: 'confirmed' }
        );

        return publicKey;
      } else {
        throw new Error('Phantom wallet not found');
      }
    } catch (error) {
      console.error('Wallet connection error:', error);
      throw error;
    }
  }

  async signMessage(message: string): Promise<string> {
    try {
      if (!this.provider?.wallet) {
        throw new Error('Wallet not connected');
      }

      const encodedMessage = new TextEncoder().encode(message);
      const signedMessage = await (this.provider.wallet as any).signMessage(encodedMessage);
      return Buffer.from(signedMessage).toString('base64');
    } catch (error) {
      console.error('Message signing error:', error);
      throw error;
    }
  }

  async sendTransaction(transaction: Transaction): Promise<string> {
    try {
      if (!this.provider) {
        throw new Error('Wallet not connected');
      }

      const signature = await this.provider.sendAndConfirm(transaction);
      return signature;
    } catch (error) {
      console.error('Transaction sending error:', error);
      throw error;
    }
  }

  getProvider(): AnchorProvider {
    if (!this.provider) {
      throw new Error('Wallet not connected');
    }
    return this.provider;
  }

  disconnect(): void {
    this.provider = null;
  }
}

export default WalletManager;
