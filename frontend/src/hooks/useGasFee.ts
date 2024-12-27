import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction } from '@solana/web3.js';
import { createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';

const SOLVIO_TOKEN_MINT = new PublicKey('7bsVvXbR3524sgms6zjCF2BN3vHxuLePfb5CrqrPt4MQ');
const FEE_RECIPIENT = new PublicKey('9YYTVNc7VcyEcharU4DMwTE1aydGnBFJJKRCR2fhh5ka');

export default function useGasFee() {
  const { connection } = useConnection();
  const { publicKey, sendTransaction } = useWallet();
  const [hasPaidFee, setHasPaidFee] = useState(false);
  const [isCheckingPayment, setIsCheckingPayment] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Check if wallet has already paid the fee
  useEffect(() => {
    const checkPaymentStatus = async () => {
      if (!publicKey) {
        setHasPaidFee(false);
        setIsCheckingPayment(false);
        return;
      }

      try {
        setIsCheckingPayment(true);
        // Check if user has already paid by looking at transaction history
        const signatures = await connection.getSignaturesForAddress(FEE_RECIPIENT);
        const hasPaid = await Promise.all(
          signatures.map(async (sig) => {
            const tx = await connection.getTransaction(sig.signature);
            return tx?.meta?.preTokenBalances?.some(
              balance => balance.mint === SOLVIO_TOKEN_MINT.toString()
            ) || false;
          })
        ).then(results => results.some(result => result));

        setHasPaidFee(hasPaid);
        setError(null);
      } catch (err) {
        console.error('Error checking payment status:', err);
        setError('Failed to verify payment status');
      } finally {
        setIsCheckingPayment(false);
      }
    };

    checkPaymentStatus();
  }, [connection, publicKey]);

  const payGasFee = async () => {
    if (!publicKey) {
      throw new Error('Wallet not connected');
    }

    try {
      // Get user's token account
      const userTokenAccount = await getAssociatedTokenAddress(
        SOLVIO_TOKEN_MINT,
        publicKey
      );

      // Get fee recipient's token account
      const feeTokenAccount = await getAssociatedTokenAddress(
        SOLVIO_TOKEN_MINT,
        FEE_RECIPIENT
      );

      // Create transfer instruction (1 Solvio token)
      const transferInstruction = createTransferInstruction(
        userTokenAccount,
        feeTokenAccount,
        publicKey,
        1_000_000_000, // 1 token with 9 decimals
        []
      );

      const transaction = new Transaction().add(transferInstruction);
      
      // Send and confirm transaction
      const signature = await sendTransaction(transaction, connection);
      await connection.confirmTransaction(signature, 'confirmed');
      
      setHasPaidFee(true);
      setError(null);
      
      return signature;
    } catch (err) {
      console.error('Error paying gas fee:', err);
      if (err instanceof Error) {
        if (err.message.includes('insufficient')) {
          setError('Insufficient SOLVIO token balance. Please ensure you have at least 1 SOLVIO token.');
        } else {
          setError('Failed to pay gas fee: ' + err.message);
        }
      } else {
        setError('Failed to pay gas fee');
      }
      throw err;
    }
  };

  return {
    hasPaidFee,
    isCheckingPayment,
    error,
    payGasFee
  };
}
