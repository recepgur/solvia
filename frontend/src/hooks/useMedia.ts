import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey } from '@solana/web3.js';
import { uploadToIPFS } from '../services/ipfs';

interface MediaUploadResult {
  hash: string;
  type: string;
}

export function useMedia() {
  const [isUploading, setIsUploading] = useState(false);
  const { publicKey } = useWallet();
  // Multiple RPC endpoints for decentralization
  const RPC_ENDPOINTS = [
    'https://api.mainnet-beta.solana.com',
    'https://solana-api.projectserum.com',
    'https://rpc.ankr.com/solana'
  ];

  const verifySolvioToken = async (): Promise<boolean> => {
    if (!publicKey) return false;

    // Try each RPC endpoint until one succeeds
    for (const endpoint of RPC_ENDPOINTS) {
      try {
        const connection = new Connection(endpoint);
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { mint: new PublicKey('7bsVvXbR3524sgms6zjCF2BN3vHxuLePfb5CrqrPt4MQ') }
        );
        
        // Check if user has any tokens
        return tokenAccounts.value.some(account => 
          Number(account.account.data.parsed.info.tokenAmount.amount) > 0
        );
      } catch (error) {
        console.warn(`Error with RPC endpoint ${endpoint}:`, error);
        continue;
      }
    }
    
    throw new Error('error.token.verification');
  };

  const uploadMedia = async (file: File): Promise<MediaUploadResult | null> => {
    try {
      setIsUploading(true);

      // Verify Solvio token ownership
      const hasSolvioToken = await verifySolvioToken();
      if (!hasSolvioToken) {
        throw new Error('error.token.required');
      }

      // Upload to IPFS and validate hash
      const hash = await uploadToIPFS(file);
      if (!/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(hash)) {
        throw new Error('error.ipfs.invalid');
      }
      return { hash, type: file.type };
    } catch (error) {
      console.error('Error uploading media:', error);
      if (!publicKey) {
        throw new Error('error.wallet.not.connected');
      }
      throw error;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadMedia,
    isUploading,
  };
}
