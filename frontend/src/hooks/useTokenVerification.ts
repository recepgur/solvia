import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

const SOLVIO_TOKEN_MINT = new PublicKey('7bsVvXbR3524sgms6zjCF2BN3vHxuLePfb5CrqrPt4MQ');

export function useTokenVerification() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [hasToken, setHasToken] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const checkTokenOwnership = async () => {
      if (!publicKey) {
        setHasToken(false);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        // Get all token accounts for the connected wallet
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: TOKEN_PROGRAM_ID }
        );

        // Check if any account holds Solvio tokens
        const hasSolvioToken = tokenAccounts.value.some(
          account => 
            account.account.data.parsed.info.mint === SOLVIO_TOKEN_MINT.toString() &&
            Number(account.account.data.parsed.info.tokenAmount.amount) > 0
        );

        setHasToken(hasSolvioToken);
        setError(null);
      } catch (err) {
        console.error('Error checking token ownership:', err);
        setError('Failed to verify token ownership');
        setHasToken(false);
      } finally {
        setIsLoading(false);
      }
    };

    checkTokenOwnership();
  }, [connection, publicKey]);

  return { hasToken, isLoading, error };
}
