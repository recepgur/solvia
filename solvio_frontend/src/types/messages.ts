export interface Message {
  id: string;
  content: string;
  sender_address: string;
  recipient_address: string;
  timestamp: string;
  message_type?: 'text' | 'voice';
  media_url?: string;
  upload_progress?: number;
  status: 'pending' | 'sent' | 'delivered' | 'read';
  offline: boolean;
}

export interface MessageStore {
  storeMessage(message: Message): Promise<void>;
  updateMessageStatus(id: string, status: Message['status']): Promise<void>;
  getPendingMessages(): Promise<Message[]>;
  getMessagesByRecipient(recipientAddress: string): Promise<Message[]>;
  getAllMessages(): Promise<Message[]>;
}

export interface MessageResponse {
  id: string;
  content: string;
  sender_address: string;
  recipient_address: string;
  timestamp: string;
  message_type: string;
  media_url?: string;
  status: string;
}
