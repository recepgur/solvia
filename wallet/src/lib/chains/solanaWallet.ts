import { IChainWallet } from './IChainWallet';
import { Keypair } from '@solana/web3.js';
import { Connection, PublicKey } from '@solana/web3.js';
import { getAssociatedTokenAddress, createAssociatedTokenAccountInstruction, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

const SOLANA_CONNECTION = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');

const solanaWallet: IChainWallet = {
  createWallet: async () => {
    return Keypair.generate();
  },

  getBalance: async (address: string) => {
    const mintAddress = "7bsVvXbR3524sgms6zjCF2BN3vHxuLePfb5CrqrPt4MQ";
    const publicKey = new PublicKey(address);
    const mint = new PublicKey(mintAddress);
    const tokenAccount = await getAssociatedTokenAddress(mint, publicKey);
    
    try {
      const balance = await SOLANA_CONNECTION.getTokenAccountBalance(tokenAccount);
      return Number(balance.value.uiAmount);
    } catch (error) {
      console.error('Error getting balance:', error);
      return 0;
    }
  },

  sendTransaction: async (to: string, amount: number) => {
    throw new Error('Solana transactions not implemented yet');
  },

  validateAddress: (address: string) => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  }
};

export default solanaWallet;
