export enum ChainType {
  SOLANA = 'solana',
  ETHEREUM = 'ethereum',
  POLYGON = 'polygon',
  BSC = 'bsc'
}

export enum CrossChainStatus {
  PENDING = 'pending',
  BRIDGING = 'bridging',
  CONFIRMED = 'confirmed',
  FAILED = 'failed'
}

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
  
  // Cross-chain messaging fields
  origin_chain: ChainType;
  destination_chain: ChainType;
  cross_chain_status: CrossChainStatus;
  bridge_tx_hash?: string;
  delivery_confirmed: boolean;
  bridge_fee?: number;
}

export interface MessageStore {
  storeMessage(message: Message): Promise<void>;
  updateMessageStatus(id: string, status: Message['status']): Promise<void>;
  getPendingMessages(): Promise<Message[]>;
  getMessagesByRecipient(recipientAddress: string): Promise<Message[]>;
  getAllMessages(): Promise<Message[]>;
}

export interface Contact {
  wallet_address: string;
  display_name?: string;
  last_seen?: string;
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

export interface Transaction {
  type: string;
  contentHash: string;
  senderProof: string;
  recipientHash: string;
  timestamp: string;
  signature: string;
  status?: 'pending' | 'confirmed' | 'failed';
  chain?: ChainType;
  bridgeId?: string;
}
