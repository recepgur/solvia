import { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import { uploadFile } from '../services/ipfs';

interface MediaUploadResult {
  hash: string;
  type: string;
}

export function useMedia() {
  const [isUploading, setIsUploading] = useState(false);
  const { publicKey } = useWallet();
  // Multiple RPC endpoints for decentralization
  // Support all Solana networks
  const RPC_ENDPOINTS = [
    process.env.VITE_SOLANA_NETWORK || clusterApiUrl('mainnet-beta'),
    clusterApiUrl('devnet'),
    clusterApiUrl('testnet'),
    'https://rpc.ankr.com/solana'
  ];

  const verifySolvioToken = async (): Promise<boolean> => {
    if (!publicKey) {
      console.warn('No wallet connected for token verification');
      return false;
    }

    let lastError: Error | null = null;
    // Try each RPC endpoint until one succeeds
    for (const endpoint of RPC_ENDPOINTS) {
      try {
        console.log(`Attempting token verification with endpoint: ${endpoint}`);
        const connection = new Connection(endpoint);
        
        // Validate mint address
        const mintAddress = '7bsVvXbR3524sgms6zjCF2BN3vHxuLePfb5CrqrPt4MQ';
        let mint: PublicKey;
        try {
          mint = new PublicKey(mintAddress);
        } catch (err) {
          console.error('Invalid mint address:', err);
          throw new Error('error.token.invalid.mint');
        }

        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { mint }
        );
        
        // Check if user has any tokens
        const hasTokens = tokenAccounts.value.some(account => 
          Number(account.account.data.parsed.info.tokenAmount.amount) > 0
        );

        if (hasTokens) {
          console.log('Token verification successful');
          return true;
        }
      } catch (error) {
        console.warn(`Error with RPC endpoint ${endpoint}:`, error);
        lastError = error as Error;
        continue;
      }
    }
    
    if (lastError) {
      console.error('All RPC endpoints failed:', lastError);
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

      // Upload to IPFS using the dedicated file upload function
      const hash = await uploadFile(file);
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
