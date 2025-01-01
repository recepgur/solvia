import { openDB, DBSchema, IDBPDatabase } from 'idb';

interface Message {
  id: string;
  content: string;
  sender_address: string;
  recipient_address: string;
  timestamp: string;
  message_type?: 'text' | 'voice';
  media_url?: string;
  status: 'pending' | 'sent' | 'delivered' | 'read';
  offline: boolean;
}

interface MessageDB extends DBSchema {
  messages: {
    key: string;
    value: Message;
    indexes: {
      'by-status': string;
      'by-recipient': string;
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
    
    for (const message of pendingMessages) {
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
          }),
        });

        if (response.ok) {
          // Update message status to sent
          await this.db!.put('messages', {
            ...message,
            status: 'sent',
            offline: false,
          });
        }
      } catch (error) {
        console.error('Failed to sync message:', error);
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
