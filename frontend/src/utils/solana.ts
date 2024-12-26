import { 
  Connection, 
  PublicKey, 
  SystemProgram, 
  Transaction,
  LAMPORTS_PER_SOL
} from '@solana/web3.js';
import { 
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID 
} from '@solana/spl-token';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { SOLVIO_TOKEN_MINT } from '../config/constants';

/**
 * Get or create an associated token account for the given mint
 */
async function getOrCreateAssociatedTokenAccount(
  connection: Connection,
  payer: PublicKey,
  mint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> {
  const associatedToken = await getAssociatedTokenAddress(
    mint,
    owner,
    false,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID
  );

  try {
    await connection.getAccountInfo(associatedToken);
  } catch (error) {
    // Create the account if it doesn't exist
    const transaction = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        payer,
        associatedToken,
        owner,
        mint,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID
      )
    );

    const blockHash = await connection.getRecentBlockhash();
    transaction.recentBlockhash = blockHash.blockhash;
    transaction.feePayer = payer;

    throw new Error('Please create an associated token account first');
  }

  return associatedToken;
}

/**
 * Transfer SOL to a recipient
 */
export async function transferSOL(
  connection: Connection,
  wallet: WalletContextState,
  recipient: string,
  amount: number
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  try {
    const recipientPubKey = new PublicKey(recipient);
    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: wallet.publicKey,
        toPubkey: recipientPubKey,
        lamports: amount * LAMPORTS_PER_SOL
      })
    );

    const blockHash = await connection.getRecentBlockhash();
    transaction.recentBlockhash = blockHash.blockhash;
    transaction.feePayer = wallet.publicKey;

    const signed = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(signature);

    return signature;
  } catch (error) {
    console.error('Error transferring SOL:', error);
    throw error;
  }
}

/**
 * Transfer SOLV tokens to a recipient
 */
export async function transferSOLV(
  connection: Connection,
  wallet: WalletContextState,
  recipient: string,
  amount: number
): Promise<string> {
  if (!wallet.publicKey || !wallet.signTransaction) {
    throw new Error('Wallet not connected');
  }

  try {
    const recipientPubKey = new PublicKey(recipient);
    const mintPubKey = new PublicKey(SOLVIO_TOKEN_MINT);

    // Get the token accounts
    const sourceTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.publicKey,
      mintPubKey,
      wallet.publicKey
    );

    const destinationTokenAccount = await getOrCreateAssociatedTokenAccount(
      connection,
      wallet.publicKey,
      mintPubKey,
      recipientPubKey
    );

    // Create transfer instruction
    const transaction = new Transaction().add(
      createTransferInstruction(
        sourceTokenAccount,
        destinationTokenAccount,
        wallet.publicKey,
        amount * (10 ** 9), // Assuming 9 decimals for SOLV token
        [],
        TOKEN_PROGRAM_ID
      )
    );

    const blockHash = await connection.getRecentBlockhash();
    transaction.recentBlockhash = blockHash.blockhash;
    transaction.feePayer = wallet.publicKey;

    const signed = await wallet.signTransaction(transaction);
    const signature = await connection.sendRawTransaction(signed.serialize());
    await connection.confirmTransaction(signature);

    return signature;
  } catch (error) {
    console.error('Error transferring SOLV:', error);
    throw error;
  }
}

/**
 * Generic token transfer function that handles both SOL and SOLV transfers
 */
export async function transferToken(
  connection: Connection,
  wallet: WalletContextState,
  recipient: string,
  tokenType: 'SOL' | 'SOLV',
  amount: number
): Promise<string> {
  if (tokenType === 'SOL') {
    return transferSOL(connection, wallet, recipient, amount);
  } else {
    return transferSOLV(connection, wallet, recipient, amount);
  }
}
