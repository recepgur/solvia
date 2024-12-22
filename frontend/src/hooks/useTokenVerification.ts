import { useEffect, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, Transaction, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, createTransferInstruction, getAssociatedTokenAddress } from '@solana/spl-token';

// Environment variable validation
const validateEnvVar = (name: string, value: string | undefined): string => {
  if (!value || value.trim() === '') {
    const error = `Missing or empty environment variable: ${name}`;
    console.error(error);
    throw new Error(error);
  }
  return value.trim();
};

// Initialize and validate required environment variables
const SOLVIO_TOKEN_MINT_ADDRESS = validateEnvVar(
  'VITE_SOLVIO_TOKEN_ADDRESS',
  import.meta.env.VITE_SOLVIO_TOKEN_ADDRESS
);

const FEE_VAULT_ADDRESS = validateEnvVar(
  'VITE_FEE_VAULT',
  import.meta.env.VITE_FEE_VAULT
);

console.log('Environment variables loaded:', {
  SOLVIO_TOKEN_MINT_ADDRESS,
  FEE_VAULT_ADDRESS,
  network: import.meta.env.VITE_SOLANA_NETWORK
});

const FEE_AMOUNT = LAMPORTS_PER_SOL; // 1 SOLV token

const initializeAddresses = () => {
  console.log('=== Starting Address Initialization ===');
  
  // Log all environment variables
  console.log('Environment Variables:', {
    SOLVIO_TOKEN_MINT_ADDRESS,
    FEE_VAULT_ADDRESS,
    NETWORK: import.meta.env.VITE_SOLANA_NETWORK,
    RAW_TOKEN_ADDRESS: import.meta.env.VITE_SOLVIO_TOKEN_ADDRESS,
    RAW_FEE_VAULT: import.meta.env.VITE_FEE_VAULT
  });

  // Enhanced validation of environment variables
  const validateAddress = (address: string | undefined, name: string): string => {
    console.log(`Validating ${name}:`, address);
    
    if (!address) {
      const error = `Missing ${name}`;
      console.error(error);
      throw new Error(error);
    }

    // Check for valid base58 format
    const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!base58Regex.test(address)) {
      const error = `Invalid ${name} format: ${address}`;
      console.error(error);
      throw new Error(error);
    }

    console.log(`${name} format validation passed`);
    return address;
  };

  try {
    console.log('Starting address validation...');
    
    // Validate addresses
    const validatedTokenMint = validateAddress(SOLVIO_TOKEN_MINT_ADDRESS, 'token mint address');
    const validatedFeeVault = validateAddress(FEE_VAULT_ADDRESS, 'fee vault address');

    console.log('Address validation passed, creating PublicKey instances...');

    let tokenMint: PublicKey;
    let feeVault: PublicKey;

    // Create token mint public key
    try {
      console.log('Creating token mint PublicKey from:', validatedTokenMint);
      tokenMint = new PublicKey(validatedTokenMint);
      console.log('Token mint PublicKey created successfully:', tokenMint.toBase58());
    } catch (error) {
      console.error('Failed to create token mint PublicKey:', {
        error,
        address: validatedTokenMint,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });
      throw new Error(`Invalid token mint address: ${validatedTokenMint}`);
    }

    // Create fee vault public key
    try {
      console.log('Creating fee vault PublicKey from:', validatedFeeVault);
      feeVault = new PublicKey(validatedFeeVault);
      console.log('Fee vault PublicKey created successfully:', feeVault.toBase58());
    } catch (error) {
      console.error('Failed to create fee vault PublicKey:', {
        error,
        address: validatedFeeVault,
        errorType: error instanceof Error ? error.constructor.name : typeof error
      });
      throw new Error(`Invalid fee vault address: ${validatedFeeVault}`);
    }

    console.log('=== Address Initialization Complete ===');
    console.log('Final addresses:', {
      tokenMint: tokenMint.toBase58(),
      feeVault: feeVault.toBase58()
    });

    return { tokenMint, feeVault };
  } catch (error) {
    console.error('=== Address Initialization Failed ===');
    console.error('Initialization error details:', {
      error,
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorMessage: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    throw error instanceof Error ? error : new Error(String(error));
  }
};

export function useTokenVerification() {
  const { connection } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const [hasPaid, setHasPaid] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pay the one-time fee
  const payFee = async (): Promise<void> => {
    if (!publicKey || !signTransaction) return;

    try {
      setIsLoading(true);
      const { tokenMint, feeVault } = initializeAddresses();
      const fromAta = await getAssociatedTokenAddress(tokenMint, publicKey);
      const feeVaultAta = await getAssociatedTokenAddress(tokenMint, feeVault, true);

      const transaction = new Transaction().add(
        createTransferInstruction(
          fromAta,
          feeVaultAta,
          publicKey,
          FEE_AMOUNT
        )
      );

      const latestBlockhash = await connection.getLatestBlockhash();
      transaction.recentBlockhash = latestBlockhash.blockhash;
      transaction.feePayer = publicKey;

      const signedTx = await signTransaction(transaction);
      const txId = await connection.sendRawTransaction(signedTx.serialize());
      const confirmation = await connection.confirmTransaction(txId, 'confirmed');
      
      if (confirmation.value.err) {
        throw new Error('Transaction failed to confirm');
      }

      setHasPaid(true);
      setError(null);
    } catch (err) {
      console.error('Error paying fee:', err);
      setError('Failed to pay fee');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const verifyFeePayment = async () => {
      if (!publicKey || !connection) {
        // Don't set hasPaid to false immediately if wallet is not connected
        setIsLoading(false);
        setError(null);
        return;
      }

      const checkFeePayment = async (walletAddress: PublicKey): Promise<boolean> => {
        try {
          const { tokenMint, feeVault } = initializeAddresses();
          const feeVaultAta = await getAssociatedTokenAddress(tokenMint, feeVault, true);
          
          // Check for previous payment by looking at transfer history
          const signatures = await connection.getSignaturesForAddress(feeVaultAta);
          const hasPreviousPayment = signatures.some(sig => sig.signature);
    
          if (hasPreviousPayment) {
            return true;
          }
    
          // If no previous payment, check if wallet has enough tokens
          const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
            walletAddress,
            { programId: TOKEN_PROGRAM_ID }
          );
          
          const solvioAccount = tokenAccounts.value.find(
            account => account.account.data.parsed.info.mint === tokenMint.toString()
          );
    
          if (!solvioAccount) {
            return false;
          }
    
          const balance = Number(solvioAccount.account.data.parsed.info.tokenAmount.amount);
          return balance >= FEE_AMOUNT;
        } catch (err) {
          console.error('Error checking fee payment:', err);
          return false;
        }
      };

      try {
        setIsLoading(true);
        const paid = await checkFeePayment(publicKey);
        // Ensure paid is a boolean
        setHasPaid(paid === true);
        setError(null);
      } catch (err) {
        console.error('Error verifying fee payment:', err);
        setError('Failed to verify fee payment');
        setHasPaid(false);
      } finally {
        setIsLoading(false);
      }
    };

    verifyFeePayment();
  }, [connection, publicKey]);

  return { hasPaid, isLoading, error, payFee };
}
