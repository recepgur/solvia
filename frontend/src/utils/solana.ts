import { Connection, PublicKey, Transaction, SystemProgram } from '@solana/web3.js';
import { Buffer } from 'buffer';

// Ensure complete decentralization by supporting multiple networks
export class SolanaManager {
  private connection: Connection;
  private programId: PublicKey;

  constructor() {
    // Initialize with default endpoint from environment
    const network = import.meta.env.VITE_SOLANA_NETWORK || 'devnet';
    const endpoints = (import.meta.env.VITE_SOLANA_RPC_ENDPOINTS || '').split(',');
    const defaultEndpoint = endpoints[0] || 'https://api.devnet.solana.com';
    
    console.log('Initializing SolanaManager with:', {
      network,
      defaultEndpoint,
      availableEndpoints: endpoints
    });
    
    this.connection = new Connection(defaultEndpoint);
    this.programId = new PublicKey(import.meta.env.VITE_SOLANA_PROGRAM_ID || '');
  }

  /**
   * Store CID on Solana blockchain
   */
  async storeCID(walletAddress: string, cid: string): Promise<void> {
    try {
      const wallet = new PublicKey(walletAddress);
      const cidBuffer = Buffer.from(cid);
      
      // Create PDA for storing CID
      const [cidAccount] = await PublicKey.findProgramAddress(
        [Buffer.from('cid'), wallet.toBuffer()],
        this.programId
      );
      
      // Create transaction
      const transaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: wallet,
          newAccountPubkey: cidAccount,
          space: cidBuffer.length,
          lamports: await this.connection.getMinimumBalanceForRentExemption(cidBuffer.length),
          programId: this.programId
        })
      );
      
      // Send transaction
      await this.connection.sendTransaction(transaction, []);
      
    } catch (error) {
      console.error('Failed to store CID:', error);
      throw new Error('Failed to store CID on Solana');
    }
  }

  /**
   * Get CID from Solana blockchain
   */
  async getCID(walletAddress: string): Promise<string | null> {
    try {
      const wallet = new PublicKey(walletAddress);
      
      // Get PDA for CID
      const [cidAccount] = await PublicKey.findProgramAddress(
        [Buffer.from('cid'), wallet.toBuffer()],
        this.programId
      );
      
      // Get account data
      const accountInfo = await this.connection.getAccountInfo(cidAccount);
      if (!accountInfo?.data) return null;
      
      return Buffer.from(accountInfo.data).toString();
      
    } catch (error) {
      console.error('Failed to get CID:', error);
      return null;
    }
  }

  /**
   * Set RPC endpoint for multi-network support
   */
  setEndpoint(endpoint: string): void {
    this.connection = new Connection(endpoint);
  }
}

// Export a default instance for convenience
// This instance is used across the app to maintain decentralization
export const solana = new SolanaManager();
