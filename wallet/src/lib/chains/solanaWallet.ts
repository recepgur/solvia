import { IChainWallet } from './IChainWallet';
import { Keypair, Transaction } from '@solana/web3.js';
import { Connection, PublicKey } from '@solana/web3.js';
import { 
  getAssociatedTokenAddress, 
  createAssociatedTokenAccountInstruction, 
  createTransferInstruction
} from '@solana/spl-token';

const SOLANA_CONNECTION = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

// Default SOLV token mint address
const DEFAULT_TOKEN_MINT = "7bsVvXbR3524sgms6zjCF2BN3vHxuLePfb5CrqrPt4MQ";

class SplError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SplError';
  }
}

class SolanaWallet implements IChainWallet {
  private signer?: Keypair;

  constructor() {
    this.signer = undefined;
  }

  setSigner(signer: Keypair): void {
    this.signer = signer;
  }

  async createWallet(): Promise<{ address: string; privateKey: string }> {
    const keypair = Keypair.generate();
    return {
      address: keypair.publicKey.toString(),
      privateKey: Buffer.from(keypair.secretKey).toString('hex')
    };
  }

  async getBalance(address: string, tokenMint?: string): Promise<number> {
    try {
      const publicKey = new PublicKey(address);
      const mint = new PublicKey(tokenMint || DEFAULT_TOKEN_MINT);
      const tokenAccount = await getAssociatedTokenAddress(mint, publicKey);
      
      try {
        const balance = await SOLANA_CONNECTION.getTokenAccountBalance(tokenAccount);
        return Number(balance.value.uiAmount);
      } catch (error) {
        // If token account doesn't exist, return 0 balance
        if ((error as Error).message?.includes('could not find account')) {
          return 0;
        }
        throw error;
      }
    } catch (error) {
      throw new SplError(`Failed to get token balance: ${(error as Error).message}`);
    }
  }

  async sendTransaction(to: string, amount: number, tokenMint?: string): Promise<string> {
    try {
      if (!this.signer) {
        throw new SplError('No signer available');
      }

      const mint = new PublicKey(tokenMint || DEFAULT_TOKEN_MINT);
      const recipientPubkey = new PublicKey(to);
      
      // Get or create associated token accounts
      const senderATA = await getAssociatedTokenAddress(mint, this.signer.publicKey);
      const recipientATA = await getAssociatedTokenAddress(mint, recipientPubkey);

      // Check if recipient's token account exists
      const recipientAccount = await SOLANA_CONNECTION.getAccountInfo(recipientATA);
      
      // Create transaction
      const transaction = new Transaction();
      
      // If recipient's token account doesn't exist, create it
      if (!recipientAccount) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            this.signer.publicKey,
            recipientATA,
            recipientPubkey,
            mint
          )
        );
      }

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          senderATA,
          recipientATA,
          this.signer.publicKey,
          amount
        )
      );

      // Sign and send transaction
      const signature = await SOLANA_CONNECTION.sendTransaction(transaction, [this.signer]);
      await SOLANA_CONNECTION.confirmTransaction(signature);
      
      return signature;
    } catch (error) {
      throw new SplError(`Failed to send tokens: ${(error as Error).message}`);
    }
  }

  validateAddress(address: string): boolean {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }
}

export default new SolanaWallet();
