import { Connection, PublicKey, Keypair, SystemProgram, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Program, AnchorProvider, web3 } from '@project-serum/anchor';
import { encryptMessage, decryptMessage } from '@/utils/encryption';

export interface Message {
  sender: string;
  recipient: string;
  content: string;
  timestamp: number;
  signature: string;
}

export class MessagingService {
  private connection: Connection;
  private provider: AnchorProvider;

  constructor(connection: Connection, provider: AnchorProvider) {
    this.connection = connection;
    this.provider = provider;
  }

  async sendMessage(recipientPublicKey: string, content: string): Promise<string> {
    try {
      // Encrypt message content
      const encryptedContent = await encryptMessage(content, recipientPublicKey);

      // Create PDA for message storage
      const [messagePDA] = await PublicKey.findProgramAddress(
        [
          Buffer.from('message'),
          this.provider.publicKey.toBuffer(),
          new PublicKey(recipientPublicKey).toBuffer(),
          Buffer.from(new Date().getTime().toString()),
        ],
        new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || '')
      );

      // Create transaction
      const transaction = new web3.Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: this.provider.publicKey,
          newAccountPubkey: messagePDA,
          space: 1000, // Adjust based on message size requirements
          lamports: LAMPORTS_PER_SOL / 100, // Minimum balance for rent exemption
          programId: new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || ''),
        })
      );

      // Sign and send transaction
      const signature = await this.provider.sendAndConfirm(transaction);

      // Return transaction signature
      return signature;
    } catch (error) {
      console.error('Error sending message:', error);
      throw new Error('Failed to send message');
    }
  }

  async getMessages(publicKey: string): Promise<Message[]> {
    try {
      // Get all message accounts for the user
      const messages = await this.connection.getProgramAccounts(
        new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || ''),
        {
          filters: [
            {
              memcmp: {
                offset: 32, // Adjust based on account data layout
                bytes: publicKey,
              },
            },
          ],
        }
      );

      // Decrypt and format messages
      const formattedMessages: Message[] = await Promise.all(
        messages.map(async ({ account }) => {
          const data = account.data;
          const decryptedContent = await decryptMessage(
            data.slice(97, data.length - 8).toString(), // Adjust slicing based on account data layout
            publicKey
          );

          return {
            sender: new PublicKey(data.slice(0, 32)).toString(),
            recipient: new PublicKey(data.slice(32, 64)).toString(),
            content: decryptedContent,
            timestamp: new Date(data.readBigInt64LE(89)).getTime(),
            signature: data.slice(65, 89).toString('base64'),
          };
        })
      );

      return formattedMessages.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Error fetching messages:', error);
      throw new Error('Failed to fetch messages');
    }
  }

  async subscribeToMessages(
    callback: (message: Message) => void
  ): Promise<number> {
    try {
      // Subscribe to program account changes
      return this.connection.onProgramAccountChange(
        new PublicKey(process.env.NEXT_PUBLIC_PROGRAM_ID || ''),
        (accountInfo) => {
          const { account } = accountInfo;
          const data = account.data;

          // Process new message
          const message: Message = {
            sender: new PublicKey(data.slice(0, 32)).toString(),
            recipient: new PublicKey(data.slice(32, 64)).toString(),
            content: data.slice(97, data.length - 8).toString(),
            timestamp: new Date(data.readBigInt64LE(89)).getTime(),
            signature: data.slice(65, 89).toString('base64'),
          };

          // Invoke callback with new message
          callback(message);
        }
      );
    } catch (error) {
      console.error('Error subscribing to messages:', error);
      throw new Error('Failed to subscribe to messages');
    }
  }
}
