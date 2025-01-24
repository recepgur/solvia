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
      // Check if we're in a web environment
      if (typeof window === 'undefined') {
        throw new Error('Wallet connection is only available in web environment');
      }

      // @ts-ignore
      const provider = window.phantom?.solana;
      
      if (!provider) {
        throw new Error(
          'Phantom wallet not found. Please install Phantom wallet from https://phantom.app'
        );
      }

      if (!provider.isPhantom) {
        throw new Error('Invalid wallet provider. Please use Phantom wallet');
      }

      try {
        const response = await provider.connect();
        const publicKey = response.publicKey.toString();
        
        // @ts-ignore
        this.provider = new AnchorProvider(
          this.connection,
          provider,
          { commitment: 'confirmed' }
        );

        return publicKey;
      } catch (connectionError: any) {
        // Handle specific connection errors
        if (connectionError.code === 4001) {
          throw new Error('Wallet connection rejected by user');
        } else if (connectionError.code === -32002) {
          throw new Error('Wallet connection request already pending');
        } else if (connectionError.message) {
          throw new Error(`Wallet connection failed: ${connectionError.message}`);
        } else {
          throw new Error('Failed to connect to wallet');
        }
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
