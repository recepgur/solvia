import { Connection, PublicKey, Transaction, Keypair, sendAndConfirmTransaction } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID, createTransferInstruction, getOrCreateAssociatedTokenAccount } from "@solana/spl-token";

// Initialize connection to Solana network
export const getConnection = () => {
  // Using devnet for development and testing
  return new Connection("https://api.devnet.solana.com", "confirmed");
};

// Get token balance for a specific wallet
export async function getSolvioBalance(walletPubkey: string, mintAddress: string): Promise<number> {
  try {
    const connection = getConnection();
    const publicKey = new PublicKey(walletPubkey);
    // Get all token accounts for this wallet
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, {
      programId: TOKEN_PROGRAM_ID,
    });

    // Find the token account for Solvio token
    const tokenAccount = tokenAccounts.value.find(
      (account) => account.account.data.parsed.info.mint === mintAddress
    );

    if (!tokenAccount) {
      return 0;
    }

    return Number(tokenAccount.account.data.parsed.info.tokenAmount.amount) / 
           Math.pow(10, tokenAccount.account.data.parsed.info.tokenAmount.decimals);
  } catch (error) {
    console.error("Error getting token balance:", error);
    throw error;
  }
}

// Send Solvio tokens
export async function sendSolvioToken(
  senderKeypair: Keypair,
  recipientAddress: string,
  amount: number,
  mintAddress: string
): Promise<string> {
  try {
    const connection = getConnection();
    const recipientPublicKey = new PublicKey(recipientAddress);
    const mintPublicKey = new PublicKey(mintAddress);

    // Get or create associated token accounts for sender and recipient
    const senderATA = await getOrCreateAssociatedTokenAccount(
      connection,
      senderKeypair,
      mintPublicKey,
      senderKeypair.publicKey
    );

    const recipientATA = await getOrCreateAssociatedTokenAccount(
      connection,
      senderKeypair,
      mintPublicKey,
      recipientPublicKey
    );

    // Create transfer instruction
    const transferInstruction = createTransferInstruction(
      senderATA.address,
      recipientATA.address,
      senderKeypair.publicKey,
      BigInt(Math.floor(amount * Math.pow(10, 9))) // Using default 9 decimals for SPL tokens
    );

    // Create and send transaction
    const transaction = new Transaction().add(transferInstruction);
    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [senderKeypair]
    );

    return signature;
  } catch (error) {
    console.error("Error sending tokens:", error);
    throw error;
  }
}

// Create a new wallet
export function createWallet(): Keypair {
  return Keypair.generate();
}

// Get wallet public key as string
export function getPublicKey(keypair: Keypair): string {
  return keypair.publicKey.toString();
}

// Helper function to validate Solana address
export function isValidSolanaAddress(address: string): boolean {
  try {
    new PublicKey(address);
    return true;
  } catch {
    return false;
  }
}
