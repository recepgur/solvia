import { openDB, DBSchema, IDBPDatabase } from 'idb';
import { Message, CrossChainStatus } from '../types/messages';

interface MessageDB extends DBSchema {
  messages: {
    key: string;
    value: Message;
    indexes: {
      'by-status': string;
      'by-recipient': string;
      'by-chain-status': CrossChainStatus;
    };
  };
}

class MessageStore {
  private db: IDBPDatabase<MessageDB> | null = null;
  private isOnline: boolean = navigator.onLine;

  constructor() {
    this.initDB();
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  private async initDB() {
    this.db = await openDB<MessageDB>('solvio-messages', 1, {
      upgrade(db: IDBPDatabase<MessageDB>) {
        const store = db.createObjectStore('messages', { keyPath: 'id' });
        store.createIndex('by-status', 'status');
        store.createIndex('by-recipient', 'recipient_address');
        store.createIndex('by-chain-status', 'cross_chain_status');
      },
    });
  }

  private handleOnline = async () => {
    this.isOnline = true;
    await this.syncPendingMessages();
  };

  private handleOffline = () => {
    this.isOnline = false;
  };

  async storeMessage(message: Message) {
    if (!this.db) await this.initDB();
    await this.db!.put('messages', {
      ...message,
      offline: !this.isOnline,
      status: this.isOnline ? 'sent' : 'pending'
    });
  }

  async getPendingMessages(): Promise<Message[]> {
    if (!this.db) await this.initDB();
    return this.db!.getAllFromIndex('messages', 'by-status', 'pending');
  }

  async syncPendingMessages() {
    const pendingMessages = await this.getPendingMessages();
    const maxRetries = 3;
    
    for (const message of pendingMessages) {
      let retries = 0;
      while (retries < maxRetries) {
        try {
          const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/messages/send`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              content: message.content,
              recipient_address: message.recipient_address,
              wallet_address: message.sender_address,
              message_type: message.message_type,
              media_url: message.media_url,
              origin_chain: message.origin_chain,
              destination_chain: message.destination_chain,
            }),
          });

          if (response.ok) {
            const result = await response.json();
            // Update message status and cross-chain info
            await this.db!.put('messages', {
              ...message,
              status: 'sent',
              offline: false,
              cross_chain_status: result.cross_chain_status || message.cross_chain_status,
              bridge_tx_hash: result.bridge_tx_hash,
              delivery_confirmed: result.delivery_confirmed || false,
            });
            break; // Success, exit retry loop
          } else {
            throw new Error(`Server responded with ${response.status}`);
          }
        } catch (error) {
          console.error(`Failed to sync message (attempt ${retries + 1}/${maxRetries}):`, error);
          retries++;
          if (retries === maxRetries) {
            // Mark as failed after max retries
            await this.db!.put('messages', {
              ...message,
              status: 'pending',
              offline: true,
              cross_chain_status: CrossChainStatus.FAILED,
            });
          } else {
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
          }
        }
      }
    }
  }

  async updateMessageStatus(messageId: string, status: 'sent' | 'delivered' | 'read') {
    if (!this.db) await this.initDB();
    const message = await this.db!.get('messages', messageId);
    if (message) {
      await this.db!.put('messages', {
        ...message,
        status,
      });
    }
  }

  async getMessagesByRecipient(recipientAddress: string): Promise<Message[]> {
    if (!this.db) await this.initDB();
    return this.db!.getAllFromIndex('messages', 'by-recipient', recipientAddress);
  }

  async getAllMessages(): Promise<Message[]> {
    if (!this.db) await this.initDB();
    return this.db!.getAll('messages');
  }

  async handleMessageExpired(messageId: string) {
    if (!this.db) await this.initDB();
    await this.db!.delete('messages', messageId);
  }
}

export const messageStore = new MessageStore();
