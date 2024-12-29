import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

const SOLVIO_TOKEN_ADDRESS = '7bsVvXbR3524sgms6zjCF2BN3vHxuLePfb5CrqrPt4MQ';

export function useWalletBalances() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [solBalance, setSolBalance] = useState<number>(0);
  const [solvBalance, setSolvBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchBalances() {
      if (!publicKey || !connection) return;

      setIsLoading(true);
      setError(null);

      try {
        // Fetch SOL balance
        const solBalanceRaw = await connection.getBalance(publicKey);
        setSolBalance(solBalanceRaw / 1e9); // Convert lamports to SOL

        // Fetch SOLV token balance
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
          programId: TOKEN_PROGRAM_ID,
        });

        const solvAccount = tokenAccounts.value.find(
          (account) => account.account.data.parsed.info.mint === SOLVIO_TOKEN_ADDRESS
        );

        if (solvAccount) {
          const balance = solvAccount.account.data.parsed.info.tokenAmount.uiAmount;
          setSolvBalance(balance);
        } else {
          setSolvBalance(0);
        }
      } catch (err) {
        console.error('Error fetching balances:', err);
        setError('Failed to fetch balances');
      } finally {
        setIsLoading(false);
      }
    }

    fetchBalances();
  }, [publicKey, connection]);

  return { solBalance, solvBalance, isLoading, error };
}
