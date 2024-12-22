import { useState, useCallback } from 'react';
import { getFromIPFS } from '../services/ipfs';
import { decryptFile } from '../utils/crypto';
import { EncryptedData } from '../utils/crypto';
import type { CryptoKey } from '../utils/crypto';

interface UseFileDownloadReturn {
  downloadFile: (cid: string, privateKey: CryptoKey) => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for downloading and decrypting files from IPFS
 * Maintains complete decentralization by using IPFS and client-side decryption
 */
export function useFileDownload(): UseFileDownloadReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadFile = useCallback(async (cid: string, privateKey: CryptoKey) => {
    setIsLoading(true);
    setError(null);
    
    try {
      // Fetch encrypted data from IPFS
      const data = await getFromIPFS(cid);
      const encryptedData = typeof data === 'string' 
        ? JSON.parse(data) as EncryptedData 
        : data as unknown as EncryptedData;
      
      // Decrypt the file
      const decryptedBuffer = await decryptFile(encryptedData, privateKey);
      
      // Create blob and download URL
      const blob = new Blob([decryptedBuffer]);
      const url = URL.createObjectURL(blob);
      
      // Create download link and trigger download
      const a = document.createElement('a');
      a.href = url;
      a.download = `decrypted-${cid.slice(0, 8)}`; // Use first 8 chars of CID as filename
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to download file: ${errorMessage}`);
      console.error('File download failed:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return { downloadFile, isLoading, error };
}
