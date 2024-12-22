import { useState, useCallback } from 'react';
import { uploadToIPFS } from '../services/ipfs';
import { encryptMessage } from '../utils/crypto';
import { solana } from '../utils/solana';
import { useToast } from './use-toast';
import { useWallet } from '@solana/wallet-adapter-react';

interface UseBackupReturn {
  backupMessages: (messages: string[], recipientPublicKey: CryptoKey) => Promise<void>;
  isBackingUp: boolean;
  error: string | null;
}

/**
 * Hook for creating encrypted message backups on IPFS with Solana blockchain integration
 * Maintains complete decentralization by using IPFS for storage and Solana for CID tracking
 */
export function useBackup(): UseBackupReturn {
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const { publicKey } = useWallet();
  
  const backupMessages = useCallback(async (messages: string[], recipientPublicKey: CryptoKey) => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    setIsBackingUp(true);
    setError(null);

    try {
      // Convert messages to a single string for encryption
      const messageData = JSON.stringify(messages);

      // Encrypt the message data
      const encryptedData = await encryptMessage(messageData, recipientPublicKey);

      // Upload encrypted data to IPFS
      const cid = await uploadToIPFS(JSON.stringify(encryptedData));

      // Store CID on Solana blockchain using SolanaManager
      await solana.storeCID(publicKey.toString(), cid);

      toast({
        title: 'Backup Complete',
        description: `Messages backed up successfully. CID: ${cid}`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to backup messages: ${errorMessage}`);
      console.error('Message backup failed:', err);
      
      toast({
        title: 'Backup Failed',
        description: `Failed to backup messages: ${errorMessage}`,
        variant: 'destructive',
      });
    } finally {
      setIsBackingUp(false);
    }
  }, [toast, publicKey]);

  return { backupMessages, isBackingUp, error };
}
